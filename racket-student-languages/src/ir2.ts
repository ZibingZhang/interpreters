import { RacketValue } from './values.js';
import { Token } from './tokens.js'

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

 /**
  * An expression, but more refined.
  */
export interface Expr {}

/**
  * An expression that will be visited.
  */
export interface ExprToVisit extends Expr {
  accept(visitor: ExprVisitor): any;
}

/**
 * A visitor for the Expr interface.
 */
export interface ExprVisitor {
  visitCall(expr: Call): any;
  visitDefineStructure(expr: DefineStructure): any;
  visitDefineVariable(expr: DefineVariable): any;
  visitLambdaExpression(expr: LambdaExpression): any;
  visitLiteral(expr: Literal): any;
  visitIdentifier(expr: Identifier): any;
  visitQuoted(expr: Quoted): any;
}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Concrete Classes
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

 /**
  * A function call.
  */
export class Call implements ExprToVisit {
  readonly callee: ExprToVisit;
  readonly arguments: ExprToVisit[];

  constructor(callee: ExprToVisit, args: ExprToVisit[]) {
    this.callee = callee;
    this.arguments = args;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitCall(this);
  }
}

/**
 * A structure definition.
 */
export class DefineStructure implements ExprToVisit {
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

/**
 * A variable definition.
 */
export class DefineVariable implements ExprToVisit {
  readonly identifier: Identifier;
  readonly expression: ExprToVisit;

  constructor(identifier: Identifier, expr: ExprToVisit) { 
    this.identifier = identifier;
    this.expression = expr;
   }

  accept(visitor: ExprVisitor): any {
    return visitor.visitDefineVariable(this);
  }
}

/**
 * An identifier.
 */
export class Identifier implements ExprToVisit {
  readonly name: Token

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

/**
 * A lambda expression.
 */
export class LambdaExpression implements ExprToVisit {
  readonly names: Token[];
  readonly body: ExprToVisit;

  constructor(names: Token[], body: ExprToVisit) {
    this.names = names;
    this.body = body;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLambdaExpression(this);
  }
}

/**
 * A literal value, i.e. boolean, number, string.
 */
export class Literal implements ExprToVisit {
  readonly value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLiteral(this);
  }
}

/**
 * A quoted value, e.g. symbol or list.
 */
export class Quoted implements ExprToVisit {
  readonly expression: Group | Identifier;

  constructor(expr: Group | Identifier) {
    this.expression = expr;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitQuoted(this);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Not Visited
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
 * A group for `quote`.
 */

export class Group implements Expr {
  readonly elements: Expr[];

  constructor(exprs: Expr[]) {
    this.elements = exprs;
  }
}
