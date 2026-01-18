from __future__ import annotations

import asyncio
import json
import sys
from typing import Optional
from uuid import UUID, uuid4

from fastapi import WebSocket, WebSocketDisconnect

from .executor import execute_python, execute_python_project, execute_python_workspace
from .models import WsClientMessage, WsServerMessage
from .hw import read_hw_snapshot, get_system_info
from .security import check_code_safety


async def _ws_send(websocket: WebSocket, payload: WsServerMessage) -> None:
    await websocket.send_text(json.dumps(payload, ensure_ascii=False))

def _parse_metric_line(line: str) -> Optional[tuple[str, Any, int]]:
    trimmed = line.strip()
    if not trimmed.startswith("__METRIC__"):
        return None
    raw = trimmed[len("__METRIC__") :].strip()
    if raw.startswith(":"):
        raw = raw[1:].strip()
    if not raw:
        return None
    try:
        obj = json.loads(raw)
    except Exception as e:
        print(f"Failed to parse metric JSON: {e}, raw: {raw}")
        return None
    if not isinstance(obj, dict):
        return None
    name = obj.get("name")
    value = obj.get("value")
    step = obj.get("step", 0)
    if not isinstance(name, str):
        return None
    # 允许任意类型的 value，不仅仅是 float
    try:
        step_i = int(step)
    except Exception:
        step_i = 0
    return (name, value, step_i)

def _is_oom_line(line: str) -> bool:
    low = line.lower()
    return (
        "out of memory" in low
        or "cuda out of memory" in low
        or "cublas_status_alloc_failed" in low
        or "resource exhausted" in low
    )

def _parse_traceback_location(line: str) -> Optional[str]:
    s = line.strip()
    if not s.startswith('File "'):
        return None
    try:
        file_part = s.split('File "', 1)[1]
        path = file_part.split('"', 1)[0]
        rest = s.split("line", 1)[1]
        ln = int(rest.split(",", 1)[0].strip())
        return f"{path}:{ln}"
    except Exception:
        return None

def _oom_suggestions() -> list[str]:
    return [
        "减小 batch size（最常见且立竿见影）",
        "开启混合精度（PyTorch: torch.cuda.amp.autocast + GradScaler）",
        "使用梯度累积（保持等效 batch size）",
        "减少输入分辨率/序列长度/上下文窗口",
        "启用梯度检查点（activation checkpointing）",
        "释放无用张量与缓存（del + torch.cuda.empty_cache；仅缓解碎片）",
        "把大张量/中间结果移到 CPU 或分块计算（chunking）",
    ]

