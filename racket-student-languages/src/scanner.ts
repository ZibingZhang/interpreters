import { DivByZero } from './errors.js';
import {
  RacketBoolean,
  RacketComplexNumber,
  RacketExactNumber,
  RacketInexactFloat,
  RacketInexactFraction,
  RacketNumber,
  RacketRealNumber,
  RacketString,
  RACKET_FALSE,
  RACKET_TRUE
} from './values.js';
import { KEYWORDS, Token, TokenType } from './tokens.js'
import * as utils from './utils.js';
import racket from './racket.js';


class Scanner {
  private static ScannerError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private text: string = '';
  private current: number = 0;

  scan(text: string): Token[] {
    this.text = text;
    this.current = 0;
    let tokens: Token[] = [];
    let name = '';

    try {
      for (; !this.isAtEnd(); this.advance()) {
        let char = text.charAt(this.current);
        switch (char) {
          case '(': {
            name = this.addCurrentName(tokens, name);
            tokens.push(new Token(TokenType.LEFT_PAREN, char));
            break;
          }
          case ')': {
            name = this.addCurrentName(tokens, name);
            tokens.push(new Token(TokenType.RIGHT_PAREN, char));
            break;
          }
          case '"':
            name = this.addCurrentName(tokens, name);
            this.addString(tokens);
            break;
          case ' ':
          case '\n':
          case '\t': {
            name = this.addCurrentName(tokens, name);
            break;
          }
          default: {
            name += char;
          }
        }
      }
      this.addCurrentName(tokens, name);
      tokens.push(new Token(TokenType.EOF, ''));
      return tokens;
    } catch (err) {
      if (err instanceof DivByZero) {
        this.error(`division by zero in \`${name}\``);
      } else if (err instanceof Scanner.ScannerError) {
        this.error(err.msg);
      } else {
        throw err;
      }
    }

    return tokens;
  }

  //

  private advance(): void {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
  }

  // private check(type: TokenType): boolean {
  //   if (this.isAtEnd()) return false;
  //   return this.peek().type === type;
  // }

  private isAtEnd(): boolean {
    return this.peek() === false;
  }

  // private match(...types: TokenType[]): boolean {
  //   for (let type of types) {
  //     if (this.check(type)) {
  //       this.advance();
  //       return true;
  //     }
  //   }
  //   return false;
  // }

  private peek(): string | false {
    if (this.text.length === this.current) {
      return false;
    } else {
      return this.text[this.current];
    }
  }

  private previous(): string {
    return this.text[this.current - 1];
  }

  //

  private addCurrentName(tokens: Token[], name: string): '' {
    if (name !== '') {
      tokens.push(this.lexemeToToken(name))
    };
    return '';
  }

  private addString(tokens: Token[]): void {
    this.advance();
    let string = '';
    while (this.peek() != '"' && !this.isAtEnd()) {
      this.advance();
      let char = this.previous();
      if (char === '\\') {
        if (this.isAtEnd()) {
          this.error('expected a closing `"`');
          return;
        }
        this.advance();
        let escapedChar = this.previous();
        switch (escapedChar) {
          case 'a':
            string += '\a';
            break;
          case 'b':
            string += '\b';
            break;
          case 'e':
            string += '\e';
            break;
          case 'f':
            string += '\f';
            break;
          case 'n':
            string += '\n';
            break;
          case 'r':
            string += '\r';
            break;
          case 't':
            string += '\t';
            break;
          case 'v':
            string += '\v';
            break;
          case '\\':
            string += '\\';
            break;
          case "'":
            string += '\'';
            break;
          case '"':
            string += '\"';
            break;
          default:
            this.error(`unknown escape sequence \`\\${escapedChar}\` in string`);
            return;
        }
      } else {
        string += char;
      }
    }
    if (this.peek() !== '"') {
      this.error('expected a closing `"`');
    }
    tokens.push(new Token(TokenType.STRING, string, new RacketString(string)));
  }

  //

  private error(msg: string): void {
    racket.error(`read-syntax: ${msg}`);
  }

  //

  private lexemeToToken(name: string): Token {
    let type = KEYWORDS.get(name);
    if (type !== undefined) return new Token(type, name);
    let value: RacketBoolean | RacketNumber | false = this.isBoolean(name);
    if (value !== false) return new Token(TokenType.BOOLEAN, name, value);
    value = this.isNumber(name);
    if (value !== false) return new Token(TokenType.NUMBER, name, value);
    return new Token(TokenType.IDENTIFIER, name);
  }

  //

  private isBoolean(text: string): RacketBoolean | false {
    if (['#T', '#t', '#true'].includes(text)) {
      return RACKET_TRUE;
    } else if (['#F','#f', '#false'].includes(text)) {
      return RACKET_FALSE;
    } else { 
      return false;
    }
  }

