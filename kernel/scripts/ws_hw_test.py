import asyncio
import json

import websockets


async def main() -> None:
    async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
        await ws.recv()

        ok = False
        for _ in range(5):
            msg = json.loads(await ws.recv())
            if msg.get("type") == "hw":
                ok = True
                break

        if not ok:
            raise SystemExit("missing hw message")


if __name__ == "__main__":
    asyncio.run(main())

