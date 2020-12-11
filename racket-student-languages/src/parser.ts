import * as ir1 from './ir1.js';
import { 
  KEYWORDS,
  Token, 
  TokenType 
} from './tokens.js';
import racket from './racket.js';
import { 
  SExpr,
  SExprList,
  SExprLiteral,
  SExprSymbol
} from './sexpr.js';
import { UnreachableCode } from './errors.js';

/**
 * A parser for transforming tokens into S-expressions.
 */
class TokenParser {
  private static TokenParserError = class extends Error {
    readonly msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private readonly braceMap = new Map<TokenType, TokenType>([
    [TokenType.OPEN, TokenType.CLOSE],
    [TokenType.OPEN_BRACE, TokenType.CLOSE_BRACE],
    [TokenType.OPEN_BRACKET, TokenType.CLOSE_BRACKET]
  ]);
  private openingStack: TokenType[] = [];

  private current: number = 0;
  private tokens: Token[] = [];

  /**
   * Produces an S-expression representation of the tokens.
   * @param tokens the token representation of the code
   */
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
        racket.error('read-syntax: ' + err.msg);
      } else {
        throw err;
      }
    }
    return sexprs;
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * S-expression Components
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private expr(): SExpr {
    if (this.match(TokenType.IDENTIFIER, ...KEYWORDS.values())) {
      return this.symbol();
    } else if (this.match(TokenType.BOOLEAN, TokenType.NUMBER, TokenType.STRING)) {
      return this.literal();
    } else if (this.match(TokenType.OPEN, TokenType.OPEN_BRACE, TokenType.OPEN_BRACKET)) {
      return this.list();
    } else if (this.match(TokenType.SINGLE_QUOTE)) {
      return this.quoted();
    } else if (this.match(TokenType.CLOSE, TokenType.CLOSE_BRACE, TokenType.CLOSE_BRACKET)) {
      if (this.openingStack.length === 0) {
        this.error(`unexpected \`${this.previous().type}\``);
      } else {
        let preceding = this.openingStack[0];
        let expected = this.braceMap.get(preceding);
        let actual = this.previous().type;
        this.error(`expected \`${expected}\` to close preceding \`${preceding}\`, but found instead \`${actual}\``);
      }
    } else {
      throw new UnreachableCode();
    }
  }

  private list(): SExprList {
    let opening = this.previous().type;
    this.openingStack.unshift(opening);
    let closing = this.braceMap.get(opening);
    let elements: SExpr[] = [];
    while (this.peek().type !== closing) {
      if (this.isAtEnd()) {
        this.error(`expected a \`${closing}\` to close \`${opening}\``);
      }
      elements.push(this.expr());
    }
    this.openingStack.shift();
    this.advance();
    return new SExprList(elements);
  }

  private literal(): SExprLiteral {
    return new SExprLiteral(this.previous());
  }

  private quoted(): SExprList {
    if (this.isAtEnd()) {
      this.error('read-syntax: expected an element for quoting "\'", found end-of-file');
    }
    let elements: SExpr[] = [new SExprSymbol(new Token(TokenType.QUOTE, TokenType.QUOTE.valueOf()))];
    elements.push(this.expr());
    return new SExprList(elements);
  }

  private symbol(): SExprSymbol {
    return new SExprSymbol(this.previous());
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * General Parsing Helper Functions
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

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

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Error Handling
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private error(msg: string): never {
    throw new TokenParser.TokenParserError(msg);
  }
}

/**
 * A parser for transforming tokens into a slightly more useful intermediate
 * representations.
 */
class Parser {
  tokenParser: TokenParser = new TokenParser();

  /**
   * Produces an Intermediate Representation I representation of the tokens.
   * @param tokens the token representation of the code
   */
  parse(tokens: Token[]): ir1.Stmt[] {
    let sexprs = this.tokenParser.parse(tokens);

    let exprs: ir1.Stmt[] = [];
    for (let sexpr of sexprs) {
      exprs.push(this.expr(sexpr));
    }
    return exprs;
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Intermediate Representation I Forms
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private expr(sexpr: SExpr): ir1.Stmt {
    if (sexpr instanceof SExprList) {
      return this.group(sexpr);
    } else if (sexpr instanceof SExprLiteral) {
      return this.literal(sexpr);
    } else if (sexpr instanceof SExprSymbol) {
      return this.symbol(sexpr);
    } else {
      throw new UnreachableCode();
    }
  }

  private group(sexpr: SExprList): ir1.Group {
    let elements = sexpr.elements;
    if (elements.length === 0) {
      return new ir1.Group([]);
    }
    return new ir1.Group(elements.map(this.expr.bind(this)));
  }

  private literal(sexpr: SExprLiteral): ir1.Literal {
    if (sexpr.token.value === undefined) {
      throw new UnreachableCode();
    };
    return new ir1.Literal(sexpr.token.value);
  }

  private symbol(sexpr: SExprSymbol): ir1.Identifier | ir1.Keyword {
    if (Array.from(KEYWORDS.values()).includes(sexpr.token.type)) {
      return new ir1.Keyword(sexpr.token);
    } else {
      return new ir1.Identifier(sexpr.token);
    }
  }
}

export default new Parser();
