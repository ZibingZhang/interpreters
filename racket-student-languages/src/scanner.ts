import { DivByZero } from './errors.js';
import interpreter from './interpreter.js';
import {
  RacketComplexNumber,
  RacketExactNumber,
  RacketInexactFloat,
  RacketInexactFraction,
  RacketNumber,
  RacketRealNumber
} from './literals.js';
import { Token, TokenType } from './tokens.js'
import * as util from './utils.js';


class Scanner {
  /**
   * Turns text into a list of tokens.
   */
  scan(text: string): Token[] {
    let tokens: Token[] = [];
    let name = '';

    try {
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        switch(char) {
          case '(': {
            if (name !== '') { 
              tokens.push(this.nameToToken(name)); 
              name = '';
            }
            tokens.push(new Token(TokenType.LEFT_PAREN, char));
            break;
          }
          case ')': {
            if (name !== '') { 
              tokens.push(this.nameToToken(name)); 
              name = '';
            }
            tokens.push(new Token(TokenType.RIGHT_PAREN, char));
            break;
          }
          case ' ':
          case '\n':
          case '\t': {
            if (name !== '') { 
              tokens.push(this.nameToToken(name));
              name = '';
            }
            break;
          }
          default: {
            name += char;
          }
        }
      }
      if (name !== '') tokens.push(this.nameToToken(name));
      tokens.push(new Token(TokenType.EOF, ''));
      return tokens;
    } catch (err) {
      if (err instanceof DivByZero) {
        this.error(`division by zero in \`${name}\``);
      } else {
        throw err;
      }
    }

    return tokens;
  }

  error(msg: string): void {
    interpreter.error(`read-syntax: ${msg}`);
  }

  nameToToken(name: string): Token {
    let number = this.isNumber(name);
    if (number === false) return new Token(TokenType.NAME, name);
    else return new Token(TokenType.NUMBER, name, number);
  }

  /**
   * Does the text represent a number?
   */
  isNumber(text: string): RacketNumber | boolean {
    // special values
    if (text === '+NaN.0') return new RacketInexactFloat(NaN);
    if (text === '-NaN.0') return new RacketInexactFloat(NaN);
    if (text === '+inf.0') return new RacketInexactFloat(Infinity);
    if (text === '-inf.0') return new RacketInexactFloat(-Infinity);

    // numbers can start with a #e or #i
    let isExact = true;
    if (text.charAt(0) === '#') {
      if (text.charAt(1) === 'i') isExact = false;
      else if (text.charAt(1) !== 'e') return false;
      text = text.substr(2);
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
      } else if (char < '0' || char > '9') {
        return false
      } else {
        numerator += char;
      }
    }

    if (isDecimal) {
      denominator = 1n;
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === '+' || char === '-') {
          isComplex = true;
          text = text.substr(i+1);
          if (char === '-') complexSign = -1n;
          break;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          numerator += char;
          denominator *= 10n;
        }
      }

      if (numerator === '.') return false;
      if (isExact) real = new RacketExactNumber(BigInt(numerator), denominator);
      else real = new RacketInexactFraction(BigInt(numerator), denominator);
    } else if (isFraction) {
      denominator = '';
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === '+' || char === '-') {
          if (denominator === '') return false;
          isComplex = true;
          text = text.substr(i+1);
          if (char === '-') complexSign = -1n;
          break;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          denominator += char;
        }
      }

      if (denominator === '') return false;
      let num = BigInt(numerator);
      let denom = BigInt(denominator);
      if (denom === 0n) throw DivByZero;
      let gcd = util.gcd(num, denom);
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
      } else if (char < '0' || char > '9') {
        return false
      } else {
        numerator += char;
      }
    }

    let seenI = false;
    if (isDecimal) {
      denominator = 1n;
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === 'i') {
          if (i + 1 !== text.length) return false;
          seenI = true;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          numerator += char;
          denominator *= 10n;
        }
      }

      if (seenI === false) return false;
      if (numerator === '.') return false;
      if (isExact) imaginary = new RacketExactNumber(BigInt(numerator), denominator);
      else imaginary = new RacketInexactFraction(BigInt(numerator), denominator);
    } else if (isFraction) {
      denominator = '';
      for (let i = 0; i < text.length; i++) {
        let char = text.charAt(i);
        if (char === 'i') {
          if (i + 1 !== text.length) return false;
          seenI = true;
        } else if (char < '0' || char > '9') {
          return false;
        } else {
          denominator += char;
        }
      }

      if (seenI === false) return false;
      if (denominator === '') return false;
      let num = BigInt(numerator);
      let denom = BigInt(denominator);
      if (denom === 0n) throw DivByZero;
      let gcd = util.gcd(num, denom);
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
