import { RacketValue } from './values.js';
import { Token } from './tokens.js'

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * A statement, but more refined.
 */
export interface Stmt {}

/**
  * A statement that will be visited.
  */
export interface StmtToVisit extends Stmt {
  accept(visitor: StmtVisitor): any;
}

/**
 * A visitor for the Stmt interface.
 */
export interface StmtVisitor {
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
export class Call implements StmtToVisit {
  readonly callee: StmtToVisit;
  readonly arguments: StmtToVisit[];

  constructor(callee: StmtToVisit, args: StmtToVisit[]) {
    this.callee = callee;
    this.arguments = args;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitCall(this);
  }
}

/**
 * A structure definition.
 */
export class DefineStructure implements StmtToVisit {
  readonly name: string;
  readonly fields: string[];

  constructor(name: string, fields: string[]) {
    this.name = name;
    this.fields = fields;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitDefineStructure(this);
  }
}

/**
 * A variable definition.
 */
export class DefineVariable implements StmtToVisit {
  readonly identifier: Identifier;
  readonly expression: StmtToVisit;

  constructor(identifier: Identifier, expr: StmtToVisit) { 
    this.identifier = identifier;
    this.expression = expr;
   }

  accept(visitor: StmtVisitor): any {
    return visitor.visitDefineVariable(this);
  }
}

/**
 * An identifier.
 */
export class Identifier implements StmtToVisit {
  readonly name: Token

  constructor(name: Token) {
    this.name = name;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitIdentifier(this);
  }
}

/**
 * A lambda expression.
 */
export class LambdaExpression implements StmtToVisit {
  readonly names: Token[];
  readonly body: StmtToVisit;

  constructor(names: Token[], body: StmtToVisit) {
    this.names = names;
    this.body = body;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitLambdaExpression(this);
  }
}

/**
 * A literal value, i.e. boolean, number, string.
 */
export class Literal implements StmtToVisit {
  readonly value: RacketValue;

  constructor(value: RacketValue) {
    this.value = value;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitLiteral(this);
  }
}

/**
 * A quoted value, e.g. symbol or list.
 */
export class Quoted implements StmtToVisit {
  readonly expression: Group | Identifier;

  constructor(expr: Group | Identifier) {
    this.expression = expr;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitQuoted(this);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Not Visited
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
 * A group for `quote`.
 */

export class Group implements Stmt {
  readonly elements: Stmt[];

  constructor(exprs: Stmt[]) {
    this.elements = exprs;
  }
}
