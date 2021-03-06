from __future__ import annotations
from typing import TYPE_CHECKING, Any
import lox
from environment import Environment
from exceptions import Break, Continue, Return, RuntimeException
import expr as ex
import natives
import stmt as st
from callable import LoxCallable, LoxFunction
from classes import LoxClass, LoxInstance
from expr import ExprVisitor, Get, Set, This, Super
from stmt import StmtVisitor, Class
from tokens import TokenType

if TYPE_CHECKING:
    from typing import List
    from tokens import Token
    from type import LoxValue


class Interpreter(ExprVisitor, StmtVisitor):
    def __init__(self):
        self._GLOBALS = Environment()
        self._environment = self._GLOBALS
        self._locals = {}

        self._GLOBALS.define('clock', natives.Clock())
        self._GLOBALS.define('print', natives.Print())
        self._GLOBALS.define('println', natives.PrintLn())

    def visit_assign_expr(self, expr: ex.Assign) -> LoxValue:
        value = self._evaluate(expr.value)
        distance = self._locals.get(expr)
        if distance is None:
            self._GLOBALS.assign(expr.name, value)
        else:
            self._environment.assign_at(distance, expr.name, value)
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
        if not isinstance(callee, LoxCallable):
            raise RuntimeException(expr.paren, 'Can only call functions and classes.')
        function = callee
        if len(arguments) != function.arity:
            raise RuntimeException(expr.paren, f'Expected {function.arity} arguments, but got {len(arguments)}.')
        return callee.call(self, arguments)

    def visit_get_expr(self, expr: Get) -> LoxValue:
        obj = self._evaluate(expr.object)
        if isinstance(obj, LoxInstance):
            return obj.get(expr.name)
        raise RuntimeException(expr.name, 'Only instances have properties')

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

    def visit_set_expr(self, expr: Set) -> LoxValue:
        obj = self._evaluate(expr.object)
        if not isinstance(obj, LoxInstance):
            raise RuntimeException(expr.name, 'Only instances have fields.')
        value = self._evaluate(expr.value)
        obj.set(expr.name, value)
        return value

    def visit_super_expr(self, expr: Super) -> Any:
        distance = self._locals[expr]
        superclass = self._environment.get_at(distance, 'super')
        obj = self._environment.get_at(distance - 1, 'this')
        if not isinstance(superclass, LoxClass):
            # unreachable
            raise RuntimeError('Unreachable code.')
        method = superclass.find_method(expr.method.lexeme)
        if method is None:
            raise RuntimeException(expr.method, f"Undefined property '{expr.method.lexeme}'.")
        return method.bind(obj)

    def visit_ternary_expr(self, expr: ex.Ternary) -> LoxValue:
        if expr.operator1.type is TokenType.QUESTION and expr.operator2.type is TokenType.COLON:
            pred = self._evaluate(expr.left)
            if self._is_truthy(pred):
                return self._evaluate(expr.center)
            else:
                return self._evaluate(expr.right)

        # unreachable
        raise RuntimeError('Unreachable code.')

    def visit_this_expr(self, expr: This) -> Any:
        return self._lookup_variable(expr.keyword, expr)

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
        return self._lookup_variable(expr.name, expr)

    def visit_block_stmt(self, stmt: st.Block) -> None:
        self.execute_block(stmt.statements, Environment(self._environment))

    def visit_break_stmt(self, stmt: st.Break) -> None:
        raise Break()

    def visit_class_stmt(self, stmt: Class) -> None:
        superclass = None
        if stmt.superclass is not None:
            superclass = self._evaluate(stmt.superclass)
            if not isinstance(superclass, LoxClass):
                raise RuntimeException(stmt.superclass.name, 'Superclass must be a class.')
        self._environment.define(stmt.name.lexeme, None)
        if stmt.superclass is not None:
            self._environment = Environment(self._environment)
            self._environment.define('super', superclass)
        methods = {}
        for method in stmt.methods:
            function = LoxFunction(method, self._environment, method.name.lexeme == 'init')
            methods[method.name.lexeme] = function
        klass = LoxClass(stmt.name.lexeme, superclass, methods)
        if superclass is not None:
            self._environment = self._environment.enclosing
        self._environment.assign(stmt.name, klass)

    def visit_continue_stmt(self, stmt: st.Continue) -> None:
        raise Continue()

    def visit_expression_stmt(self, stmt: st.Expression) -> None:
        self._evaluate(stmt.expression)

    def visit_function_stmt(self, stmt: st.Function) -> None:
        function = LoxFunction(stmt, self._environment, False)
        self._environment.define(stmt.name.lexeme, function)

    def visit_if_stmt(self, stmt: st.If) -> None:
        if self._is_truthy(self._evaluate(stmt.condition)):
            self._execute(stmt.then_branch)
        elif stmt.else_branch:
            self._execute(stmt.else_branch)

    def visit_return_stmt(self, stmt: st.Return) -> None:
        raise Return(None if stmt.value is None else self._evaluate(stmt.value))

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

    def resolve(self, expr: ex.Expr, depth: int) -> None:
        self._locals[expr] = depth

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

    def _lookup_variable(self, name: Token, expr: ex.Expr):
        distance = self._locals.get(expr)
        if distance is None:
            return self._GLOBALS.get(name)
        else:
            return self._environment.get_at(distance, name.lexeme)

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
