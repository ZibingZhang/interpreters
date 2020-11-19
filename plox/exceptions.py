from dataclasses import dataclass
from tokens import Token


@dataclass(frozen=True)
class RuntimeException(RuntimeError):
    token: Token
    msg: str
