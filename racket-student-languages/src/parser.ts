import * as ast from './ast.js';
import { Token, TokenType } from './tokens.js';
import racket from './racket.js';

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

  parse(tokens: Token[]): ast.Expr[] {
    this.current = 0;
    this.tokens = tokens;
    let exprs: ast.Expr[] = [];

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

    return exprs;
  }

  //

  private error(msg: string): void {
    racket.error(`read-syntax: ${msg}`);
  }

  //

  private expr(): ast.Expr {
    if (this.match(TokenType.DEFINE)) {
      return new ast.DefineKeyword();
    } else if (this.match(TokenType.IDENTIFIER)) {
      return this.identifier();
    } else if (this.match(TokenType.NUMBER)) {
      return this.number();
    } else if (this.match(TokenType.LEFT_PAREN)) {
      return this.group();
    } else if (this.match(TokenType.RIGHT_PAREN)) {
      throw new Parser.ParserError('unexpected `)`');
    } else {
      throw new Error('Unreachable code.');
    }
  }

  private call(): ast.Call {
    let args: ast.Expr[] = [];
    while (this.peek().type !== TokenType.RIGHT_PAREN) {
      if (this.isAtEnd()) throw new Parser.ParserError('expected a `)` to close `(`');
      args.push(this.expr())
    }
    this.advance();
    let call;
    if (args.length === 0) call = new ast.Call(undefined, []);
    else call = new ast.Call(args[0], args.splice(1));
    return call;
  }

  private defineVariable(): ast.DefineVariable {
    let args: ast.Expr[] = [];
    this.advance();
    while (this.peek().type !== TokenType.RIGHT_PAREN) {
      if (this.isAtEnd()) throw new Parser.ParserError('expected a `)` to close `(`');
      args.push(this.expr());
    }
    this.advance();
    return new ast.DefineVariable(args);
  }

  private group(): ast.Call | ast.DefineVariable {
    if (this.peek().type === TokenType.DEFINE) return this.defineVariable();
    else return this.call();
  }

  private identifier(): ast.Identifier {
    let token = this.previous();
    return new ast.Identifier(token)
  }

  private number(): ast.Literal {
    let value = this.previous().value;
    if (value === undefined) throw Error('Unreachable code.');
    return new ast.Literal(value);
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

  // private consume(type: TokenType, msg: string): void {
  //   if (this.peek().type !== type) throw new Parser.ParserError(msg);
  //   this.advance();
  // }

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
