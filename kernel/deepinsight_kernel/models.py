from __future__ import annotations

from typing import Any, Literal, Optional, TypedDict, Union


class WsHello(TypedDict, total=False):
    type: Literal["hello"]
    python: str
    executable: str


class WsStart(TypedDict):
    type: Literal["start"]
    run_id: str


class WsStdout(TypedDict):
    type: Literal["stdout"]
    data: str
    run_id: str


class WsStderr(TypedDict):
    type: Literal["stderr"]
    data: str
    run_id: str


class WsDone(TypedDict):
    type: Literal["done"]
    run_id: str
    exit_code: Optional[int]
    timed_out: bool
    cancelled: bool


class WsError(TypedDict):
    type: Literal["error"]
    message: str
    run_id: Optional[str]


WsServerMessage = Union[WsHello, WsStart, WsStdout, WsStderr, WsDone, WsError]


class WsExec(TypedDict, total=False):
    type: Literal["exec"]
    code: str
    timeout_s: float


class WsCancel(TypedDict, total=False):
    type: Literal["cancel"]
    run_id: str


WsClientMessage = Union[WsExec, WsCancel, dict[str, Any]]
