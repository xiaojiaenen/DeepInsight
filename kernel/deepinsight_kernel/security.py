from __future__ import annotations

import ast
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SecurityViolation:
    name: str
    lineno: int
    col: int


def _dotted_name(expr: ast.AST) -> Optional[str]:
    if isinstance(expr, ast.Name):
        return expr.id
    if isinstance(expr, ast.Attribute):
        base = _dotted_name(expr.value)
        if not base:
            return None
        return f"{base}.{expr.attr}"
    return None


def _build_alias_map(tree: ast.AST) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                local = a.asname or a.name
                alias_map[local] = a.name
        if isinstance(node, ast.ImportFrom):
            if not node.module:
                continue
            for a in node.names:
                if a.name == "*":
                    continue
                local = a.asname or a.name
                alias_map[local] = f"{node.module}.{a.name}"
    return alias_map


def _resolve_call_name(call: ast.Call, alias_map: dict[str, str]) -> Optional[str]:
    raw = _dotted_name(call.func)
    if not raw:
        return None
    head, *rest = raw.split(".")
    mapped = alias_map.get(head)
    if mapped:
        if rest:
            return ".".join([mapped, *rest])
        return mapped
    return raw


def check_code_safety(code: str) -> list[SecurityViolation]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    alias_map = _build_alias_map(tree)

    banned_calls = {
        "os.system",
        "os.popen",
        "os.spawnl",
        "os.spawnlp",
        "os.spawnv",
        "os.spawnvp",
        "subprocess.Popen",
        "subprocess.run",
        "subprocess.call",
        "subprocess.check_call",
        "subprocess.check_output",
        "eval",
        "__import__",
        "compile",
    }

    violations: list[SecurityViolation] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = _resolve_call_name(node, alias_map)
            if name and name in banned_calls:
                lineno = int(getattr(node, "lineno", 1))
                col = int(getattr(node, "col_offset", 0))
                violations.append(SecurityViolation(name=name, lineno=lineno, col=col))
    violations.sort(key=lambda v: (v.lineno, v.col, v.name))
    return violations

