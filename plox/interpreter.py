from __future__ import annotations
from typing import TYPE_CHECKING, Any
import lox
from environment import Environment
from exceptions import RuntimeException
import expr as ex
import stmt as st
from expr import ExprVisitor
from stmt import StmtVisitor
from tokens import TokenType

if TYPE_CHECKING:
    from typing import List
    from tokens import Token
    from type import LoxVal


class Interpreter(ExprVisitor, StmtVisitor):
    def __init__(self):
        self._env = Environment()

    def interpret(self, stmts: List[st.Stmt]) -> None:
        try:
            for stmt in stmts:
                self._execute(stmt)
        except RuntimeException as e:
            lox.Lox.error_runtime(e)

    def visit_assign_expr(self, expr: ex.Assign) -> Any:
        value = self._evaluate(expr.value)
        self._env.assign(expr.name, value)
        return value

    def visit_binary_expr(self, expr: ex.Binary) -> LoxVal:
        left = self._evaluate(expr.left)
        right = self._evaluate(expr.right)

        if expr.op.type is TokenType.BANG_EQUAL:
            return not self._is_equal(left, right)
        if expr.op.type is TokenType.EQUAL_EQUAL:
            return self._is_equal(left, right)
        if expr.op.type is TokenType.GREATER:
            self._check_number_operands(expr.op, left, right)
            return left > right
        if expr.op.type is TokenType.GREATER_EQUAL:
            self._check_number_operands(expr.op, left, right)
            return left >= right
        if expr.op.type is TokenType.LESS:
            self._check_number_operands(expr.op, left, right)
            return left < right
        if expr.op.type is TokenType.LESS_EQUAL:
            self._check_number_operands(expr.op, left, right)
            return left <= right
        if expr.op.type is TokenType.MINUS:
            self._check_number_operands(expr.op, left, right)
            return left - right
        if expr.op.type is TokenType.SLASH:
            self._check_number_operands(expr.op, left, right)
            self._check_denominator(expr.op, right)
            return left / right
        if expr.op.type is TokenType.STAR:
            self._check_number_operands(expr.op, left, right)
            return left * right
        if expr.op.type is TokenType.PLUS:
            if isinstance(left, float) and isinstance(right, float):
                return left + right
            if isinstance(left, str) or isinstance(right, str):
                return self._stringify(left) + self._stringify(right)
            raise RuntimeException(expr.op, 'Incompatible operands.')
        if expr.op.type is TokenType.COMMA:
            self._evaluate(expr.left)
            return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_grouping_expr(self, expr: ex.Grouping) -> LoxVal:
        return self._evaluate(expr.expr)

    def visit_literal_expr(self, expr: ex.Literal) -> LoxVal:
        return expr.value

    def visit_ternary_expr(self, expr: ex.Ternary) -> LoxVal:
        if expr.op1.type is TokenType.QUESTION and expr.op2.type is TokenType.COLON:
            pred = self._evaluate(expr.left)
            if self._is_truthy(pred):
                return self._evaluate(expr.center)
            else:
                return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_unary_expr(self, expr: ex.Unary) -> LoxVal:
        right = self._evaluate(expr.right)
        if expr.op.type is TokenType.MINUS:
            self._check_number_operands(expr.op, right)
            return -right
        if expr.op.type is TokenType.BANG:
            return not self._is_truthy(right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_variable_expr(self, expr: ex.Variable) -> LoxVal:
        return self._env.get(expr.name)

    def visit_block_stmt(self, stmt: st.Block) -> None:
        self._execute_block(stmt.stmts, Environment(self._env))

    def visit_expr_stmt(self, stmt: st.Expr) -> None:
        self._evaluate(stmt.expr)

    def visit_print_stmt(self, stmt: st.Print) -> None:
        value = self._evaluate(stmt.expr)
        print(self._stringify(value))

    def visit_var_stmt(self, stmt: st.Var) -> None:
        value = None
        if stmt.initializer is not None:
            value = self._evaluate(stmt.initializer)
        self._env.initialize(stmt.name, value)

    def _execute_block(self, stmts: List[st.Stmt], env: Environment) -> None:
        prev = self._env
        try:
            self._env = env
            for stmt in stmts:
                self._execute(stmt)
        finally:
            self._env = prev

    def _execute(self, stmt: st.Stmt) -> None:
        stmt.accept(self)

    def _evaluate(self, expr: ex.Expr) -> LoxVal:
        return expr.accept(self)

    @staticmethod
    def _is_truthy(value: LoxVal) -> bool:
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        return True

    @staticmethod
    def _is_equal(a: LoxVal, b: LoxVal) -> bool:
        return a == b

    @staticmethod
    def _check_number_operands(operator: Token, *args: LoxVal) -> None:
        for operand in args:
            if not isinstance(operand, float):
                raise RuntimeException(operator, 'Operands must be numbers.')

    @staticmethod
    def _check_denominator(operator: Token, value: LoxVal) -> None:
        if value == 0:
            raise RuntimeException(operator, 'Division by zero.')

    @staticmethod
    def _stringify(value: LoxVal) -> str:
        if value is None:
            return 'nil'
        if isinstance(value, float):
            text = str(value)
            if text.endswith('.0'):
                text = text[:-2]
            return text
        if isinstance(value, bool):
            return str(value).lower()
        return str(value)
