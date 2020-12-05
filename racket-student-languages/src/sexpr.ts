import { Token } from "./tokens";

export interface SExpr {
  accept(visitor: SExprVisitor): any;
}

export interface SExprVisitor {
  visitSExprList(sexpr: SExprList): any;
  visitSExprLiteral(sexpr: SExprLiteral): any;
  visitSExprSymbol(sexpr: SExprSymbol): any;
}

export class SExprList implements SExpr {
  readonly elements: SExpr[];

  constructor(elements: SExpr[]) {
    this.elements = elements;
  }

  toString(): string {
    let strings: string[] = [];
    for (let element of this.elements) strings.push(element.toString());
    return `(${strings.join(' ')})`;
  }

  accept(visitor: SExprVisitor): any {
    return visitor.visitSExprList(this);
  }
}

export class SExprLiteral implements SExpr {
  readonly token: Token;
  
  constructor(token: Token) {
    this.token = token;
  }

  toString(): string {
    let value = this.token.value;
    if (value === undefined) throw new Error('Unreachable code.');
    return value.toString();
  }

  accept(visitor: SExprVisitor): any {
    return visitor.visitSExprLiteral(this);
  }
}

export class SExprSymbol implements SExpr {
  readonly token: Token;

  constructor(token: Token) {
    this.token = token;
  }

  toString(): string {
    return this.token.lexeme;
  }

  accept(visitor: SExprVisitor) {
    return visitor.visitSExprSymbol(this);
  }
}
