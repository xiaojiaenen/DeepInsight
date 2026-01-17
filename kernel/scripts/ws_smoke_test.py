import asyncio
import json

import websockets


async def main() -> None:
    async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
        hello = await ws.recv()
        print(hello)
        await ws.send(
            json.dumps(
                {
                    "type": "exec",
                    "code": "print('OK')\nimport sys\nprint('ERR', file=sys.stderr)\n",
                    "timeout_s": 5,
                },
                ensure_ascii=False,
            )
        )
        while True:
            msg = await ws.recv()
            print(msg)
            if '"type": "done"' in msg:
                break


if __name__ == "__main__":
    asyncio.run(main())

