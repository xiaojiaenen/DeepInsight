from __future__ import annotations

from typing import Any, Literal, Optional, TypedDict, Union


class WsHello(TypedDict, total=False):
    type: Literal["hello"]
    python: str
    executable: str


class WsStart(TypedDict):
    type: Literal["start"]


class WsStdout(TypedDict):
    type: Literal["stdout"]
    data: str


class WsStderr(TypedDict):
    type: Literal["stderr"]
    data: str


class WsDone(TypedDict):
    type: Literal["done"]
    exit_code: Optional[int]
    timed_out: bool


class WsError(TypedDict):
    type: Literal["error"]
    message: str


WsServerMessage = Union[WsHello, WsStart, WsStdout, WsStderr, WsDone, WsError]


class WsExec(TypedDict, total=False):
    type: Literal["exec"]
    code: str
    timeout_s: float


WsClientMessage = Union[WsExec, dict[str, Any]]

