import { RacketValue } from './values.js';
import { Token } from './tokens.js'

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * A statement.
 */
export interface Stmt {
  accept(visitor: StmtVisitor): any;
}

/**
 * A visitor for the Stmt interface.
 */
export interface StmtVisitor {
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
export class Group implements Stmt {
  readonly elements: Stmt[];

  constructor(elements: Stmt[]) {
    this.elements = elements;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitGroup(this);
  }
}

/**
 * An identifier, i.e. name.
 */
export class Identifier implements Stmt {
  readonly name: Token;

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

/**
 * An identifier that happens to be a keyword.
 */
export class Keyword implements Stmt {
  token: Token;

  constructor(token: Token) {
    this.token = token;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitKeyword(this);
  }
}

/**
 * A literal value, i.e. boolean, number, string.
 */
export class Literal implements Stmt {
  readonly value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitLiteral(this);
  }
}
