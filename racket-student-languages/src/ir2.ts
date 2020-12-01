import { RacketValue } from './values.js';
import { Token } from './tokens.js'

export interface Expr {
  accept(visitor: ExprVisitor): any;
}

export interface ExprVisitor {
  visitCall(expr: Call): any;
  visitLiteral(expr: Literal): any;
  visitVariable(expr: Variable): any;
}

export class Call implements Expr {
  callee: Expr;
  args: Expr[]

  constructor(callee: Expr, args: Expr[]) {
    this.callee = callee;
    this.args = args;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitCall(this);
  }
}

export class Literal implements Expr {
  value: RacketValue

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLiteral(this);
  }
}

export class Variable implements Expr {
  name: Token

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitVariable(this);
  }
}
