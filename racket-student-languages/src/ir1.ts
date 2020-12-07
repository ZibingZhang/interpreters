import { RacketValue } from './values.js';
import { Token } from './tokens.js'

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * An expression.
 */
export interface Expr {
  accept(visitor: ExprVisitor): any;
}

/**
 * A visitor for the Expr interface.
 */
export interface ExprVisitor {
  visitGroup(expr: Group): any;
  visitIdentifier(expr: Identifier): any;
  visitKeyword(expr: Keyword): any;
  visitLiteral(expr: Literal): any;
}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Concrete Classes
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * Any grouping of sub-expressions denoted using parentheses.
 */
export class Group implements Expr {
  readonly elements: Expr[];

  constructor(elements: Expr[]) {
    this.elements = elements;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitGroup(this);
  }
}

/**
 * An identifier, i.e. name.
 */
export class Identifier implements Expr {
  readonly name: Token;

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

/**
 * An identifier that happens to be a keyword.
 */
export class Keyword implements Expr {
  token: Token;

  constructor(token: Token) {
    this.token = token;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitKeyword(this);
  }
}

/**
 * A literal value, i.e. boolean, number, string.
 */
export class Literal implements Expr {
  readonly value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: ExprVisitor): any {
    return visitor.visitLiteral(this);
  }
}
