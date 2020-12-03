import { RacketValue } from './values.js';
import { Token } from './tokens.js'

export interface Expr {
  accept(visitor: ExprVisitor): any;
}

export interface ExprVisitor {
  visitDefineKeyword(expr: DefineKeyword): any;
  visitGroup(expr: Group): any;
  visitIdentifier(expr: Identifier): any;
  visitLambdaKeyword(expr: LambdaKeyword): any;
  visitLiteral(expr: Literal): any;
}

export class DefineKeyword implements Expr {
  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineKeyword(this);
  }
}

export class Group implements Expr {
  elements: Expr[];

  constructor(elements: Expr[]) {
    this.elements = elements;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitGroup(this);
  }
}

export class Identifier implements Expr {
  name: Token;

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

export class LambdaKeyword implements Expr {
  accept(visitor: ExprVisitor): any {
    return visitor.visitLambdaKeyword(this);
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
