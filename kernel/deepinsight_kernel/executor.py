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
    cancel_event: asyncio.Event | None = None,
) -> tuple[Optional[int], bool, bool]:
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
    cancelled = False
    try:
        cancel_waiter = cancel_event.wait() if cancel_event is not None else None
        proc_waiter = proc.wait()

        waiters = [asyncio.create_task(proc_waiter)]
        if cancel_waiter is not None:
            waiters.append(asyncio.create_task(cancel_waiter))

        done, pending = await asyncio.wait(waiters, timeout=timeout_s, return_when=asyncio.FIRST_COMPLETED)
        for p in pending:
            p.cancel()

        if not done:
            raise asyncio.TimeoutError

        if cancel_event is not None and cancel_event.is_set() and proc.returncode is None:
            cancelled = True
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=3)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
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

    return proc.returncode, timed_out, cancelled
