from __future__ import annotations
import sys
from typing import TYPE_CHECKING
import interpreter as interpret
import parser as parse
import resolver as resolve
import scanner as scan
from tokens import TokenType

if TYPE_CHECKING:
    from exceptions import RuntimeException
    from tokens import Token
    from typing import List


class Lox:
    interpreter = interpret.Interpreter()
    had_error = False
    had_runtime_error = False

    @staticmethod
    def main(argv: List[str]) -> None:
        if len(argv) > 2:
            print('Usage: plox [script]')
            sys.exit(100)
        elif len(argv) == 2:
            Lox.run_file(path=argv[1])
        else:
            Lox.run_prompt()

    @staticmethod
    def run_file(*, path: str):
        try:
            with open(path) as f:
                Lox.run(f.read())
        except FileNotFoundError:
            print(f'File not found: {path}')
            sys.exit(101)

        if Lox.had_error:
            sys.exit(110)
        if Lox.had_runtime_error:
            sys.exit(111)

    @staticmethod
    def run_prompt():
        print('Lox (Python Implementation)')
        while True:
            line = input('>>> ')
            if line == '':
                break
            Lox.run(line)
            Lox.had_error = False
            Lox.had_runtime_error = False

    @staticmethod
    def run(source: str):
        scanner = scan.Scanner(source)
        parser = parse.Parser(scanner.scan())
        statements = parser.parse()

        if Lox.had_error:
            return

        resolver = resolve.Resolver(Lox.interpreter)
        resolver.resolve(statements)

        # print(Lox.interpreter._locals)

        if Lox.had_error:
            return

        Lox.interpreter.interpret(statements)

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
