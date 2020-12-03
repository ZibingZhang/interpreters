import { DivByZero } from './errors.js';
import {
  RacketComplexNumber,
  RacketExactNumber,
  RacketInexactFloat,
  RacketInexactFraction,
  RacketNumber,
  RacketRealNumber
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

  scan(text: string): Token[] {
    let tokens: Token[] = [];
    let name = '';

    try {
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        switch(char) {
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

  addCurrentName(tokens: Token[], name: string): '' {
    if (name !== '') tokens.push(this.nameToToken(name));
    return '';
  }

  error(msg: string): void {
    racket.error(`read-syntax: ${msg}`);
  }

  nameToToken(name: string): Token {
    let type = KEYWORDS.get(name);
    if (type != undefined) return new Token(type, name);
    let value;
    if (value = this.isNumber(name)) return new Token(TokenType.NUMBER, name, value);
    return new Token(TokenType.IDENTIFIER, name);
  }

  //

  isNumber(text: string): RacketNumber | false {
    // special values
    if (text === '+NaN.0') return new RacketInexactFloat(NaN);
    if (text === '-NaN.0') return new RacketInexactFloat(NaN);
    if (text === '+NaN.f') return new RacketInexactFloat(NaN);
    if (text === '-NaN.f') return new RacketInexactFloat(NaN);
    if (text === '+inf.0') return new RacketInexactFloat(Infinity);
    if (text === '+inf.0') return new RacketInexactFloat(Infinity);
    if (text === '-inf.f') return new RacketInexactFloat(-Infinity);
    if (text === '-inf.f') return new RacketInexactFloat(-Infinity);

    let match = /^(#i|#e)?(\+|-)?(\d+#*)?(?:(\/|\.)(\d+#*)?)?(?:(\+|-)(\d+#*)?(?:(\/|\.)(\d+#*)?)?i)?$/.exec(text);
    if (match === null) return false;
    
    let isExact = match[1] !== '#i';
    let realSignStr = match[2];
    let realNumerator = BigInt(match[3]?.replace(/#/g, '0') || -1n);
    let realDecimalOrFraction: string | undefined = match[4];
    let realRest = BigInt(match[5]?.replace(/#/g, '0') || -1n);
    let imaginarySignStr = match[6];
    let imaginaryNumerator = BigInt(match[7]?.replace(/#/g, '0') || -1n);
    let imaginaryDecimalOrFraction: string | undefined = match[8];
    let imaginaryRest = BigInt(match[9]?.replace(/#/g, '0') || -1n);

    if (realSignStr !== undefined && realNumerator === -1n && realRest === -1n) return false;
    if (realDecimalOrFraction !== undefined && realNumerator === -1n && realRest === -1n) return false;
    if (realDecimalOrFraction === '/' && (realNumerator === -1n || realRest === -1n)) return false;
    if (imaginarySignStr !== undefined && imaginaryNumerator === -1n && imaginaryRest === -1n) return false;
    if (imaginaryDecimalOrFraction !== undefined && imaginaryNumerator === -1n && imaginaryRest === -1n) return false;
    if (imaginaryDecimalOrFraction === '/' && (imaginaryNumerator === -1n || imaginaryRest === -1n)) return false;

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

    if (imaginarySignStr === undefined) return real;

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
