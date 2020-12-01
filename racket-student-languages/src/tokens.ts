import { RacketValue } from './values.js';

export enum TokenType {
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  DEFINE = 'DEFINE',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  EOF = 'EOF'
}

export class Token {
  type: TokenType;
  lexeme: string;
  value: RacketValue | undefined;

  constructor(type: TokenType, lexeme: string, value: RacketValue | undefined = undefined) {
    this.type = type;
    this.lexeme = lexeme;
    this.value = value;
  }

  toString(): string {
    return `<Token type:${this.type.toString()} lexeme:${this.lexeme}${this.value ? ' value:' + this.value.toString() : ''}>`;
  }
}