async def handle_ws(websocket: WebSocket) -> None:
    await websocket.accept()

    current_task: asyncio.Task[None] | None = None
    current_run_id: str | None = None
    cancel_event: asyncio.Event | None = None

    hw_task: asyncio.Task[None] | None = None
    try:
        # 1. 发送连接成功消息
        await _ws_send(
            websocket,
            {"type": "hello", "python": sys.version, "executable": sys.executable},
        )

        # 2. 发送详细系统信息 (硬件、环境等)
        try:
            sys_info = get_system_info()
            await _ws_send(websocket, {"type": "system_info", "data": sys_info})
            print(f"System info sent: {sys_info['os']['hostname']}")
        except Exception as e:
            print(f"Failed to get/send system info: {e}")
            import traceback
            traceback.print_exc()

        async def hw_publisher() -> None:
            while True:
                ts_ms, gpus, cpu, err = read_hw_snapshot()
                await _ws_send(
                    websocket,
                    {
                        "type": "hw",
                        "ts_ms": ts_ms,
                        "gpus": [
                            {
                                "index": g.index,
                                "name": g.name,
                                "utilization_gpu": g.utilization_gpu,
                                "memory_used_mb": g.memory_used_mb,
                                "memory_total_mb": g.memory_total_mb,
                                "temperature_c": g.temperature_c,
                            }
                            for g in gpus
                        ],
                        "cpu": {
                            "utilization": cpu.utilization,
                            "temp_c": cpu.temp_c,
                        },
                        "error": err,
                    },
                )
                await asyncio.sleep(1.0)

        hw_task = asyncio.create_task(hw_publisher())

        while True:
            raw = await websocket.receive_text()
            msg: Optional[WsClientMessage] = None
            try:
                msg = json.loads(raw)
            except Exception:
                msg = None

            if isinstance(msg, dict) and msg.get("type") == "cancel":
                run_id = msg.get("run_id")
                if not isinstance(run_id, str):
                    await _ws_send(websocket, {"type": "error", "message": "Missing run_id", "run_id": None})
                    continue
                try:
                    UUID(run_id)
                except Exception:
                    await _ws_send(websocket, {"type": "error", "message": "Invalid run_id", "run_id": None})
                    continue

                if current_run_id != run_id or cancel_event is None:
                    await _ws_send(websocket, {"type": "error", "message": "No running task", "run_id": run_id})
                    continue
                cancel_event.set()
                continue

            if isinstance(msg, dict) and msg.get("type") == "request_system_info":
                try:
                    sys_info = get_system_info()
                    await _ws_send(websocket, {"type": "system_info", "data": sys_info})
                    print(f"System info refreshed: {sys_info['os']['hostname']}")
                except Exception as e:
                    print(f"Failed to refresh system info: {e}")
                continue

            if isinstance(msg, dict) and msg.get("type") == "exec":
                if current_task is not None and not current_task.done():
                    await _ws_send(
                        websocket,
                        {"type": "error", "message": "Kernel is busy", "run_id": current_run_id},
                    )
                    continue

                code = str(msg.get("code", ""))
                timeout_s = float(msg.get("timeout_s", 30))
                files_raw = msg.get("files")
                entry_raw = msg.get("entry")
                workspace_root = msg.get("workspace_root")
                python_exe = msg.get("python_exe")

                # If it's a code-only run, check safety
                if not workspace_root and not files_raw:
                    violations = check_code_safety(code)
                    if violations:
                        head = violations[0]
                        await _ws_send(
                            websocket,
                            {
                                "type": "error",
                                "message": f"安全检查未通过：禁止调用 {head.name} (line {head.lineno})",
                                "run_id": None,
                            },
                        )
                        continue
                
                current_run_id = str(uuid4())
                cancel_event = asyncio.Event()
                run_id = current_run_id

                await _ws_send(websocket, {"type": "start", "run_id": run_id})

                saw_oom = False
                last_tb_location: str | None = None

                async def on_stdout(line: str) -> None:
                    metric = _parse_metric_line(line)
                    if metric is not None:
                        name, value, step = metric
                        await _ws_send(
                            websocket,
                            {"type": "metric", "run_id": run_id, "name": name, "value": value, "step": step},
                        )
                        return
                    await _ws_send(websocket, {"type": "stdout", "data": line, "run_id": run_id})

                async def on_stderr(line: str) -> None:
                    nonlocal saw_oom, last_tb_location
                    loc = _parse_traceback_location(line)
                    if loc:
                        last_tb_location = loc
                    if (not saw_oom) and _is_oom_line(line):
                        saw_oom = True
                        await _ws_send(
                            websocket,
                            {
                                "type": "oom",
                                "run_id": run_id,
                                "message": line.strip(),
                                "likely_location": last_tb_location,
                                "suggestions": _oom_suggestions(),
                            },
                        )
                    await _ws_send(websocket, {"type": "stderr", "data": line, "run_id": run_id})

                async def runner() -> None:
                    nonlocal current_task, current_run_id, cancel_event
                    try:
                        if isinstance(workspace_root, str) and isinstance(entry_raw, str):
                            import os

                            entry_fs = os.path.join(workspace_root, entry_raw.replace("/", os.sep))
                            try:
                                with open(entry_fs, "r", encoding="utf-8") as f:
                                    entry_content = f.read()
                            except Exception:
                                entry_content = ""
                            v = check_code_safety(entry_content)
                            if v:
                                head = v[0]
                                raise ValueError(f"安全检查未通过：禁止调用 {head.name} (line {head.lineno})")

                            exit_code, timed_out, cancelled = await execute_python_workspace(
                                workspace_root=workspace_root,
                                entry=entry_raw,
                                timeout_s=timeout_s,
                                on_stdout=on_stdout,
                                on_stderr=on_stderr,
                                cancel_event=cancel_event,
                                python_exe=python_exe,
                            )
                        elif isinstance(files_raw, list) and isinstance(entry_raw, str):
                            files: list[tuple[str, str]] = []
                            for it in files_raw:
                                if not isinstance(it, dict):
                                    continue
                                p = it.get("path")
                                c = it.get("content")
                                if isinstance(p, str) and isinstance(c, str):
                                    files.append((p, c))
                            if not files:
                                raise ValueError("files is empty")

                            for _, content in files:
                                v = check_code_safety(content)
                                if v:
                                    head = v[0]
                                    raise ValueError(f"安全检查未通过：禁止调用 {head.name} (line {head.lineno})")

                            exit_code, timed_out, cancelled = await execute_python_project(
                                files=files,
                                entry=entry_raw,
                                timeout_s=timeout_s,
                                on_stdout=on_stdout,
                                on_stderr=on_stderr,
                                cancel_event=cancel_event,
                            )
                        else:
                            exit_code, timed_out, cancelled = await execute_python(
                                code=code,
                                timeout_s=timeout_s,
                                on_stdout=on_stdout,
                                on_stderr=on_stderr,
                                cancel_event=cancel_event,
                            )
                        await _ws_send(
                            websocket,
                            {
                                "type": "done",
                                "run_id": run_id,
                                "exit_code": exit_code,
                                "timed_out": timed_out,
                                "cancelled": cancelled,
                            },
                        )
                    except Exception as e:
                        await _ws_send(websocket, {"type": "error", "message": str(e), "run_id": run_id})
                    finally:
                        current_task = None
                        current_run_id = None
                        cancel_event = None

                current_task = asyncio.create_task(runner())
                continue

            await _ws_send(websocket, {"type": "error", "message": "Unsupported message", "run_id": None})
    except WebSocketDisconnect:
        return
    finally:
        if hw_task is not None:
            hw_task.cancel()
