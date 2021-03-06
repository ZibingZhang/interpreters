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
 * An expression.
 */
export interface Expr extends StmtToVisit {}

/**
 * A visitor for the Stmt interface.
 */
export interface StmtVisitor {
  visitAndExpression(expr: AndExpression): any;
  visitCall(expr: Call): any;
  visitCondExpression(expr: CondExpression): any;
  visitDefineStructure(expr: DefineStructure): any;
  visitDefineVariable(expr: DefineVariable): any;
  visitIdentifier(expr: Identifier): any;
  visitIfExpression(expr: IfExpression): any;
  visitLambdaExpression(expr: LambdaExpression): any;
  visitLiteral(expr: Literal): any;
  visitOrExpression(expr: OrExpression): any;
  visitQuoted(expr: Quoted): any;
  visitTestCase(expr: TestCase): any;
}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Concrete Classes
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * An and expression.
 */
export class AndExpression implements StmtToVisit {
  readonly expressions: StmtToVisit[];

  constructor(exprs: StmtToVisit[]) {
    this.expressions = exprs;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitAndExpression(this);
  }
}

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
 * A cond expression.
 */
export class CondExpression implements StmtToVisit {
  readonly clauses: [StmtToVisit, StmtToVisit][];

  constructor(clauses: [StmtToVisit, StmtToVisit][]) {
    this.clauses = clauses;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitCondExpression(this);
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
 * An if expression.
 */
export class IfExpression implements StmtToVisit {
  readonly predicate: Expr;
  readonly ifTrue: Expr;
  readonly ifFalse: Expr;

  constructor(predicate: Expr, ifTrue: Expr, ifFalse: Expr) {
    this.predicate = predicate;
    this.ifTrue = ifTrue;
    this.ifFalse = ifFalse;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitIfExpression(this);
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
 * An and expression.
 */
export class OrExpression implements StmtToVisit {
  readonly expressions: StmtToVisit[];

  constructor(exprs: StmtToVisit[]) {
    this.expressions = exprs;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitOrExpression(this);
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

/**
 * A test case.
 */
export class TestCase implements StmtToVisit {
  readonly actual: Expr;
  readonly expected: Expr

  constructor(actual: Expr, expected: Expr) {
    this.actual = actual;
    this.expected = expected;
  }

  accept(visitor: StmtVisitor): any {
    return visitor.visitTestCase(this);
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
