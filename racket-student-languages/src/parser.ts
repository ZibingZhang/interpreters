import * as ir1 from './ir1.js';
import { Token, TokenType } from './tokens.js';
import racket from './racket.js';
import { 
  SExpr,
  SExprList,
  SExprLiteral,
  SExprSymbol
} from './sexpr.js';

class TokenParser {
  private static TokenParserError = class extends Error {
    readonly msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  current: number = 0;
  tokens: Token[] = [];

  parse(tokens: Token[]): SExpr[] {
    this.current = 0;
    this.tokens = tokens;
    let sexprs: SExpr[] = [];

    try {
      while (!this.isAtEnd()) {
        sexprs.push(this.expr());
      }
    } catch (err) {
      if (err instanceof TokenParser.TokenParserError) {
        racket.error(err.msg);
      } else {
        throw err;
      }
    }
    return sexprs;
  }

  //

  private expr(): SExpr {
    if (this.match(TokenType.DEFINE, TokenType.DEFINE_STRUCT, TokenType.IDENTIFIER, TokenType.LAMBDA)) {
      return this.symbol();
    } else if (this.match(TokenType.BOOLEAN, TokenType.NUMBER, TokenType.STRING)) {
      return this.literal();
    } else if (this.match(TokenType.LEFT_PAREN)) {
      return this.list();
    } else if (this.match(TokenType.RIGHT_PAREN)) {
      throw new TokenParser.TokenParserError('unexpected `)`');
    } else {
      throw new Error('Unreachable code.');
    }
  }

  private list(): SExprList {
    let elements: SExpr[] = [];
    while (this.peek().type !== TokenType.RIGHT_PAREN) {
      if (this.isAtEnd()) throw new TokenParser.TokenParserError('expected a `)` to close `(`');
      elements.push(this.expr());
    }
    this.advance();
    return new SExprList(elements);
  }

  private literal(): SExprLiteral {
    return new SExprLiteral(this.previous());
  }

  private symbol(): SExprSymbol {
    return new SExprSymbol(this.previous());
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

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private match(...types: TokenType[]): boolean {
    for (let type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
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

class Parser {
  tokenParser: TokenParser = new TokenParser();

  parse(tokens: Token[]): ir1.Expr[] {
    let sexprs = this.tokenParser.parse(tokens);

    let exprs: ir1.Expr[] = [];
    for (let sexpr of sexprs) {
      exprs.push(this.expr(sexpr));
    }
    return exprs;
  }

  //

  private expr(sexpr: SExpr): ir1.Expr {
    if (sexpr instanceof SExprList) {
      return this.group(sexpr);
    } else if (sexpr instanceof SExprLiteral) {
      return this.literal(sexpr);
    } else if (sexpr instanceof SExprSymbol) {
      return this.symbol(sexpr);
    } else {
      throw new Error('Unreachable code.');
    }
  }

  private group(sexpr: SExprList): ir1.Group {
    let elements = sexpr.elements;
    if (elements.length === 0) return new ir1.Group([]);
    return new ir1.Group(elements.map(this.expr.bind(this)));
  }

  private literal(sexpr: SExprLiteral): ir1.Literal {
    if (sexpr.token.value === undefined) throw new Error('Unreachable code.');
    return new ir1.Literal(sexpr.token.value);
  }

  private symbol(sexpr: SExprSymbol): ir1.Identifier | ir1.Keyword {
    if ([TokenType.DEFINE, TokenType.DEFINE_STRUCT, TokenType.LAMBDA].includes(sexpr.token.type)) {
      return new ir1.Keyword(sexpr.token);
    } else {
      return new ir1.Identifier(sexpr.token);
    }
  }
}

export default new Parser();
