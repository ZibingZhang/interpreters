from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tokens import Token


@dataclass(frozen=True)
class RuntimeException(RuntimeError):
    token: Token
    msg: str
