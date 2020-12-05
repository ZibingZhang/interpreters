import { RacketValue } from './values.js';
import { Token } from './tokens.js'

export interface Expr {
  accept(visitor: ExprVisitor): any;
}

export interface ExprVisitor {
  visitCall(expr: Call): any;
  visitDefineStructure(expr: DefineStructure): any;
  visitDefineVariable(expr: DefineVariable): any;
  visitLambdaExpression(expr: LambdaExpression): any;
  visitLiteral(expr: Literal): any;
  visitIdentifier(expr: Identifier): any;
}

export class Call implements Expr {
  readonly callee: Expr;
  readonly arguments: Expr[];

  constructor(callee: Expr, args: Expr[]) {
    this.callee = callee;
    this.arguments = args;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitCall(this);
  }
}

export class DefineStructure implements Expr {
  readonly name: string;
  readonly fields: string[];

  constructor(name: string, fields: string[]) {
    this.name = name;
    this.fields = fields;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineStructure(this);
  }
}

export class DefineVariable implements Expr {
  readonly identifier: Identifier;
  readonly expression: Expr;

  constructor(identifier: Identifier, expr: Expr) { 
    this.identifier = identifier;
    this.expression = expr;
   }

  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineVariable(this);
  }
}

export class Identifier implements Expr {
  readonly name: Token

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

export class LambdaExpression implements Expr {
  readonly names: Token[];
  readonly body: Expr;

  constructor(names: Token[], body: Expr) {
    this.names = names;
    this.body = body;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLambdaExpression(this);
  }
}

export class Literal implements Expr {
  readonly value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLiteral(this);
  }
}
