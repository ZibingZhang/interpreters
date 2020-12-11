import { RacketValue } from './values.js';

/**
 * The type of a token.
 */
export enum TokenType {
  OPEN = '(',
  CLOSE = ')',
  OPEN_BRACE = '{',
  CLOSE_BRACE = '}',
  OPEN_BRACKET = '[',
  CLOSE_BRACKET = ']',

  CHECK_EXPECT = 'check-expect',
  DEFINE = 'define',
  DEFINE_STRUCT = 'define-struct',
  LAMBDA = 'lambda',
  QUOTE = 'quote',

  SINGLE_QUOTE = "'",

  AND = 'and',
  COND = 'cond',
  ELSE =  'else',
  IF = 'if',
  OR = 'or',

  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  
  EOF = 'EOF'
}

/**
 * A abstract representation of a consecutive sequence of characters.
 */
export class Token {
  readonly type: TokenType;
  readonly lexeme: string;
  readonly value: RacketValue | undefined;

  constructor(type: TokenType, lexeme: string, value: RacketValue | undefined = undefined) {
    this.type = type;
    this.lexeme = lexeme;
    this.value = value;
  }

  toString(): string {
    return `<Token type:${this.type.toString()} lexeme:${this.lexeme}${this.value ? ' value:' + this.value.toString() : ''}>`;
  }
}

export const KEYWORDS = new Map([
  [TokenType.CHECK_EXPECT.valueOf(), TokenType.CHECK_EXPECT],
  [TokenType.DEFINE.valueOf(), TokenType.DEFINE],
  [TokenType.DEFINE_STRUCT.valueOf(), TokenType.DEFINE_STRUCT],
  [TokenType.LAMBDA.valueOf(), TokenType.LAMBDA],
  [TokenType.QUOTE.valueOf(), TokenType.QUOTE],
  [TokenType.AND.valueOf(), TokenType.AND],
  [TokenType.COND.valueOf(), TokenType.COND],
  [TokenType.ELSE.valueOf(), TokenType.ELSE],
  [TokenType.IF.valueOf(), TokenType.IF],
  [TokenType.OR.valueOf(), TokenType.OR],
]);;
