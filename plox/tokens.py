from __future__ import annotations
from enum import Enum
from typing import TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from type import Literal


class TokenType(Enum):
    # single-character tokens
    LEFT_PAREN  = '('
    RIGHT_PAREN = ')'
    LEFT_BRACE  = '{'
    RIGHT_BRACE = '}'
    COLON       = ':'
    COMMA       = ','
    DOT         = '.'
    MINUS       = '-'
    PLUS        = '+'
    QUESTION    = '?'
    SEMICOLON   = ';'
    SLASH       = '/'
    STAR        = '*'

    # one-two character tokens
    BANG          = '!'
    BANG_EQUAL    = '!='
    EQUAL         = '='
    EQUAL_EQUAL   = '=='
    GREATER       = '>'
    GREATER_EQUAL = '>='
    LESS          = '<'
    LESS_EQUAL    = '<='

    # literals
    IDENTIFIER = 'IDENTIFIER'
    STRING     = 'STRING'
    NUMBER     = 'NUMBER'

    # keywords
    AND      = 'AND'
    BREAK    = 'BREAK'
    CONTINUE = 'CONTINUE'
    CLASS    = 'CLASS'
    ELSE     = 'ELSE'
    FALSE    = 'FALSE'
    FUN      = 'FUN'
    FOR      = 'FOR'
    IF       = 'IF'
    NIL      = 'NIL'
    OR       = 'OR'
    RETURN   = 'RETURN'
    SUPER    = 'SUPER'
    THIS     = 'THIS'
    TRUE     = 'TRUE'
    VAR      = 'VAR'
    WHILE    = 'WHILE'

    # comment
    COMMENT = 'COMMENT'

    # eof
    EOF = 'EOF'


@dataclass(frozen=True)
class Token:
    _id: int
    type: TokenType
    lexeme: str
    literal: Literal
    line: int

    def __str__(self) -> str:
        return f'{self.type} {self.lexeme} {self.literal}'

    def __repr__(self) -> str:
        return f'<Token type:{self.type} lexeme:{self.lexeme} literal:{self.literal}>'
