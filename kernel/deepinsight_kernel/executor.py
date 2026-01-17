from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from pathlib import Path, PurePosixPath
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


def _validate_rel_posix_path(p: str) -> str:
    pp = PurePosixPath(p)
    if pp.is_absolute():
        raise ValueError("absolute path is not allowed")
    if any(part in ("..", "") for part in pp.parts):
        raise ValueError("invalid path")
    return pp.as_posix()


async def execute_python_project(
    files: list[tuple[str, str]],
    entry: str,
    timeout_s: float,
    on_stdout: Callable[[str], Awaitable[None]],
    on_stderr: Callable[[str], Awaitable[None]],
    cancel_event: asyncio.Event | None = None,
) -> tuple[Optional[int], bool, bool]:
    entry_norm = _validate_rel_posix_path(entry)
    file_map: dict[str, str] = {}
    for path, content in files:
        path_norm = _validate_rel_posix_path(path)
        file_map[path_norm] = content
    if entry_norm not in file_map:
        raise ValueError("entry not found in files")

    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"

    with tempfile.TemporaryDirectory(prefix="deepinsight_") as tmp:
        root = Path(tmp)
        root_str = str(root).rstrip("\\/")
        for rel, content in file_map.items():
            target = root / Path(rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")

        cwd = str(root)
        env["PYTHONPATH"] = cwd + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")

        entry_path = str(root / Path(entry_norm))

        async def mapped_stdout(line: str) -> None:
            await on_stdout(line)

        def _map_trace_path(line: str) -> str:
            s = line
            if 'File "' in s:
                s = s.replace(f'File "{root_str}\\\\', 'File "')
                s = s.replace(f'File "{root_str}/', 'File "')
            return s

        async def mapped_stderr(line: str) -> None:
            await on_stderr(_map_trace_path(line))

        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-X",
            "utf8",
            "-u",
            entry_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            cwd=cwd,
        )

        tasks: list[asyncio.Task[None]] = []
        if proc.stdout is not None:
            tasks.append(asyncio.create_task(_read_stream_lines(proc.stdout, mapped_stdout)))
        if proc.stderr is not None:
            tasks.append(asyncio.create_task(_read_stream_lines(proc.stderr, mapped_stderr)))

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


async def execute_python_workspace(
    workspace_root: str,
    entry: str,
    timeout_s: float,
    on_stdout: Callable[[str], Awaitable[None]],
    on_stderr: Callable[[str], Awaitable[None]],
    cancel_event: asyncio.Event | None = None,
) -> tuple[Optional[int], bool, bool]:
    root = Path(workspace_root).resolve()
    if not root.exists() or not root.is_dir():
        raise ValueError("workspace_root is not a directory")

    entry_norm = _validate_rel_posix_path(entry)
    entry_path = (root / Path(entry_norm)).resolve()
    if not entry_path.exists() or not entry_path.is_file():
        raise ValueError("entry not found")

    root_str = str(root).rstrip("\\/")

    def _map_trace_path(line: str) -> str:
        s = line
        if 'File "' in s:
            s = s.replace(f'File "{root_str}\\\\', 'File "')
            s = s.replace(f'File "{root_str}/', 'File "')
        return s

    async def mapped_stderr(line: str) -> None:
        await on_stderr(_map_trace_path(line))

    env = dict(os.environ)
    env["PYTHONUTF8"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONPATH"] = str(root) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")

    python_exe = sys.executable
    venv_dir = root / ".venv"
    if os.name == "nt":
        candidate = venv_dir / "Scripts" / "python.exe"
    else:
        candidate = venv_dir / "bin" / "python"
    if candidate.exists():
        python_exe = str(candidate)
        env["VIRTUAL_ENV"] = str(venv_dir)
        if os.name == "nt":
            env["PATH"] = str(venv_dir / "Scripts") + os.pathsep + env.get("PATH", "")
        else:
            env["PATH"] = str(venv_dir / "bin") + os.pathsep + env.get("PATH", "")

    proc = await asyncio.create_subprocess_exec(
        python_exe,
        "-X",
        "utf8",
        "-u",
        str(entry_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
        cwd=str(root),
    )

    tasks: list[asyncio.Task[None]] = []
    if proc.stdout is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stdout, on_stdout)))
    if proc.stderr is not None:
        tasks.append(asyncio.create_task(_read_stream_lines(proc.stderr, mapped_stderr)))

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
