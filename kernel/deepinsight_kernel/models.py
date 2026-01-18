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


class WsMetric(TypedDict):
    type: Literal["metric"]
    run_id: str
    name: str
    value: Any
    step: int


class WsHwGpu(TypedDict):
    index: int
    name: str
    utilization_gpu: int
    memory_used_mb: int
    memory_total_mb: int
    temperature_c: int


class WsHw(TypedDict, total=False):
    type: Literal["hw"]
    ts_ms: int
    gpus: list[WsHwGpu]
    error: Optional[str]


class WsOom(TypedDict, total=False):
    type: Literal["oom"]
    run_id: Optional[str]
    message: str
    likely_location: Optional[str]
    suggestions: list[str]



class WsDone(TypedDict):
    type: Literal["done"]
    run_id: str
    exit_code: Optional[int]
    timed_out: bool


class WsError(TypedDict):
    type: Literal["error"]
    message: str
    run_id: Optional[str]


WsServerMessage = Union[WsHello, WsStart, WsStdout, WsStderr, WsMetric, WsHw, WsOom, WsDone, WsError]


class WsExec(TypedDict, total=False):
    type: Literal["exec"]
    code: str
    timeout_s: float
    entry: str
    files: list[dict[str, Any]]
    workspace_root: str


class WsCancel(TypedDict, total=False):
    type: Literal["cancel"]
    run_id: str


class WsRequestSystemInfo(TypedDict):
    type: Literal["request_system_info"]


WsClientMessage = Union[WsExec, WsCancel, WsRequestSystemInfo, dict[str, Any]]
