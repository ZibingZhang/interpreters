import { DivByZero } from './errors.js';
import {
  RacketComplexNumber,
  RacketExactNumber,
  RacketInexactFloat,
  RacketInexactFraction,
  RacketNumber,
  RacketRealNumber
} from './values.js';
import { Token, TokenType } from './tokens.js'
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
    if (name === 'define') return new Token(TokenType.DEFINE, name);
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

    // numbers can start with a #e or #i
    let isExact = true;  // all literals can be expressed as an exact number
    if (text.charAt(0) === '#') {
      let exactType = text.charAt(1);
      if (exactType === 'i') isExact = false;
      else if (exactType !== 'e') return false;
      text = text.substr(2);
      if (text === '') throw new Scanner.ScannerError('no digits');
    }

    // flags and variables to keep track of state
    let isComplex = false;
    let complexSign = 1n;
    let real: RacketRealNumber;
    let imaginary: RacketRealNumber;
    let isDecimal = false;
    let isFraction = false;
    let isSigned = false;
    let numerator = '';
    let denominator;
    let seenPound = false;

    // numbers can be explicitly signed
    if (text.charAt(0) === '+' || text.charAt(0) === '-') {
      numerator += text.charAt(0);
      text = text.substr(1);
      isSigned = true;
    }

    for (let i = 0; i < text.length; i++) {
      let char = text.charAt(i);
      if (char === '.') {
        isDecimal = true;
        text = text.substr(i + 1);
        break;
      } else if (char === '/') {
        isFraction = true;
        text = text.substr(i + 1);
        break;
      } else if (char === '+' || char === '-') {
        if (isSigned && numerator.length === 1) return false;
        isComplex = true;
        if (char === '-') complexSign = -1n;
        text = text.substr(i + 1);
        break;
      } else if (isSigned && char === 'i') {
        if (i + 1 !== text.length) return false;
        if (numerator.length === 1) numerator += '1';
        if (isExact) return new RacketComplexNumber(new RacketExactNumber(0n, 1n), new RacketExactNumber(BigInt(numerator), 1n));
        else return new RacketComplexNumber(new RacketInexactFraction(0n, 1n), new RacketInexactFraction(BigInt(numerator), 1n));
      } else if (char === '#') {
        if (numerator === '' || isSigned && numerator.length === 1) return false;
        seenPound = true;
        numerator += '0';
      } else if (char < '0' || char > '9') {
        return false
      } else {
        if (seenPound) return false;
        numerator += char;
      }
    }

    if (isDecimal) {
      seenPound = false;
      denominator = 1n;
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === '+' || char === '-') {
          isComplex = true;
          text = text.substr(i+1);
          if (char === '-') complexSign = -1n;
          break;
        } else if (char === 'i') {
          if (isSigned === false) return false;
          if (i + 1 !== text.length) return false;
          if (numerator.length === 1) return false;
          if (isExact) return new RacketComplexNumber(
            new RacketExactNumber(0n, 1n),
            new RacketExactNumber(BigInt(numerator), denominator)
          );
          else return new RacketComplexNumber(
            new RacketInexactFraction(0n, 0n),
            new RacketInexactFraction(BigInt(numerator), denominator)
          );
        } else if (char === '#') {
          seenPound = true;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          if (seenPound) return false;
          numerator += char;
          denominator *= 10n;
        }
      }
      if (isSigned && numerator.length === 1) return false;
      if (numerator === '.') return false;
      if (isExact) real = new RacketExactNumber(BigInt(numerator), denominator);
      else real = new RacketInexactFraction(BigInt(numerator), denominator);
    } else if (isFraction) {
      if (numerator === '' || isSigned && numerator.length === 1) return false;
      seenPound = false;
      denominator = '';
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === '+' || char === '-') {
          if (denominator === '') return false;
          isComplex = true;
          text = text.substr(i+1);
          if (char === '-') complexSign = -1n;
          break;
        } else if (char === 'i') {
          if (isSigned === false) return false;
          if (i + 1 !== text.length) return false;
          if (numerator.length === 1) return false;

          if (denominator === '') return false;
          let num = BigInt(numerator);
          let numSign = num > 0 ? 1n : -1n;
          num *= numSign;
          let denom = BigInt(denominator);
          if (denom === 0n) throw DivByZero;
          let gcd = utils.gcd(num, denom);
          num *= numSign;
          num /= gcd;
          denom /= gcd;
          if (isExact) return new RacketComplexNumber(
            new RacketExactNumber(0n, 1n),
            new RacketExactNumber(num, denom)
          );
          else return new RacketComplexNumber(
            new RacketInexactFraction(0n, 1n),
            new RacketInexactFraction(num, denom)
          );
        } else if (char === '#') {
          if (denominator === '') return false;
          seenPound = true;
          denominator += '0';
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          if (seenPound) return false;
          denominator += char;
        }
      }

      if (denominator === '') return false;
      let num = BigInt(numerator);
      let numSign = num > 0 ? 1n : -1n;
      num *= numSign;
      let denom = BigInt(denominator);
      if (denom === 0n) throw DivByZero;
      let gcd = utils.gcd(num, denom);
      num *= numSign;
      num /= gcd;
      denom /= gcd;
      if (isExact) real = new RacketExactNumber(num, denom);
      else real = new RacketInexactFraction(num, denom);
    } else {
      if (numerator === '+' || numerator === '-') return false;
      if (isExact) real = new RacketExactNumber(BigInt(numerator), 1n);
      else real = new RacketInexactFraction(BigInt(numerator), 1n);
    }

    if (!isComplex) return real;

    isDecimal = false;
    isFraction = false;
    numerator = '';
    denominator = undefined;
    seenPound = false;

    for (let i = 0; i < text.length; i++) {
      let char = text.charAt(i);
      if (char === '.') {
        isDecimal = true;
        text = text.substr(i + 1);
        break;
      } else if (char === '/') {
        isFraction = true;
        text = text.substr(i + 1);
        break;
      } else if (char === 'i') {
        if (i + 1 !== text.length) return false;
        if (numerator === '') numerator = '1';
        if (isExact) return new RacketComplexNumber(real, new RacketExactNumber(complexSign * BigInt(numerator), 1n));
        else return new RacketComplexNumber(real, new RacketInexactFraction(complexSign * BigInt(numerator), 1n));
      } else if (char === '#') {
        seenPound = true;
        numerator += '0';
      } else if (char < '0' || char > '9') {
        if (seenPound) return false;
        return false
      } else {
        numerator += char;
      }
    }
    
    let seenI = false;
    if (isDecimal) {
      seenPound = false;
      denominator = 1n;
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === 'i') {
          if (i + 1 !== text.length) return false;
          seenI = true;
        } else if (char === '#') {
          seenPound = true;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          if (seenPound) return false;
          numerator += char;
          denominator *= 10n;
        }
      }

      if (seenI === false) return false;
      if (numerator === '.') return false;
      if (isExact) imaginary = new RacketExactNumber(BigInt(numerator), denominator);
      else imaginary = new RacketInexactFraction(BigInt(numerator), denominator);
    } else if (isFraction) {
      seenPound = false;
      denominator = '';
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === 'i') {
          if (i + 1 !== text.length) return false;
          seenI = true;
        } else if (char === '#') {
          seenPound = true;
          denominator += '0';
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          if (seenPound) return false;
          denominator += char;
        }
      }

      if (seenI === false) return false;
      if (denominator === '') return false;
      let num = BigInt(numerator);
      let denom = BigInt(denominator);
      if (denom === 0n) throw DivByZero;
      let gcd = utils.gcd(num, denom);
      num /= gcd;
      denom /= gcd;
      if (isExact) imaginary = new RacketExactNumber(num, denom);
      else imaginary = new RacketInexactFraction(num, denom);
    } else {
      if (isExact) imaginary = new RacketExactNumber(BigInt(numerator), 1n);
      else imaginary = new RacketInexactFraction(BigInt(numerator), 1n);
    }
    
    return new RacketComplexNumber(real, imaginary);
  }
}

export default new Scanner();