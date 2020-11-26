from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING
from environment import Environment
from exceptions import Return

if TYPE_CHECKING:
    from typing import List
    from classes import LoxInstance
    from interpreter import Interpreter
    from stmt import Function
    from type import LoxValue


class LoxCallable(abc.ABC):
    @property
    @abc.abstractmethod
    def arity(self) -> int:
        ...

    @abc.abstractmethod
    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        ...


@dataclass(frozen=True)
class LoxFunction(LoxCallable):
    declaration: Function
    closure: Environment
    is_initializer: bool

    @property
    def arity(self) -> int:
        return len(self.declaration.parameters)

    def __str__(self):
        return f'<fn {self.declaration.name.lexeme}>'

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        env = Environment(self.closure)
        for idx, (param, arg) in enumerate(zip(self.declaration.parameters, arguments)):
            env.define(param.lexeme, arg)
        try:
            interpreter.execute_block(self.declaration.body, Environment(env))
        except Return as return_value:
            if self.is_initializer:
                return self.closure.get_at(0, 'this')
            return return_value.value
        if self.is_initializer:
            return self.closure.get_at(0, 'this')

    def bind(self, instance: LoxInstance) -> LoxFunction:
        env = Environment(self.closure)
        env.define('this', instance)
        return LoxFunction(self.declaration, env, self.is_initializer)
