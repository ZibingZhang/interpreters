from __future__ import annotations
from typing import TYPE_CHECKING
from tokens import Token, TokenType
import lox

if TYPE_CHECKING:
    from type import Literal
    from typing import List


class Scanner:
    _KEYWORDS = {
        'and': TokenType.AND,
        'class': TokenType.CLASS,
        'else': TokenType.ELSE,
        'false': TokenType.FALSE,
        'for': TokenType.FOR,
        'fun': TokenType.FUN,
        'if': TokenType.IF,
        'nil': TokenType.NIL,
        'or': TokenType.OR,
        'print': TokenType.PRINT,
        'return': TokenType.RETURN,
        'super': TokenType.SUPER,
        'this': TokenType.THIS,
        'true': TokenType.TRUE,
        'var': TokenType.VAR,
        'while': TokenType.WHILE
    }

    def __init__(self, source: str) -> None:
        self._source = source
        self._start = 0
        self._current = 0
        self._line = 1
        self._tokens = []

    @property
    def _is_at_end(self) -> bool:
        return self._current >= len(self._source)

    def scan(self) -> List[Token]:
        while not self._is_at_end:
            # starting a new lexeme
            self._start = self._current
            self._scan_token()
        self._add_token(TokenType.EOF)
        return self._tokens

    def _scan_token(self) -> None:
        c = self._advance()
        if c == '(':
            self._add_token(TokenType.LEFT_PAREN)
        elif c == ')':
            self._add_token(TokenType.RIGHT_PAREN)
        elif c == '{':
            self._add_token(TokenType.LEFT_BRACE)
        elif c == '}':
            self._add_token(TokenType.RIGHT_BRACE)
        elif c == ':':
            self._add_token(TokenType.COLON)
        elif c == ',':
            self._add_token(TokenType.COMMA)
        elif c == '.':
            self._add_token(TokenType.DOT)
        elif c == '-':
            self._add_token(TokenType.MINUS)
        elif c == '+':
            self._add_token(TokenType.PLUS)
        elif c == '?':
            self._add_token(TokenType.QUESTION)
        elif c == ';':
            self._add_token(TokenType.SEMICOLON)
        elif c == '*':
            self._add_token(TokenType.STAR)
        elif c == '!':
            self._add_token(TokenType.BANG_EQUAL if self._match('=') else TokenType.BANG)
        elif c == '=':
            self._add_token(TokenType.EQUAL_EQUAL if self._match('=') else TokenType.EQUAL)
        elif c == '<':
            self._add_token(TokenType.LESS_EQUAL if self._match('=') else TokenType.LESS)
        elif c == '>':
            self._add_token(TokenType.GREATER_EQUAL if self._match('=') else TokenType.GREATER)
        elif c == '/':
            if self._match('/'):
                self._line_comment()
            elif self._match('*'):
                raise NotImplementedError('Block comments not yet supported.')
                # self._block_comment()
            else:
                self._add_token(TokenType.SLASH)
        elif c in {' ', '\r', '\t'}:
            pass
        elif c == '\n':
            self._line += 1
        elif c.isalpha():
            self._identifier()
        elif c.isnumeric():
            self._number()
        elif c == '"':
            self._string()
        else:
            lox.Lox.error_line(self._line, f'Unexpected character, {c}.')

    def _line_comment(self) -> None:
        while self._peek() != '\n' and not self._is_at_end:
            self._advance()
        # self._add_token(TokenType.COMMENT)

    def _identifier(self) -> None:
        while self._peek().isalpha():
            self._advance()
        text = self._source[self._start:self._current]
        token_type = Scanner._KEYWORDS.get(text) or TokenType.IDENTIFIER
        self._add_token(token_type)

    def _number(self) -> None:
        while self._peek().isnumeric():
            self._advance()

        # decimal part
        if self._peek() == '.' and self._peek_next().isnumeric():
            # consume the .
            self._advance()

            while self._peek().isnumeric():
                self._advance()

        self._add_token(TokenType.NUMBER, float(self._source[self._start:self._current]))

    def _string(self) -> None:
        while c := self._peek() != '"' and not self._is_at_end:
            if c == '\n':
                self._line += 1
            self._advance()

        if self._is_at_end:
            lox.Lox.error_line(self._line, 'Unterminated string.')

        # closing "
        self._advance()

        # trim surrounding quotes
        value = self._source[self._start + 1:self._current - 1]
        self._add_token(TokenType.STRING, value)

    def _advance(self) -> str:
        self._current += 1
        return self._source[self._current - 1]

    def _match(self, expected: str) -> bool:
        if self._is_at_end:
            return False
        elif self._source[self._current] != expected:
            return False

        self._current += 1
        return True

    def _peek(self) -> str:
        if self._is_at_end:
            return '\0'
        return self._source[self._current]

    def _peek_next(self) -> str:
        if self._current + 1 >= len(self._source):
            return '\0'
        return self._source[self._current + 1]

    def _add_token(self, token_type: TokenType, literal: Literal = None) -> None:
        text = self._source[self._start:self._current]
        self._tokens.append(Token(token_type, text, literal, self._line))
