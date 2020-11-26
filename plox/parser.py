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
            if self._match(TokenType.CLASS):
                return self._class_declaration()
            if self._match(TokenType.FUN):
                return self._function('function')
            if self._match(TokenType.VAR):
                return self._variable_declaration()
            return self._statement()
        except _ParseError:
            self._synchronize()

    def _class_declaration(self) -> st.Class:
        name = self._consume(TokenType.IDENTIFIER, 'Expect class name.')
        superclass = None
        if self._match(TokenType.LESS):
            self._consume(TokenType.IDENTIFIER, 'Expect superclass name.')
            superclass = ex.Variable(self._previous)
        self._consume(TokenType.LEFT_BRACE, "Expect '{' before class body.")
        methods = []
        while not self._check(TokenType.RIGHT_BRACE) and not self._is_at_end:
            methods.append(self._function('method'))
        self._consume(TokenType.RIGHT_BRACE, "Expect '}' after class body.")
        return st.Class(name, superclass, methods)

    def _variable_declaration(self) -> st.Var:
        name = self._consume(TokenType.IDENTIFIER, 'Expect variable name.')
        initializer = self._expression() if self._match(TokenType.EQUAL) else None
        self._consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.")
        return st.Var(name, initializer)

    def _function(self, kind: str) -> st.Function:
        name = self._consume(TokenType.IDENTIFIER, f'Expect {kind} name.')
        self._consume(TokenType.LEFT_PAREN, f"Expect '(' after {kind} name.")
        parameters = []
        if not self._check(TokenType.RIGHT_PAREN):
            parameters.append(self._consume(TokenType.IDENTIFIER, 'Expect parameter name.'))
            while self._match(TokenType.COMMA):
                if len(parameters) >= 255:
                    self._error(self._peek(), "Can't have more that 255 parameters.")
        self._consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")
        self._consume(TokenType.LEFT_BRACE, f"Expect '{{' before {kind} body.")
        body = self._block()
        return st.Function(name, parameters, body)

    def _statement(self) -> st.Stmt:
        if self._match(TokenType.BREAK):
            return self._break_statement()
        if self._match(TokenType.CONTINUE):
            return self._continue_statement()
        if self._match(TokenType.FOR):
            return self._for_statement()
        if self._match(TokenType.IF):
            return self._if_statement()
        if self._match(TokenType.RETURN):
            return self._return_statement()
        if self._match(TokenType.WHILE):
            return self._while_statement()
        if self._match(TokenType.LEFT_BRACE):
            statements = self._block()
            return st.Block(statements)
        return self._expression_statement()

    def _break_statement(self) -> st.Break:
        keyword = self._previous
        self._consume(TokenType.SEMICOLON, "Expect ';' after continue value.")
        return st.Break(keyword)

    def _continue_statement(self) -> st.Continue:
        keyword = self._previous
        self._consume(TokenType.SEMICOLON, "Expect ';' after continue value.")
        return st.Continue(keyword)

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

    def _return_statement(self) -> st.Return:
        keyword = self._previous
        value = None if self._check(TokenType.SEMICOLON) else self._expression()
        self._consume(TokenType.SEMICOLON, "Expect ';' after return value.")
        return st.Return(keyword, value)

    def _while_statement(self) -> st.While:
        self._consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.")
        condition = self._expression()
        self._consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.")
        body = self._statement()
        return st.While(condition, body)

    def _block(self) -> List[st.Stmt]:
        statements = []

        while not self._check(TokenType.RIGHT_BRACE) and not self._is_at_end:
            statements.append(self._declaration())

        self._consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
        return statements

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
            if isinstance(expr, ex.Get):
                return ex.Set(expr.object, expr.name, value)
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
        if self._match(TokenType.EQUAL):
            op = self._previous
            self._assignment()
            raise self._error(op, "Nothing to assign to.")
        if self._match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL):
            op = self._previous
            self._comparison()
            raise self._error(op, 'Not a unary operator.')
        if self._match(
                TokenType.GREATER,
                TokenType.GREATER_EQUAL,
                TokenType.LESS,
                TokenType.LESS_EQUAL
        ):
            op = self._previous
            self._term()
            raise self._error(op, 'Not a unary operator.')
        if self._match(TokenType.PLUS):
            op = self._previous
            self._factor()
            raise self._error(op, "Unary '+' expressions are not supported.")
        if self._match(TokenType.SLASH, TokenType.STAR):
            op = self._previous
            self._unary()
            raise self._error(op, 'Not a unary operator.')
        return self._call()

    def _call(self):
        expr = self._primary()
        while True:
            if self._match(TokenType.LEFT_PAREN):
                expr = self._finish_call(expr)
            elif self._match(TokenType.DOT):
                name = self._consume(TokenType.IDENTIFIER, "Expect property name after '.'.")
                expr = ex.Get(expr, name)
            else:
                break
        return expr

    def _primary(self) -> ex.Expr:
        if self._match(TokenType.FALSE):
            return ex.Literal(False)
        if self._match(TokenType.TRUE):
            return ex.Literal(True)
        if self._match(TokenType.NIL):
            return ex.Literal(None)
        if self._match(TokenType.NUMBER, TokenType.STRING):
            return ex.Literal(self._previous.literal)
        if self._match(TokenType.SUPER):
            keyword = self._previous
            self._consume(TokenType.DOT, "Expect a '.' after 'super'.")
            method = self._consume(TokenType.IDENTIFIER, 'Expect superclass method name.')
            return ex.Super(keyword, method)
        if self._match(TokenType.THIS):
            return ex.This(self._previous)
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
                TokenType.RETURN
            }:
                return
            self._advance()

    def _finish_call(self, expr: ex.Expr) -> ex.Call:
        arguments = []
        if not self._check(TokenType.RIGHT_PAREN):
            arguments.append(self._expression())
            while self._match(TokenType.COMMA):
                if len(arguments) >= 255:
                    self._error(self._peek(), "Can't have more than 255 arguments.")
                arguments.append(self._expression())
        paren = self._consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.")
        return ex.Call(expr, paren, arguments)

    @staticmethod
    def _error(token: Token, msg: str):
        lox.Lox.error_token(token, msg)
        return _ParseError()


class _ParseError(RuntimeError):
    pass
