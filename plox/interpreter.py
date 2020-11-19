import lox
from exceptions import RuntimeException
from expr import (
    Expr,
    ExprVisitor,
    BinaryExpr,
    GroupingExpr,
    LiteralExpr,
    TernaryExpr,
    UnaryExpr,
)
from tokens import Token, TokenType
from type import LoxVal


class Interpreter(ExprVisitor):
    def interpret(self, expr: Expr) -> None:
        try:
            value = self._evaluate(expr)
            print(self._stringify(value))
        except RuntimeException as e:
            lox.Lox.error_runtime(e)

    def visit_binary_expr(self, expr: BinaryExpr) -> LoxVal:
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

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_grouping_expr(self, expr: GroupingExpr) -> LoxVal:
        return self._evaluate(expr.expr)

    def visit_literal_expr(self, expr: LiteralExpr) -> LoxVal:
        return expr.value

    def visit_ternary_expr(self, expr: TernaryExpr) -> LoxVal:
        if expr.op1.type is TokenType.QUESTION and expr.op2.type is TokenType.COLON:
            pred = self._evaluate(expr.left)
            if self._is_truthy(pred):
                return self._evaluate(expr.center)
            else:
                return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_unary_expr(self, expr: UnaryExpr) -> LoxVal:
        right = self._evaluate(expr.right)
        if expr.op.type is TokenType.MINUS:
            self._check_number_operands(expr.op, right)
            return -right
        if expr.op.type is TokenType.BANG:
            return not self._is_truthy(right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def _evaluate(self, expr: Expr) -> LoxVal:
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
