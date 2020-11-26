from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING
from callable import LoxCallable
from exceptions import RuntimeException

if TYPE_CHECKING:
    from typing import Dict, Optional, List
    from callable import LoxFunction
    from interpreter import Interpreter
    from tokens import Token
    from type import LoxValue


@dataclass(frozen=True)
class LoxClass(LoxCallable):
    name: str
    methods: Dict[str, LoxFunction]

    @property
    def arity(self) -> int:
        initializer = self.find_method('init')
        return 0 if initializer is None else initializer.arity

    def __str__(self) -> str:
        return f'<{self.name}>'

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        instance = LoxInstance(self, {})
        initializer = self.find_method('init')
        if initializer is not None:
            initializer.bind(instance).call(interpreter, arguments)
        return instance

    def find_method(self, name: str) -> Optional[LoxFunction]:
        return self.methods.get(name)


@dataclass(frozen=True)
class LoxInstance:
    klass: LoxClass
    fields: Dict[str, LoxValue]

    def __str__(self) -> str:
        return f'<{self.klass.name} instance>'

    def get(self, name: Token) -> LoxValue:
        if name.lexeme in self.fields:
            return self.fields[name.lexeme]
        method = self.klass.find_method(name.lexeme)
        if method is not None:
            return method.bind(self)
        raise RuntimeException(name, f"Undefined property '{name.lexeme}'.")

    def set(self, name: Token, value: LoxValue) -> None:
        self.fields[name.lexeme] = value
