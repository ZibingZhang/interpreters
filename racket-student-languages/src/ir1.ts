import { RacketValue } from './literals.js';
import { Token } from './tokens.js'

export interface Expr {}

export interface ExprVisitor {
  visitCall(): any;
  visitLiteral(): any;
  visitVariable(): any;
}

export class Call implements Expr {
  callee: Expr | undefined;
  args: Expr[]

  constructor(callee: Expr | undefined, args: Expr[]) {
    this.callee = callee;
    this.args = args;
  }
}

export class Literal implements Expr {
  value: RacketValue

  constructor(value: RacketValue) {
    this.value = value;
  }
}

export class Variable implements Expr {
  name: Token

  constructor(name: Token) {
    this.name = name;
  }
}
