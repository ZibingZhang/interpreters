import enum
from dataclasses import dataclass
from type import Literal


class TokenType(enum.Enum):
    # single-character tokens
    LEFT_PAREN  = '('
    RIGHT_PAREN = ')'
    LEFT_BRACE  = '{'
    RIGHT_BRACE = '}'
    COMMA       = ','
    DOT         = '.'
    MINUS       = '-'
    PLUS        = '+'
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
    AND    = 'AND'
    CLASS  = 'CLASS'
    ELSE   = 'ELSE'
    FALSE  = 'FALSE'
    FUN    = 'FUN'
    FOR    = 'FOR'
    IF     = 'IF'
    NIL    = 'NIL'
    OR     = 'OR'
    PRINT  = 'PRINT'
    RETURN = 'RETURN'
    SUPER  = 'SUPER'
    THIS   = 'THIS'
    TRUE   = 'TRUE'
    VAR    = 'VAR'
    WHILE  = 'WHILE'

    # comment
    COMMENT = 'COMMENT'

    # eof
    EOF = 'EOF'


@dataclass(frozen=True)
class Token:
    type: TokenType
    lexeme: str
    literal: Literal
    line: int

    def __str__(self) -> str:
        return f'{self.type} {self.lexeme} {self.literal}'

    def __repr__(self) -> str:
        return f'<Token type:{self.type} lexeme:{self.lexeme} literal:{self.literal}>'
