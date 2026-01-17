from __future__ import annotations

import asyncio
import json
import sys
from typing import Optional
from uuid import UUID, uuid4

from fastapi import WebSocket, WebSocketDisconnect

from .executor import execute_python
from .models import WsClientMessage, WsServerMessage


async def _ws_send(websocket: WebSocket, payload: WsServerMessage) -> None:
    await websocket.send_text(json.dumps(payload, ensure_ascii=False))


async def handle_ws(websocket: WebSocket) -> None:
    await websocket.accept()

    current_task: asyncio.Task[None] | None = None
    current_run_id: str | None = None
    cancel_event: asyncio.Event | None = None

    try:
        await _ws_send(
            websocket,
            {"type": "hello", "python": sys.version, "executable": sys.executable},
        )

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

            if isinstance(msg, dict) and msg.get("type") == "exec":
                if current_task is not None and not current_task.done():
                    await _ws_send(
                        websocket,
                        {"type": "error", "message": "Kernel is busy", "run_id": current_run_id},
                    )
                    continue

                code = str(msg.get("code", ""))
                timeout_s = float(msg.get("timeout_s", 30))
                current_run_id = str(uuid4())
                cancel_event = asyncio.Event()
                run_id = current_run_id

                await _ws_send(websocket, {"type": "start", "run_id": run_id})

                async def on_stdout(line: str) -> None:
                    await _ws_send(websocket, {"type": "stdout", "data": line, "run_id": run_id})

                async def on_stderr(line: str) -> None:
                    await _ws_send(websocket, {"type": "stderr", "data": line, "run_id": run_id})

                async def runner() -> None:
                    nonlocal current_task, current_run_id, cancel_event
                    try:
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
                    finally:
                        current_task = None
                        current_run_id = None
                        cancel_event = None

                current_task = asyncio.create_task(runner())
                continue

            await _ws_send(websocket, {"type": "error", "message": "Unsupported message", "run_id": None})
    except WebSocketDisconnect:
        return
