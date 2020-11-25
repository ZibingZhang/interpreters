from __future__ import annotations
import abc
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Any, Dict, List, Optional
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
    def visit_break_stmt(self, stmt: Break) -> Any:
        ...

    @abc.abstractmethod
    def visit_continue_stmt(self, stmt: Continue) -> Any:
        ...

    @abc.abstractmethod
    def visit_expression_stmt(self, stmt: Expression) -> Any:
        ...

    @abc.abstractmethod
    def visit_function_stmt(self, stmt: Function) -> Any:
        ...

    @abc.abstractmethod
    def visit_if_stmt(self, stmt: If) -> Any:
        ...

    @abc.abstractmethod
    def visit_return_stmt(self, stmt: Return) -> Any:
        ...

    @abc.abstractmethod
    def visit_var_stmt(self, stmt: Var) -> Any:
        ...

    @abc.abstractmethod
    def visit_while_stmt(self, stmt: While) -> Any:
        ...


@dataclass(frozen=True)
class Block(Stmt):
    statements: List[Stmt]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_block_stmt(self)


@dataclass(frozen=True)
class Break(Stmt):
    keyword: Token

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_break_stmt(self)


@dataclass(frozen=True)
class Continue(Stmt):
    keyword: Token

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_continue_stmt(self)


@dataclass(frozen=True)
class Expression(Stmt):
    expression: ex.Expr

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_expression_stmt(self)


@dataclass(frozen=True)
class Function(Stmt):
    name: Token
    parameters: List[Token]
    body: List[Stmt]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_function_stmt(self)


@dataclass(frozen=True)
class If(Stmt):
    condition: ex.Expr
    then_branch: Stmt
    else_branch: Optional[Stmt]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_if_stmt(self)


@dataclass(frozen=True)
class Return(Stmt):
    keyword: Token
    value: ex.Expr

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_return_stmt(self)


@dataclass(frozen=True)
class Var(Stmt):
    name: Token
    initializer: Optional[ex.Expr]

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_var_stmt(self)


@dataclass(frozen=True)
class While(Stmt):
    condition: ex.Expr
    body: Stmt

    def accept(self, visitor: StmtVisitor) -> Any:
        return visitor.visit_while_stmt(self)
