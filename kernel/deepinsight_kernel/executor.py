from __future__ import annotations

import asyncio
import os
import sys
from typing import Awaitable, Callable, Optional


async def _read_stream_lines(
    stream: asyncio.StreamReader,
    on_line: Callable[[str], Awaitable[None]],
) -> None:
    while True:
        line = await stream.readline()
        if not line:
            break
        await on_line(line.decode("utf-8", errors="replace"))


async def execute_python(
    code: str,
    timeout_s: float,
    on_stdout: Callable[[str], Awaitable[None]],
    on_stderr: Callable[[str], Awaitable[None]],
) -> tuple[Optional[int], bool]:
    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    proc = await asyncio.create_subprocess_exec(
        sys.executable,
        "-X",
        "utf8",
        "-u",
        "-c",
        code,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )

    tasks: list[asyncio.Task[None]] = []
    if proc.stdout is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stdout, on_stdout)))
    if proc.stderr is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stderr, on_stderr)))

    timed_out = False
    try:
        await asyncio.wait_for(proc.wait(), timeout=timeout_s)
    except asyncio.TimeoutError:
        timed_out = True
        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=3)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)

    return proc.returncode, timed_out

