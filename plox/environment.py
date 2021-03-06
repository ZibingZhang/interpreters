from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING
from exceptions import RuntimeException

if TYPE_CHECKING:
    from typing import Dict, Optional
    from tokens import Token
    from type import LoxValue


@dataclass(frozen=True)
class Environment:
    enclosing: Optional[Environment] = None
    values: Dict[str, LoxValue] = field(default_factory=dict)

    def define(self, name: str, value: LoxValue) -> None:
        self.values[name] = value

    def initialize(self, name: Token, value: LoxValue) -> None:
        self.values[name.lexeme] = value

    def assign(self, name: Token, value: LoxValue) -> None:
        if name.lexeme in self.values:
            self.values[name.lexeme] = value
        elif self.enclosing is not None:
            self.enclosing.assign(name, value)
        else:
            raise RuntimeException(name, f"Undefined variable '{name.lexeme}'")

    def assign_at(self, distance: int, name: Token, value: LoxValue):
        self._ancestor(distance).values[name.lexeme] = value

    def get(self, name: Token) -> LoxValue:
        if name.lexeme in self.values:
            return self.values[name.lexeme]
        elif self.enclosing is not None:
            return self.enclosing.get(name)
        else:
            raise RuntimeException(name, f"Undefined variable '{name.lexeme}'.")

    def get_at(self, distance: int, name: str) -> LoxValue:
        return self._ancestor(distance).values.get(name)

    def _ancestor(self, distance: int):
        env = self
        for _ in range(distance):
            env = env.enclosing
        return env
