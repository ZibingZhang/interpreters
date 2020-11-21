from __future__ import annotations
from typing import TYPE_CHECKING
import expr as ex
import lox
import stmt as st
from tokens import TokenType

if TYPE_CHECKING:
    from tokens import Token
    from typing import List, Optional


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

    def parse(self) -> List[st.Stmt]:
        statements = []
        while not self._is_at_end:
            statement = self._declaration()
            if statement is not None:
                statements.append(statement)
        return statements

    def _declaration(self) -> Optional[st.Stmt]:
        try:
            if self._match(TokenType.VAR):
                return self._variable_declaration()
            return self._statement()
        except _ParseError:
            self._synchronize()

    def _variable_declaration(self) -> st.Var:
        name = self._consume(TokenType.IDENTIFIER, 'Expect variable name.')
        initializer = self._expression() if self._match(TokenType.EQUAL) else None
        self._consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.")
        return st.Var(name, initializer)

    def _statement(self) -> st.Stmt:
        if self._match(TokenType.FOR):
            return self._for_statement()
        if self._match(TokenType.IF):
            return self._if_statement()
        if self._match(TokenType.PRINT):
            return self._print_statement()
        if self._match(TokenType.WHILE):
            return self._while_statement()
        if self._match(TokenType.LEFT_BRACE):
            return self._block_statement()
        return self._expression_statement()

    def _expression_statement(self) -> st.Expression:
        value = self._expression()
        self._consume(TokenType.SEMICOLON, "Expect a ';' after expression.")
        return st.Expression(value)

    def _for_statement(self) -> st.While:
        self._consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.")

        initializer = None
        if self._match(TokenType.SEMICOLON):
            pass
        elif self._match(TokenType.VAR):
            initializer = self._variable_declaration()
        else:
            initializer = self._expression_statement()

        condition = ex.Literal(True) if self._check(TokenType.SEMICOLON) else self._expression()
        self._consume(TokenType.SEMICOLON, "Expect ';' after loop condition.")

        increment = None if self._check(TokenType.RIGHT_PAREN) else self._expression()
        self._consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.")

        body = self._statement()
        if increment is not None:
            body = st.Block([body, st.Expression(increment)])
        body = st.While(condition, body)
        if initializer is not None:
            body = st.Block([initializer, body])

        return body

    def _if_statement(self) -> st.If:
        self._consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.")
        condition = self._expression()
        self._consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.")
        then_branch = self._statement()
        else_branch = self._statement() if self._match(TokenType.ELSE) else None
        return st.If(condition, then_branch, else_branch)

    def _print_statement(self) -> st.Print:
        value = self._expression()
        self._consume(TokenType.SEMICOLON, "Expect a ';' after value.")
        return st.Print(value)

    def _while_statement(self) -> st.While:
        self._consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.")
        condition = self._expression()
        self._consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.")
        body = self._statement()
        return st.While(condition, body)

    def _block_statement(self) -> st.Block:
        statements = []

        while not self._check(TokenType.RIGHT_BRACE) and not self._is_at_end:
            statements.append(self._declaration())

        self._consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
        return st.Block(statements)

    def _expression(self) -> ex.Expr:
        return self._sequence()

    def _sequence(self) -> ex.Expr:
        expr = self._assignment()
        while self._match(TokenType.COMMA):
            op = self._previous
            right = self._assignment()
            expr = ex.Binary(expr, op, right)
        return expr

    def _assignment(self) -> ex.Expr:
        expr = self._ternary()

        if self._match(TokenType.EQUAL):
            equals = self._previous
            value = self._assignment()

            if isinstance(expr, ex.Variable):
                name = expr.name
                return ex.Assign(name, value)

            self._error(equals, 'Invalid assignment target.')

        return expr

    def _ternary(self) -> ex.Expr:
        expr = self._logical_or()
        if self._match(TokenType.QUESTION):
            op1 = self._previous
            true_expr = self._ternary()
            op2 = self._consume(TokenType.COLON, "Expect ':' following '?'.")
            false_expr = self._ternary()
            return ex.Ternary(expr, op1, true_expr, op2, false_expr)
        return expr

    def _logical_or(self) -> ex.Expr:
        expr = self._logical_and()
        while self._match(TokenType.OR):
            op = self._previous
            right = self._logical_and()
            expr = ex.Logical(expr, op, right)
        return expr

    def _logical_and(self) -> ex.Expr:
        expr = self._equality()
        while self._match(TokenType.OR):
            op = self._previous
            right = self._equality()
            expr = ex.Logical(expr, op, right)
        return expr

    def _equality(self) -> ex.Expr:
        expr = self._comparison()
        while self._match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL):
            op = self._previous
            right = self._comparison()
            expr = ex.Binary(expr, op, right)
        return expr

    def _comparison(self) -> ex.Expr:
        expr = self._term()
        while self._match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL):
            op = self._previous
            right = self._term()
            expr = ex.Binary(expr, op, right)
        return expr

    def _term(self) -> ex.Expr:
        expr = self._factor()
        while self._match(TokenType.MINUS, TokenType.PLUS):
            op = self._previous
            right = self._factor()
            expr = ex.Binary(expr, op, right)
        return expr

    def _factor(self) -> ex.Expr:
        expr = self._unary()
        while self._match(TokenType.SLASH, TokenType.STAR):
            op = self._previous
            right = self._unary()
            expr = ex.Binary(expr, op, right)
        return expr

    def _unary(self) -> ex.Expr:
        if self._match(TokenType.BANG, TokenType.MINUS):
            op = self._previous
            right = self._unary()
            return ex.Unary(op, right)
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

    def _primary(self) -> ex.Expr:
        if self._match(TokenType.FALSE):
            return ex.Literal(False)
        if self._match(TokenType.TRUE):
            return ex.Literal(True)
        if self._match(TokenType.NIL):
            return ex.Literal(None)
        if self._match(TokenType.NUMBER, TokenType.STRING):
            return ex.Literal(self._previous.literal)
        if self._match(TokenType.IDENTIFIER):
            return ex.Variable(self._previous)
        if self._match(TokenType.LEFT_PAREN):
            expr = self._expression()
            self._consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
            return ex.Grouping(expr)
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
