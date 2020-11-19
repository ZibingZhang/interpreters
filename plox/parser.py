from __future__ import annotations
from typing import TYPE_CHECKING, List, Optional
from expr import (
    BinaryExpr,
    GroupingExpr,
    LiteralExpr,
    TernaryExpr,
    UnaryExpr
)
import lox
from tokens import TokenType

if TYPE_CHECKING:
    from expr import Expr
    from tokens import Token


class Parser:
    def __init__(self, tokens: List[Token]) -> None:
        self._tokens = tokens
        self._current = 0

    @property
    def _is_at_end(self) -> bool:
        return self._peek().type == TokenType.EOF

    @property
    def _previous(self) -> Token:
        return self._tokens[self._current - 1]

    def parse(self) -> Optional[Expr]:
        try:
            return self._expression()
        except _ParseError:
            return None

    def _expression(self) -> Expr:
        return self._sequence()

    def _sequence(self) -> Expr:
        expr = self._ternary()
        while self._match(TokenType.COMMA):
            op = self._previous
            right = self._ternary()
            expr = BinaryExpr(expr, op, right)
        return expr

    def _ternary(self) -> Expr:
        expr = self._equality()
        if self._match(TokenType.QUESTION):
            op1 = self._previous
            true_expr = self._equality()
            op2 = self._consume(TokenType.COLON, "Expect ':' following '?'.")
            false_expr = self._ternary()
            return TernaryExpr(expr, op1, true_expr, op2, false_expr)
        return expr

    def _equality(self) -> Expr:
        expr = self._comparison()
        while self._match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL):
            op = self._previous
            right = self._comparison()
            expr = BinaryExpr(expr, op, right)
        return expr

    def _comparison(self) -> Expr:
        expr = self._term()
        while self._match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL):
            op = self._previous
            right = self._term()
            expr = BinaryExpr(expr, op, right)
        return expr

    def _term(self) -> Expr:
        expr = self._factor()
        while self._match(TokenType.MINUS, TokenType.PLUS):
            op = self._previous
            right = self._factor()
            expr = BinaryExpr(expr, op, right)
        return expr

    def _factor(self) -> Expr:
        expr = self._unary()
        while self._match(TokenType.SLASH, TokenType.STAR):
            op = self._previous
            right = self._unary()
            expr = BinaryExpr(expr, op, right)
        return expr

    def _unary(self) -> Expr:
        if self._match(TokenType.BANG, TokenType.MINUS):
            op = self._previous
            right = self._unary()
            return UnaryExpr(op, right)
        if self._match(TokenType.PLUS):
            op = self._previous
            raise self._error(op, "Unary '+' expressions are not supported.")
        if self._match(
                TokenType.MINUS,
                TokenType.SLASH,
                TokenType.STAR,
                TokenType.BANG,
                TokenType.BANG_EQUAL,
                TokenType.EQUAL,
                TokenType.EQUAL_EQUAL,
                TokenType.GREATER,
                TokenType.GREATER_EQUAL,
                TokenType.LESS,
                TokenType.LESS_EQUAL
        ):
            op = self._previous
            self._unary()
            raise self._error(op, 'Not a unary operator.')
        return self._primary()

    def _primary(self) -> Expr:
        if self._match(TokenType.FALSE):
            return LiteralExpr(False)
        if self._match(TokenType.TRUE):
            return LiteralExpr(True)
        if self._match(TokenType.NIL):
            return LiteralExpr(None)
        if self._match(TokenType.NUMBER, TokenType.STRING):
            return LiteralExpr(self._previous.literal)
        if self._match(TokenType.LEFT_PAREN):
            expr = self._expression()
            self._consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
            return GroupingExpr(expr)
        raise self._error(self._peek(), 'Expect expression.')

    def _match(self, *args: TokenType) -> bool:
        for token_type in args:
            if self._check(token_type):
                self._advance()
                return True
        return False

    def _check(self, token_type: TokenType) -> bool:
        if self._is_at_end:
            return False
        return self._peek().type == token_type

    def _advance(self) -> Token:
        if not self._is_at_end:
            self._current += 1
        return self._previous

    def _peek(self) -> Token:
        return self._tokens[self._current]

    def _consume(self, token_type: TokenType, msg: str) -> Token:
        if self._check(token_type):
            return self._advance()

        raise self._error(self._peek(), msg)

    def _synchronize(self) -> None:
        self._advance()
        while not self._is_at_end:
            if self._previous.type == TokenType.SEMICOLON:
                return
            if self._peek().type in {
                TokenType.CLASS,
                TokenType.FUN,
                TokenType.VAR,
                TokenType.FOR,
                TokenType.IF,
                TokenType.WHILE,
                TokenType.PRINT,
                TokenType.RETURN
            }:
                return
            self._advance()

    @staticmethod
    def _error(token: Token, msg: str):
        lox.Lox.error_token(token, msg)
        return _ParseError()


class _ParseError(RuntimeError):
    pass
