from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tokens import Token
    from type import LoxValue


@dataclass(frozen=True)
class RuntimeException(RuntimeError):
    token: Token
    msg: str


@dataclass(frozen=True)
class Break(RuntimeError):
    pass


@dataclass(frozen=True)
class Continue(RuntimeError):
    pass


@dataclass(frozen=True)
class Return(RuntimeError):
    value: LoxValue
