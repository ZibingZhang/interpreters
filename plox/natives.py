from __future__ import annotations
import sys
import time
from typing import TYPE_CHECKING
from callable import Callable

if TYPE_CHECKING:
    from typing import List
    from interpreter import Interpreter
    from type import LoxValue


class _Native(Callable):
    def __str__(self) -> str:
        return '<native fn>'


class Clock(_Native):
    @property
    def arity(self) -> int:
        return 0

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> int:
        return int(time.time())


class Print(_Native):
    @property
    def arity(self) -> int:
        return 1

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        sys.stdout.write(interpreter.stringify(arguments[0]))


class PrintLn(_Native):
    @property
    def arity(self) -> int:
        return 1

    def call(self, interpreter: Interpreter, arguments: List[LoxValue]) -> LoxValue:
        sys.stdout.write(interpreter.stringify(arguments[0]) + '\n')
