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
                    "code": "print('__VIS__ {\"cubeColor\":\"#22c55e\",\"cubeRotation\":[0,1.2,0]}')\nprint('after')\n",
                    "timeout_s": 5,
                },
                ensure_ascii=False,
            )
        )

        got_vis = False
        while True:
            msg = await ws.recv()
            print(msg)
            if '"type": "vis"' in msg:
                got_vis = True
            if '"type": "done"' in msg:
                break
        if not got_vis:
            raise SystemExit("missing vis message")


if __name__ == "__main__":
    asyncio.run(main())

