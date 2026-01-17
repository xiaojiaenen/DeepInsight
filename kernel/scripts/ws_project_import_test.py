import asyncio
import json

import websockets


async def main() -> None:
    async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
        await ws.recv()
        await ws.send(
            json.dumps(
                {
                    "type": "exec",
                    "entry": "main.py",
                    "files": [
                        {"path": "main.py", "content": "from utils.math import add\nprint(add(1,2))\n"},
                        {"path": "utils/__init__.py", "content": ""},
                        {"path": "utils/math.py", "content": "def add(a,b):\n    return a+b\n"},
                    ],
                    "timeout_s": 5,
                }
            )
        )

        got_3 = False
        for _ in range(50):
            msg = json.loads(await ws.recv())
            if msg.get("type") == "stdout" and "3" in (msg.get("data") or ""):
                got_3 = True
            if msg.get("type") == "done":
                break

        if not got_3:
            raise SystemExit("project import test failed: missing stdout 3")


if __name__ == "__main__":
    asyncio.run(main())

