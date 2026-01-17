from __future__ import annotations

import shutil
import subprocess
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class GpuSnapshot:
    index: int
    name: str
    utilization_gpu: int
    memory_used_mb: int
    memory_total_mb: int
    temperature_c: int


def _run_nvidia_smi() -> tuple[list[GpuSnapshot], str | None]:
    exe = shutil.which("nvidia-smi")
    if not exe:
        return ([], "nvidia-smi not found")

    query = [
        "index",
        "name",
        "utilization.gpu",
        "memory.used",
        "memory.total",
        "temperature.gpu",
    ]
    cmd = [
        exe,
        f"--query-gpu={','.join(query)}",
        "--format=csv,noheader,nounits",
    ]
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=1.5)
    except subprocess.TimeoutExpired:
        return ([], "nvidia-smi timeout")
    except Exception as e:
        return ([], f"nvidia-smi error: {type(e).__name__}")

    gpus: list[GpuSnapshot] = []
    for line in out.splitlines():
        raw = line.strip()
        if not raw:
            continue
        parts = [p.strip() for p in raw.split(",")]
        if len(parts) != 6:
            continue
        try:
            idx = int(parts[0])
            name = parts[1]
            util = int(float(parts[2]))
            mem_used = int(float(parts[3]))
            mem_total = int(float(parts[4]))
            temp = int(float(parts[5]))
        except Exception:
            continue
        gpus.append(
            GpuSnapshot(
                index=idx,
                name=name,
                utilization_gpu=util,
                memory_used_mb=mem_used,
                memory_total_mb=mem_total,
                temperature_c=temp,
            )
        )
    return (gpus, None)


def read_gpu_snapshot() -> tuple[int, list[GpuSnapshot], str | None]:
    ts_ms = int(time.time() * 1000)
    gpus, err = _run_nvidia_smi()
    return (ts_ms, gpus, err)

