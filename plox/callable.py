from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING
from environment import Environment
from exceptions import Return

if TYPE_CHECKING:
    from typing import List, Optional
    from expr import Function
    from interpreter import Interpreter
    from type import LoxValue


class Callable(abc.ABC):
    @property
    @abc.abstractmethod
    def arity(self) -> int:
        ...

    @abc.abstractmethod
    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        ...


@dataclass(frozen=True)
class LoxFunction(Callable):
    name: Token
    expression: Function
    closure: Environment

    @property
    def arity(self) -> int:
        return len(self.expression.parameters)

    def __str__(self):
        return f'<fn {self.name.lexeme}>'

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        env = Environment(self.closure)
        for idx, (param, arg) in enumerate(zip(self.expression.parameters, arguments)):
            env.define(param.lexeme, arg)
        try:
            interpreter.execute_block(self.expression.body, Environment(env))
        except Return as e:
            return e.value
