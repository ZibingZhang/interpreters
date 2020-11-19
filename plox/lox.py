import sys
from typing import List
import scanner as scan


class Lox:
    had_error = False

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
            sys.exit(100)

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
            sys.exit(100)
        scanner = scan.Scanner(source)
        tokens = scanner.tokens

    @staticmethod
    def error(line: int, msg: str):
        Lox._report(line, '', msg)

    @staticmethod
    def _report(line: int, where: str, msg: str):
        print(f'[line {line}] Error{where}: {msg}')
        Lox.had_error = True
