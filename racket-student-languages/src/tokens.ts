import { RacketValue } from './values.js';

export enum TokenType {
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',

  DEFINE = 'define',
  DEFINE_STRUCT = 'define-struct',
  LAMBDA = 'lambda',

  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  
  EOF = 'EOF'
}

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
  ['define', TokenType.DEFINE],
  ['define-struct', TokenType.DEFINE_STRUCT],
  ['lambda', TokenType.LAMBDA]
]);;
