import asyncio
import json

import websockets


async def main() -> None:
    async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
        print(await ws.recv())
        await ws.send(
            json.dumps(
                {
                    "type": "exec",
                    "code": "import time\nprint('start')\ntime.sleep(30)\nprint('end')\n",
                    "timeout_s": 60,
                },
                ensure_ascii=False,
            )
        )

        run_id = None
        while True:
            msg = await ws.recv()
            print(msg)
            if '"type": "start"' in msg:
                run_id = json.loads(msg).get("run_id")
                await asyncio.sleep(0.5)
                await ws.send(json.dumps({"type": "cancel", "run_id": run_id}))
            if '"type": "done"' in msg:
                break


if __name__ == "__main__":
    asyncio.run(main())

