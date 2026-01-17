import asyncio
import json
import tempfile
from pathlib import Path

import websockets


async def main() -> None:
    with tempfile.TemporaryDirectory(prefix="deepinsight_ws_") as tmp:
        root = Path(tmp)
        (root / "utils").mkdir(parents=True, exist_ok=True)
        (root / "utils" / "__init__.py").write_text("", encoding="utf-8")
        (root / "utils" / "math.py").write_text("def add(a,b):\n    return a+b\n", encoding="utf-8")
        (root / "main.py").write_text("from utils.math import add\nprint(add(1,2))\n", encoding="utf-8")

        async with websockets.connect("ws://127.0.0.1:8000/ws") as ws:
            await ws.recv()
            await ws.send(
                json.dumps(
                    {
                        "type": "exec",
                        "workspace_root": str(root),
                        "entry": "main.py",
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
                raise SystemExit("workspace exec test failed: missing stdout 3")


if __name__ == "__main__":
    asyncio.run(main())

