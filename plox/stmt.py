from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Any, List, Optional
    import expr as ex
    from tokens import Token


class Stmt(abc.ABC):
    @abc.abstractmethod
    def accept(self, visitor: StmtVisitor) -> Any:
        ...


class StmtVisitor(abc.ABC):
    @abc.abstractmethod
    def visit_block_stmt(self, stmt: Block) -> Any:
        ...

    @abc.abstractmethod
    def visit_expr_stmt(self, stmt: Expr) -> Any:
        ...

    @abc.abstractmethod
    def visit_print_stmt(self, stmt: Print) -> Any:
        ...

    @abc.abstractmethod
    def visit_var_stmt(self, stmt: Var) -> Any:
        ...


@dataclass(frozen=True)
class Block(Stmt):
    stmts: List[Stmt]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_block_stmt(self)


@dataclass(frozen=True)
class Expr(Stmt):
    expr: ex.Expr

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_expr_stmt(self)


@dataclass(frozen=True)
class Print(Stmt):
    expr: ex.Expr

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_print_stmt(self)


@dataclass(frozen=True)
class Var(Stmt):
    name: Token
    initializer: Optional[ex.Expr]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_var_stmt(self)
