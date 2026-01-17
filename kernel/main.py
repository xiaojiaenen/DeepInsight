import asyncio
import json
import sys
from typing import Any, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
app = FastAPI()

@app.get("/")
def read_root():
    return {
        "Status": "DeepInsight Kernel Running",
        "Python": sys.version
    }


async def _ws_send(websocket: WebSocket, payload: Dict[str, Any]) -> None:
    await websocket.send_text(json.dumps(payload, ensure_ascii=False))


async def _read_stream_lines(stream: asyncio.StreamReader, on_line) -> None:
    while True:
        line = await stream.readline()
        if not line:
            break
        await on_line(line.decode(errors="replace"))


async def _execute_python(code: str, timeout_s: float, websocket: WebSocket) -> None:
    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-u",
        "-c",
        code,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    async def send_stdout(line: str) -> None:
        await _ws_send(websocket, {"type": "stdout", "data": line})

    async def send_stderr(line: str) -> None:
        await _ws_send(websocket, {"type": "stderr", "data": line})

    tasks = []
    if proc.stdout is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stdout, send_stdout)))
    if proc.stderr is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stderr, send_stderr)))

    timed_out = False
    try:
        await asyncio.wait_for(proc.wait(), timeout=timeout_s)
    except asyncio.TimeoutError:
        timed_out = True
        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=3)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    await _ws_send(
        websocket,
        {
            "type": "done",
            "exit_code": proc.returncode,
            "timed_out": timed_out,
        },
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await _ws_send(
            websocket,
            {"type": "hello", "python": sys.version, "executable": sys.executable},
        )

        while True:
            data = await websocket.receive_text()
            msg: Optional[Dict[str, Any]] = None
            try:
                msg = json.loads(data)
            except Exception:
                msg = None

            if isinstance(msg, dict):
                msg_type = msg.get("type")
                if msg_type == "exec":
                    code = str(msg.get("code", ""))
                    timeout_s = float(msg.get("timeout_s", 30))
                    await _ws_send(websocket, {"type": "start"})
                    await _execute_python(code=code, timeout_s=timeout_s, websocket=websocket)
                    continue

            await _ws_send(websocket, {"type": "error", "message": "Unsupported message"})
    except WebSocketDisconnect:
        return

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
