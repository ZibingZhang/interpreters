import { RacketValue } from './values.js';
import { Token } from './tokens.js'

export interface Expr {
  accept(visitor: ExprVisitor): any;
}

export interface ExprVisitor {
  visitCall(expr: Call): any;
  visitDefineKeyword(expr: DefineKeyword): any;
  visitDefineVariable(expr: DefineVariable): any;
  visitLiteral(expr: Literal): any;
  visitIdentifier(expr: Identifier): any;
}

export class Call implements Expr {
  callee: Expr | undefined;
  arguments: Expr[];

  constructor(callee: Expr | undefined, args: Expr[]) {
    this.callee = callee;
    this.arguments = args;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitCall(this);
  }
}

export class DefineKeyword implements Expr {
  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineKeyword(this);
  }
}

export class DefineVariable implements Expr {
  arguments: Expr[];

  constructor(args: Expr[]) { 
    this.arguments = args;
   }

  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineVariable(this);
  }
}

export class Identifier implements Expr {
  name: Token

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

export class Literal implements Expr {
  value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLiteral(this);
  }
}
