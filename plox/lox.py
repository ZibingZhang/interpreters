from __future__ import annotations
import sys
from typing import TYPE_CHECKING, List
import interpreter as interpret
import parser as parse
import scanner as scan
from tokens import TokenType
from expr import ASTPrinter

if TYPE_CHECKING:
    from exceptions import RuntimeException
    from tokens import Token


class Lox:
    interpreter = interpret.Interpreter()
    had_error = False
    had_runtime_error = False

    def main(self, argv: List[str]) -> None:
        if len(argv) > 2:
            print('Usage: plox [script]')
            sys.exit(100)
        elif len(argv) == 2:
            self.run_file(path=argv[1])
        else:
            self.run_prompt()

    def run_file(self, *, path: str):
        try:
            with open(path) as f:
                self.run(f.read())
        except FileNotFoundError:
            print(f'File not found: {path}')
            sys.exit(101)

    def run_prompt(self):
        print('Lox (Python Implementation)')
        while True:
            line = input('>>> ')
            if line == '':
                break
            self.run(line)
            self.had_error = False

    def run(self, source: str):
        if Lox.had_error:
            sys.exit(110)
        if Lox.had_runtime_error:
            sys.exit(111)

        scanner = scan.Scanner(source)
        parser = parse.Parser(scanner.scan())
        expr = parser.parse()

        if self.had_error:
            return

        Lox.interpreter.interpret(expr)

    @staticmethod
    def error_line(line: int, msg: str) -> None:
        Lox._report(line, '', msg)

    @staticmethod
    def error_token(token: Token, msg: str) -> None:
        if token.type == TokenType.EOF:
            Lox._report(token.line, ' at end', msg)
        else:
            Lox._report(token.line, f" at '{token.lexeme}'", msg)

    @staticmethod
    def error_runtime(error: RuntimeException) -> None:
        print(f'[line {error.token.line}] Error at {error.token.lexeme}: {error.msg}')
        Lox.had_runtime_error = True

    @staticmethod
    def _report(line: int, where: str, msg: str) -> None:
        print(f'[line {line}] Error{where}: {msg}')
        Lox.had_error = True
