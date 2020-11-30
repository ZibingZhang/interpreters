import * as ir1 from './ir1.js';
import interpreter from './interpreter.js';
import { Token, TokenType } from './tokens.js';

class Parser {
  private static ParserError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  current: number = 0;
  tokens: Token[] = [];

  parse(tokens: Token[]): ir1.Expr[] {
    this.current = 0;
    this.tokens = tokens;
    let exprs: ir1.Expr[] = [];

    try {
      while (!this.isAtEnd()) {
        exprs.push(this.expr());
      }
    } catch (err) {
      if (err instanceof Parser.ParserError) {
        this.error(err.msg);
      } else {
        throw err;
      }
    }

    return [];
  }

  private error(msg: string): void {
    interpreter.error(`read-syntax: ${msg}`);
  }

  //

  private call(): ir1.Call {
    let args: ir1.Expr[] = [];
    while (this.peek().type !== TokenType.RIGHT_PAREN) {
      if (this.isAtEnd()) throw new Parser.ParserError('expected a `)` to close `(`');
      args.push(this.expr())
    }

    let call;
    if (args.length === 0) call = new ir1.Call(undefined, []);
    else call = new ir1.Call(args[0], args.splice(1));
    this.consume(TokenType.RIGHT_PAREN, 'expected a `)` to close `(`');
    return call;
  }

  private expr(): ir1.Expr {
    if (this.match(TokenType.NAME)) {
      return this.variable();
    } else if (this.match(TokenType.NUMBER)) {
      return this.number();
    } else if (this.match(TokenType.LEFT_PAREN)) {
      return this.call();
    } else {
      throw Error('Unreachable code.');
    }
  }

  private number(): ir1.Literal {
    let value = this.previous().value;
    if (value === undefined) throw Error('Unreachable code.');
    return new ir1.Literal(value);
  }

  private variable(): ir1.Variable {
    let token = this.previous();
    return new ir1.Variable(token)
  }

  //

  private advance(): void {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private consume(type: TokenType, msg: string): void {
    if (this.peek().type !== type) throw new Parser.ParserError(msg);
    this.advance();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

export default new Parser();