  private isNumber(text: string): RacketNumber | false {
    // special values
    if (text === '+NaN.0') return new RacketInexactFloat(NaN);
    if (text === '-NaN.0') return new RacketInexactFloat(NaN);
    if (text === '+NaN.f') return new RacketInexactFloat(NaN);
    if (text === '-NaN.f') return new RacketInexactFloat(NaN);
    if (text === '+inf.0') return new RacketInexactFloat(Infinity);
    if (text === '+inf.0') return new RacketInexactFloat(Infinity);
    if (text === '-inf.f') return new RacketInexactFloat(-Infinity);
    if (text === '-inf.f') return new RacketInexactFloat(-Infinity);

    // many forms that are not numbers, but will error out
    let result;
    if (/^(?:#e|#i)$/.exec(text) !== null) {
      this.error('no digits');
    } else if ((result = /^(?:#e|#i)(?!\d|\+|-)(.).*/.exec(text)) !== null) {
      this.error(`bad digit \`${result[1]}\``);
    } else if (false) {
      // many more errors to check...
    }

    // general regex for numbers
    let match = /^(#e|#i)?(\+|-)?(\d+#*)?(?:(\/|\.)(\d+#*)?)?(?:(\+|-)(\d+#*)?(?:(\/|\.)(\d+#*)?)?i)?$/.exec(text);
    if (match === null) return false;
    
    let isExact = match[1] !== '#i';
    let realSignStr: string | undefined = match[2];
    let realNumerator = BigInt(match[3]?.replace(/#/g, '0') || -1n);
    let realDecimalOrFraction: string | undefined = match[4];
    let realRest = BigInt(match[5]?.replace(/#/g, '0') || -1n);
    let imaginarySignStr: string | undefined = match[6];
    let imaginaryNumerator = BigInt(match[7]?.replace(/#/g, '0') || -1n);
    let imaginaryDecimalOrFraction: string | undefined = match[8];
    let imaginaryRest = BigInt(match[9]?.replace(/#/g, '0') || -1n);
    let hasImaginary = imaginarySignStr !== undefined;

    if (realSignStr !== undefined && realNumerator === -1n && realRest === -1n) return false;
    if (realDecimalOrFraction !== undefined && realNumerator === -1n && realRest === -1n) return false;
    if (realDecimalOrFraction === '/' && (realNumerator === -1n || realRest === -1n)) return false;
    if (hasImaginary && imaginaryDecimalOrFraction !== undefined && imaginaryNumerator === -1n && imaginaryRest === -1n) return false;
    if (imaginaryDecimalOrFraction !== undefined && imaginaryNumerator === -1n && imaginaryRest === -1n) return false;
    if (imaginaryDecimalOrFraction === '/' && (imaginaryNumerator === -1n || imaginaryRest === -1n)) return false;

    if (realNumerator === -1n) {
      realNumerator = 0n;
    }

    let realSign = realSignStr !== '-' ? 1n : -1n;
    let imaginarySign = imaginarySignStr !== '-' ? 1n : -1n;
    if (realDecimalOrFraction === '.' && realRest === -1n) realDecimalOrFraction = undefined; 
    if (imaginaryDecimalOrFraction === '.' && imaginaryRest === -1n) imaginaryDecimalOrFraction = undefined; 

    let real: RacketRealNumber;
    let imaginary: RacketRealNumber;

    if (realDecimalOrFraction === undefined) {
      if (isExact) real = new RacketExactNumber(realSign * realNumerator, 1n);
      else real = new RacketInexactFraction(realSign * realNumerator, 1n);
    } else if (realDecimalOrFraction === '.') {
      let denominator = 10n ** BigInt(realRest.toString().length);
      if (isExact) real = new RacketExactNumber(realSign * (realNumerator * denominator + realRest), denominator);
      else real = new RacketInexactFraction(realSign * (realNumerator * denominator + realRest), denominator);
    } else if (realDecimalOrFraction === '/') {
      let gcd = utils.gcd(realNumerator, realRest);
      if (isExact) real = new RacketExactNumber(realSign * realNumerator / gcd, realRest / gcd);
      else real = new RacketInexactFraction(realSign * realNumerator / gcd, realRest / gcd);
    } else {
      throw new Error('Unreachable code.');
    }

    if (!hasImaginary) return real;

    if (imaginaryNumerator === -1n && imaginaryRest === -1n) {
      imaginaryNumerator = 1n;
    }

    if (imaginaryDecimalOrFraction === undefined) {
      if (isExact) imaginary = new RacketExactNumber(imaginarySign * imaginaryNumerator, 1n);
      else imaginary = new RacketInexactFraction(imaginarySign * imaginaryNumerator, 1n);
    } else if (imaginaryDecimalOrFraction === '.') {
      let denominator = 10n ** BigInt(imaginaryRest.toString().length);
      if (isExact) imaginary = new RacketExactNumber(imaginarySign * (imaginaryNumerator * denominator + imaginaryRest), denominator);
      else imaginary = new RacketInexactFraction(imaginarySign * (imaginaryNumerator * denominator + imaginaryRest), denominator);
    } else if (imaginaryDecimalOrFraction === '/') {
      let gcd = utils.gcd(realNumerator, realRest);
      if (isExact) imaginary = new RacketExactNumber(imaginarySign * imaginaryNumerator / gcd, imaginaryRest / gcd);
      else imaginary = new RacketInexactFraction(imaginarySign * imaginaryNumerator / gcd, imaginaryRest / gcd);
    } else {
      throw new Error('Unreachable code.');
    }

    return new RacketComplexNumber(real, imaginary);
  }
}

export default new Scanner();
