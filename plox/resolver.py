from __future__ import annotations
from enum import Enum
from functools import singledispatchmethod
from typing import TYPE_CHECKING
import expr as ex
import lox
import stmt as st
from expr import ExprVisitor
from interpreter import Interpreter
from stmt import StmtVisitor

if TYPE_CHECKING:
    from typing import List, Union
    from tokens import Token


class Resolver(ExprVisitor, StmtVisitor):
    def __init__(self, interpreter: Interpreter):
        self._interpreter = interpreter
        self._scopes = []
        self._current_function = _FunctionType.NONE
        self._loop_depth = 0

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

    def visit_function_expr(self, expr: ex.Function) -> None:
        enclosing_function = self._current_function
        enclosing_loop_depth = self._loop_depth
        self._current_function = _FunctionType.FUNCTION
        self._loop_depth = 0
        self._begin_scope()
        for param in expr.parameters:
            self._declare(param)
            self._define(param)
        self._begin_scope()
        self.resolve(expr.body)
        self._end_scope()
        self._end_scope()
        self._current_function = enclosing_function
        self._loop_depth = enclosing_loop_depth

    def visit_grouping_expr(self, expr: ex.Grouping) -> None:
        self.resolve(expr.expression)

    def visit_literal_expr(self, expr: ex.Literal) -> None:
        pass

    def visit_logical_expr(self, expr: ex.Logical) -> None:
        self.resolve(expr.left)
        self.resolve(expr.right)

    def visit_ternary_expr(self, expr: ex.Ternary) -> None:
        self.resolve(expr.left)
        self.resolve(expr.center)
        self.resolve(expr.right)

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

    def visit_continue_stmt(self, stmt: st.Continue) -> None:
        if self._loop_depth == 0:
            lox.Lox.error_token(stmt.keyword, "Can't continue from outside of loop.")

    def visit_expression_stmt(self, stmt: st.Expression) -> None:
        self.resolve(stmt.expression)

    def visit_if_stmt(self, stmt: st.If) -> None:
        self.resolve(stmt.condition)
        self.resolve(stmt.then_branch)
        if stmt.else_branch is not None:
            self.resolve(stmt.else_branch)

    def visit_return_stmt(self, stmt: st.Return) -> None:
        if self._current_function is not _FunctionType.FUNCTION:
            lox.Lox.error_token(stmt.keyword, "Can't return from top-level code.")
        if stmt.value is not None:
            self.resolve(stmt.value)

    def visit_var_stmt(self, stmt: st.Var) -> None:
        self._declare(stmt.name)
        if stmt.initializer is not None:
            if isinstance(stmt.initializer, ex.Function):
                self._define(stmt.name)
                self.resolve(stmt.initializer)
            else:
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

    def _resolve_local(self, expr: ex.Expr, name: Token):
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
    NONE     = 0
    FUNCTION = 1
