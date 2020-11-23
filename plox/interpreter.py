from __future__ import annotations
from typing import TYPE_CHECKING, Any
import lox
from environment import Environment
from exceptions import Break, Continue, Return, RuntimeException
import expr as ex
import natives
import stmt as st
from callable import Callable, LoxFunction
from expr import ExprVisitor
from stmt import StmtVisitor
from tokens import TokenType

if TYPE_CHECKING:
    from typing import List
    from tokens import Token
    from type import LoxValue


class Interpreter(ExprVisitor, StmtVisitor):
    def __init__(self):
        self._GLOBALS = Environment()
        self._environment = Environment(self._GLOBALS)

        self._GLOBALS.define('clock', natives.Clock())
        self._GLOBALS.define('print', natives.Print())
        self._GLOBALS.define('println', natives.PrintLn())

    def visit_assign_expr(self, expr: ex.Assign) -> Any:
        value = self._evaluate(expr.value)
        self._environment.assign(expr.name, value)
        return value

    def visit_binary_expr(self, expr: ex.Binary) -> LoxValue:
        left = self._evaluate(expr.left)
        right = self._evaluate(expr.right)

        if expr.operator.type is TokenType.BANG_EQUAL:
            return not self._is_equal(left, right)
        if expr.operator.type is TokenType.EQUAL_EQUAL:
            return self._is_equal(left, right)
        if expr.operator.type is TokenType.GREATER:
            self._check_number_operands(expr.operator, left, right)
            return left > right
        if expr.operator.type is TokenType.GREATER_EQUAL:
            self._check_number_operands(expr.operator, left, right)
            return left >= right
        if expr.operator.type is TokenType.LESS:
            self._check_number_operands(expr.operator, left, right)
            return left < right
        if expr.operator.type is TokenType.LESS_EQUAL:
            self._check_number_operands(expr.operator, left, right)
            return left <= right
        if expr.operator.type is TokenType.MINUS:
            self._check_number_operands(expr.operator, left, right)
            return left - right
        if expr.operator.type is TokenType.SLASH:
            self._check_number_operands(expr.operator, left, right)
            self._check_denominator(expr.operator, right)
            return left / right
        if expr.operator.type is TokenType.STAR:
            self._check_number_operands(expr.operator, left, right)
            return left * right
        if expr.operator.type is TokenType.PLUS:
            if isinstance(left, float) and isinstance(right, float):
                return left + right
            if isinstance(left, str) or isinstance(right, str):
                return self.stringify(left) + self.stringify(right)
            raise RuntimeException(expr.operator, 'Incompatible operands.')
        if expr.operator.type is TokenType.COMMA:
            self._evaluate(expr.left)
            return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_call_expr(self, expr: ex.Call) -> LoxValue:
        callee = self._evaluate(expr.callee)
        arguments = []
        for argument in expr.arguments:
            arguments.append(self._evaluate(argument))
        if not isinstance(callee, Callable):
            raise RuntimeException(expr.paren, 'Can only call functions and classes.')
        function = callee
        if len(arguments) != function.arity:
            raise RuntimeException(expr.paren, f'Expected {function.arity} arguments, but got {len(arguments)}.')
        return callee.call(self, arguments)

    def visit_function_expr(self, expr: ex.Function) -> LoxFunction:
        return LoxFunction(expr, self._environment)

    def visit_grouping_expr(self, expr: ex.Grouping) -> LoxValue:
        return self._evaluate(expr.expression)

    def visit_literal_expr(self, expr: ex.Literal) -> LoxValue:
        return expr.value

    def visit_logical_expr(self, expr: ex.Logical) -> LoxValue:
        left = self._evaluate(expr.left)

        if expr.operator.type is TokenType.OR and self._is_truthy(left):
            return left
        if expr.operator.type is TokenType.AND and not self._is_truthy(left):
            return left

        return self._evaluate(expr.right)

    def visit_ternary_expr(self, expr: ex.Ternary) -> LoxValue:
        if expr.operator1.type is TokenType.QUESTION and expr.operator2.type is TokenType.COLON:
            pred = self._evaluate(expr.left)
            if self._is_truthy(pred):
                return self._evaluate(expr.center)
            else:
                return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_unary_expr(self, expr: ex.Unary) -> LoxValue:
        right = self._evaluate(expr.right)
        if expr.op.type is TokenType.MINUS:
            self._check_number_operands(expr.op, right)
            return -right
        if expr.op.type is TokenType.BANG:
            return not self._is_truthy(right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_variable_expr(self, expr: ex.Variable) -> LoxValue:
        return self._environment.get(expr.name)

    def visit_block_stmt(self, stmt: st.Block) -> None:
        self.execute_block(stmt.stmts, Environment(self._environment))

    def visit_break_stmt(self, stmt: st.Break) -> Any:
        raise Break()

    def visit_continue_stmt(self, stmt: st.Continue) -> Any:
        raise Continue()

    def visit_expression_stmt(self, stmt: st.Expression) -> None:
        self._evaluate(stmt.expression)

    def visit_if_stmt(self, stmt: st.If) -> None:
        if self._is_truthy(self._evaluate(stmt.condition)):
            self._execute(stmt.then_branch)
        elif stmt.else_branch:
            self._execute(stmt.else_branch)

    def visit_return_stmt(self, stmt: st.Return) -> None:
        raise Return(None if stmt.expression is None else self._evaluate(stmt.expression))

    def visit_var_stmt(self, stmt: st.Var) -> None:
        value = None
        if stmt.initializer is not None:
            value = self._evaluate(stmt.initializer)
        self._environment.initialize(stmt.name, value)

    def visit_while_stmt(self, stmt: st.While) -> None:
        while self._is_truthy(self._evaluate(stmt.condition)):
            try:
                self._execute(stmt.body)
            except Break:
                break
            except Continue:
                continue

    def interpret(self, stmts: List[st.Stmt]) -> None:
        try:
            for stmt in stmts:
                self._execute(stmt)
        except RuntimeException as e:
            lox.Lox.error_runtime(e)

    def execute_block(self, stmts: List[st.Stmt], env: Environment) -> None:
        prev = self._environment
        try:
            self._environment = env
            for stmt in stmts:
                self._execute(stmt)
        finally:
            self._environment = prev

    @staticmethod
    def stringify(value: LoxValue) -> str:
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

    def _execute(self, stmt: st.Stmt) -> None:
        stmt.accept(self)

    def _evaluate(self, expr: ex.Expr) -> LoxValue:
        return expr.accept(self)

    @staticmethod
    def _is_truthy(value: LoxValue) -> bool:
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        return True

    @staticmethod
    def _is_equal(a: LoxValue, b: LoxValue) -> bool:
        return a == b

    @staticmethod
    def _check_number_operands(operator: Token, *args: LoxValue) -> None:
        for operand in args:
            if not isinstance(operand, float):
                raise RuntimeException(operator, 'Operands must be numbers.')

    @staticmethod
    def _check_denominator(operator: Token, value: LoxValue) -> None:
        if value == 0:
            raise RuntimeException(operator, 'Division by zero.')
