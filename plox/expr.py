from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tokens import Token
    from type import Literal
    from typing import Any


class Expr(abc.ABC):
    @abc.abstractmethod
    def accept(self, visitor: ExprVisitor) -> Any:
        ...


class ExprVisitor(abc.ABC):
    @abc.abstractmethod
    def visit_assign_expr(self, expr: Assign) -> Any:
        ...

    @abc.abstractmethod
    def visit_binary_expr(self, expr: Binary) -> Any:
        ...

    @abc.abstractmethod
    def visit_grouping_expr(self, expr: Grouping) -> Any:
        ...

    @abc.abstractmethod
    def visit_literal_expr(self, expr: Literal) -> Any:
        ...

    @abc.abstractmethod
    def visit_logical_expr(self, expr: Logical) -> Any:
        ...

    @abc.abstractmethod
    def visit_ternary_expr(self, expr: Ternary) -> Any:
        ...

    @abc.abstractmethod
    def visit_unary_expr(self, expr: Unary) -> Any:
        ...

    @abc.abstractmethod
    def visit_variable_expr(self, expr: Variable) -> Any:
        ...


@dataclass(frozen=True)
class Assign(Expr):
    name: Token
    value: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_assign_expr(self)


@dataclass(frozen=True)
class Binary(Expr):
    left: Expr
    operator: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_binary_expr(self)


@dataclass(frozen=True)
class Grouping(Expr):
    expression: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_grouping_expr(self)


@dataclass(frozen=True)
class Literal(Expr):
    value: Literal

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_literal_expr(self)


@dataclass(frozen=True)
class Logical(Expr):
    left: Expr
    operator: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_logical_expr(self)


@dataclass(frozen=True)
class Ternary(Expr):
    left: Expr
    operator1: Token
    center: Expr
    operator2: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_ternary_expr(self)


@dataclass(frozen=True)
class Unary(Expr):
    op: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_unary_expr(self)


@dataclass(frozen=True)
class Variable(Expr):
    name: Token

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_variable_expr(self)


class ASTPrinter(ExprVisitor):
    def visit_binary_expr(self, expr: Binary):
        return self._parenthesize(expr.operator.lexeme, expr.left, expr.right)

    def visit_grouping_expr(self, expr: Grouping):
        return self._parenthesize('group', expr.expression)

    def visit_literal_expr(self, expr: Literal):
        if expr.value is None:
            return 'nil'
        return str(expr.value)

    def visit_ternary_expr(self, expr: Ternary) -> Any:
        return self._parenthesize(expr.operator1.lexeme + expr.operator2.lexeme, expr.left, expr.center, expr.right)

    def visit_unary_expr(self, expr: Unary):
        return self._parenthesize(expr.op.lexeme, expr.right)

    def _parenthesize(self, name: str, *args: Expr):
        return f'({name} {" ".join(map(lambda expr: expr.accept(self), args))})'
