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
                    "code": "print('__METRIC__ {\"name\":\"loss\",\"value\":0.42,\"step\":1}')\nprint('after')\n",
                    "timeout_s": 5,
                },
                ensure_ascii=False,
            )
        )

        got_metric = False
        while True:
            msg = await ws.recv()
            if '"type": "metric"' in msg:
                got_metric = True
            if '"type": "done"' in msg:
                break

        if not got_metric:
            raise SystemExit("missing metric message")


if __name__ == "__main__":
    asyncio.run(main())

