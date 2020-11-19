from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any
from type import Literal

if TYPE_CHECKING:
    from tokens import Token


class Expr(abc.ABC):
    @abc.abstractmethod
    def accept(self, visitor: ExprVisitor) -> Any:
        ...


class ExprVisitor(abc.ABC):
    @abc.abstractmethod
    def visit_binary_expr(self, expr: BinaryExpr) -> Any:
        ...

    @abc.abstractmethod
    def visit_grouping_expr(self, expr: GroupingExpr) -> Any:
        ...

    @abc.abstractmethod
    def visit_literal_expr(self, expr: LiteralExpr) -> Any:
        ...

    @abc.abstractmethod
    def visit_ternary_expr(self, expr: TernaryExpr) -> Any:
        ...

    @abc.abstractmethod
    def visit_unary_expr(self, expr: UnaryExpr) -> Any:
        ...


@dataclass(frozen=True)
class BinaryExpr(Expr):
    left: Expr
    op: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_binary_expr(self)


@dataclass(frozen=True)
class GroupingExpr(Expr):
    expr: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_grouping_expr(self)


@dataclass(frozen=True)
class LiteralExpr(Expr):
    value: Literal

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_literal_expr(self)


@dataclass(frozen=True)
class TernaryExpr(Expr):
    left: Expr
    op1: Token
    center: Expr
    op2: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_ternary_expr(self)


@dataclass(frozen=True)
class UnaryExpr(Expr):
    op: Token
    right: Expr

    def accept(self, visitor: ExprVisitor) -> Any:
        return visitor.visit_unary_expr(self)


class ASTPrinter(ExprVisitor):
    def visit_binary_expr(self, expr: BinaryExpr):
        return self._parenthesize(expr.op.lexeme, expr.left, expr.right)

    def visit_grouping_expr(self, expr: GroupingExpr):
        return self._parenthesize('group', expr.expr)

    def visit_literal_expr(self, expr: LiteralExpr):
        if expr.value is None:
            return 'nil'
        return str(expr.value)

    def visit_ternary_expr(self, expr: TernaryExpr) -> Any:
        return self._parenthesize(expr.op1.lexeme + expr.op2.lexeme, expr.left, expr.center, expr.right)

    def visit_unary_expr(self, expr: UnaryExpr):
        return self._parenthesize(expr.op.lexeme, expr.right)

    def _parenthesize(self, name: str, *args: Expr):
        return f'({name} {" ".join(map(lambda expr: expr.accept(self), args))})'
