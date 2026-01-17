from __future__ import annotations

import json
import sys
from typing import Any, Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from .executor import execute_python
from .models import WsClientMessage, WsServerMessage


async def _ws_send(websocket: WebSocket, payload: WsServerMessage) -> None:
    await websocket.send_text(json.dumps(payload, ensure_ascii=False))


async def handle_ws(websocket: WebSocket) -> None:
    await websocket.accept()
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

            if isinstance(msg, dict) and msg.get("type") == "exec":
                code = str(msg.get("code", ""))
                timeout_s = float(msg.get("timeout_s", 30))
                await _ws_send(websocket, {"type": "start"})

                async def on_stdout(line: str) -> None:
                    await _ws_send(websocket, {"type": "stdout", "data": line})

                async def on_stderr(line: str) -> None:
                    await _ws_send(websocket, {"type": "stderr", "data": line})

                exit_code, timed_out = await execute_python(
                    code=code,
                    timeout_s=timeout_s,
                    on_stdout=on_stdout,
                    on_stderr=on_stderr,
                )
                await _ws_send(
                    websocket,
                    {
                        "type": "done",
                        "exit_code": exit_code,
                        "timed_out": timed_out,
                    },
                )
                continue

            await _ws_send(websocket, {"type": "error", "message": "Unsupported message"})
    except WebSocketDisconnect:
        return

