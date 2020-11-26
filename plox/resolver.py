from __future__ import annotations
from enum import Enum
from functools import singledispatchmethod
from typing import TYPE_CHECKING, Any
import expr as ex
import lox
import stmt as st
from expr import ExprVisitor, Get, Set, This, Super
from interpreter import Interpreter
from stmt import StmtVisitor, Function, Class

if TYPE_CHECKING:
    from typing import List, Union
    from tokens import Token


class Resolver(ExprVisitor, StmtVisitor):
    def __init__(self, interpreter: Interpreter):
        self._interpreter = interpreter
        self._scopes = []
        self._loop_depth = 0
        self._current_function = _FunctionType.NONE
        self._current_class = _ClassType.NONE

    def visit_assign_expr(self, expr: ex.Assign) -> None:
        self.resolve(expr.value)
        self._resolve_local(expr, expr.name)

    def visit_binary_expr(self, expr: ex.Binary) -> None:
        self.resolve(expr.left)
        self.resolve(expr.right)

    def visit_call_expr(self, expr: ex.Call) -> None:
        self.resolve(expr.callee)
        for arg in expr.arguments:
            self.resolve(arg)

    def visit_get_expr(self, expr: Get) -> None:
        self.resolve(expr.object)

    def visit_grouping_expr(self, expr: ex.Grouping) -> None:
        self.resolve(expr.expression)

    def visit_literal_expr(self, expr: ex.Literal) -> None:
        pass

    def visit_logical_expr(self, expr: ex.Logical) -> None:
        self.resolve(expr.left)
        self.resolve(expr.right)

    def visit_set_expr(self, expr: Set) -> Any:
        self.resolve(expr.object)
        self.resolve(expr.value)

    def visit_super_expr(self, expr: Super) -> Any:
        if self._current_class is _ClassType.NONE:
            lox.Lox.error_token(expr.keyword, "Can't use 'super' outside of a class.")
        elif self._current_class is not _ClassType.SUBCLASS:
            lox.Lox.error_token(expr.keyword, "Can't use 'super' in a class with no superclass.")
        self._resolve_local(expr, expr.keyword)

    def visit_ternary_expr(self, expr: ex.Ternary) -> None:
        self.resolve(expr.left)
        self.resolve(expr.center)
        self.resolve(expr.right)

    def visit_this_expr(self, expr: This) -> None:
        if self._current_class == _ClassType.NONE:
            lox.Lox.error_token(expr.keyword, "Can't use 'this' outside of a class.")
            return
        self._resolve_local(expr, expr.keyword)

    def visit_unary_expr(self, expr: ex.Unary) -> None:
        self.resolve(expr.right)

    def visit_variable_expr(self, expr: ex.Variable) -> None:
        # if len(self._scopes) > 0 and self._scopes[-1].get(expr.name.lexeme) is False:
        #     lox.Lox.error_token(expr.name, "Can't read local variable in its own initializer.")
        self._resolve_local(expr, expr.name)

    def visit_block_stmt(self, stmt: st.Block) -> None:
        self._begin_scope()
        self.resolve(stmt.statements)
        self._end_scope()

    def visit_break_stmt(self, stmt: st.Break) -> None:
        if self._loop_depth == 0:
            lox.Lox.error_token(stmt.keyword, "Can't break from outside of loop.")

    def visit_class_stmt(self, stmt: Class) -> None:
        enclosing_class = self._current_class
        self._current_class = _ClassType.CLASS
        self._declare(stmt.name)
        self._define(stmt.name)
        if stmt.superclass is not None and stmt.name.lexeme == stmt.superclass.name.lexeme:
            lox.Lox.error_token(stmt.superclass.name, "A class can't inherit from itself.")
        if stmt.superclass is not None:
            self._current_class = _ClassType.SUBCLASS
            self.resolve(stmt.superclass)
            self._begin_scope()
            self._scopes[-1]['super'] = True
        self._begin_scope()
        self._scopes[-1]['this'] = True
        for method in stmt.methods:
            declaration = _FunctionType.METHOD
            if method.name.lexeme == 'init':
                declaration = _FunctionType.INITIALIZER
            self._resolve_function(method, declaration)
        self._end_scope()
        if stmt.superclass is not None:
            self._end_scope()
        self._current_class = enclosing_class

    def visit_continue_stmt(self, stmt: st.Continue) -> None:
        if self._loop_depth == 0:
            lox.Lox.error_token(stmt.keyword, "Can't continue from outside of loop.")

    def visit_expression_stmt(self, stmt: st.Expression) -> None:
        self.resolve(stmt.expression)

    def visit_function_stmt(self, stmt: Function) -> None:
        self._declare(stmt.name)
        self._define(stmt.name)
        self._resolve_function(stmt, _FunctionType.FUNCTION)

    def visit_if_stmt(self, stmt: st.If) -> None:
        self.resolve(stmt.condition)
        self.resolve(stmt.then_branch)
        if stmt.else_branch is not None:
            self.resolve(stmt.else_branch)

    def visit_return_stmt(self, stmt: st.Return) -> None:
        if self._current_function not in {_FunctionType.FUNCTION, _FunctionType.METHOD}:
            lox.Lox.error_token(stmt.keyword, "Can't return from top-level code.")
        if stmt.value is not None:
            if self._current_function is _FunctionType.INITIALIZER:
                lox.Lox.error_token(stmt.keyword, "Can't return a value from an initializer.")
            self.resolve(stmt.value)

    def visit_var_stmt(self, stmt: st.Var) -> None:
        self._declare(stmt.name)
        if stmt.initializer is not None:
            self.resolve(stmt.initializer)
            self._define(stmt.name)

    def visit_while_stmt(self, stmt: st.While) -> None:
        self._loop_depth += 1
        self.resolve(stmt.condition)
        self.resolve(stmt.body)
        self._loop_depth -= 1

    @singledispatchmethod
    def resolve(self, stmts: Union[st.Stmt, ex.Expr, List[st.Stmt]]) -> None:
        for stmt in stmts:
            self.resolve(stmt)

    @resolve.register
    def _(self, stmt: st.Stmt) -> None:
        stmt.accept(self)

    @resolve.register
    def _(self, expr: ex.Expr) -> None:
        expr.accept(self)

    def _begin_scope(self) -> None:
        self._scopes.append({})

    def _end_scope(self) -> None:
        self._scopes.pop()

    def _resolve_function(self, func: st.Function, func_type: _FunctionType) -> None:
        enclosing_function = self._current_function
        enclosing_loop_depth = self._loop_depth
        self._current_function = func_type
        self._loop_depth = 0
        self._begin_scope()
        for param in func.parameters:
            self._declare(param)
            self._define(param)
        self._begin_scope()
        self.resolve(func.body)
        self._end_scope()
        self._end_scope()
        self._current_function = enclosing_function
        self._loop_depth = enclosing_loop_depth

    def _resolve_local(self, expr: ex.Expr, name: Token) -> None:
        for idx, scope in enumerate(reversed(self._scopes)):
            if name.lexeme in scope:
                self._interpreter.resolve(expr, idx)
                return

    def _declare(self, name: Token) -> None:
        if len(self._scopes) == 0:
            return
        if name.lexeme in self._scopes[-1]:
            lox.Lox.error_token(name, 'Already variable with this name in this scope.')
        self._scopes[-1][name.lexeme] = False

    def _define(self, name: Token) -> None:
        if len(self._scopes) == 0:
            return
        self._scopes[-1][name.lexeme] = True


class _FunctionType(Enum):
    NONE        = 0
    FUNCTION    = 1
    INITIALIZER = 2
    METHOD      = 3


class _ClassType(Enum):
    NONE     = 0
    CLASS    = 1
    SUBCLASS = 2
