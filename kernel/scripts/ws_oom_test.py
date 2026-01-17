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
                    "code": "raise RuntimeError('CUDA out of memory. Tried to allocate 1234 MiB')\n",
                    "timeout_s": 5,
                }
            )
        )

        got_oom = False
        for _ in range(30):
            msg = json.loads(await ws.recv())
            if msg.get("type") == "oom":
                got_oom = True
                break
            if msg.get("type") == "done":
                break

        if not got_oom:
            raise SystemExit("missing oom message")


if __name__ == "__main__":
    asyncio.run(main())

