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
                    "code": "import os\nos.system('echo hi')\nprint('after')\n",
                    "timeout_s": 5,
                },
                ensure_ascii=False,
            )
        )

        got_error = False
        got_start = False
        for _ in range(10):
            msg = await ws.recv()
            if '"type": "start"' in msg:
                got_start = True
                break
            if '"type": "error"' in msg and "安全检查未通过" in msg:
                got_error = True
                break

        if got_start:
            raise SystemExit("security check failed: received start")
        if not got_error:
            raise SystemExit("security check failed: missing security error")


if __name__ == "__main__":
    asyncio.run(main())

