from __future__ import annotations

import sys

from fastapi import FastAPI, WebSocket

from .ws import handle_ws


def create_app() -> FastAPI:
    app = FastAPI()

    @app.get("/")
    def read_root():
        return {"Status": "DeepInsight Kernel Running", "Python": sys.version}

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await handle_ws(websocket)

    return app

