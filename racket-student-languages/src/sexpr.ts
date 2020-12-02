import { Token } from "./tokens";

export interface SExpr {
  accept(visitor: SExprVisitor): any;
}

export interface SExprVisitor {
  visitSExprList(sexpr: SExprList): any;
  visitSExprNumber(sexpr: SExprNumber): any;
  visitSExprSymbol(sexpr: SExprSymbol): any;
}

export class SExprList implements SExpr {
  elements: SExpr[];

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

export class SExprNumber implements SExpr {
  token: Token;
  
  constructor(token: Token) {
    this.token = token;
  }

  toString(): string {
    let number = this.token.value;
    if (number === undefined) throw new Error('Unreachable code.');
    return number.toString();
  }

  accept(visitor: SExprVisitor): any {
    return visitor.visitSExprNumber(this);
  }
}

export class SExprSymbol implements SExpr {
  token: Token;

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
