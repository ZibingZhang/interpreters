import { Environment } from './environment.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { Token } from './tokens.js';
import * as utils from './utils.js';

export interface RacketValue {}

export interface RacketNumber extends RacketValue {
  add(other: RacketNumber): RacketNumber;
}

export interface RacketRealNumber extends RacketNumber {
  isExact: boolean;

  isNegative(): boolean;
  isZero(): boolean;
  isPositive(): boolean;
}

export class RacketExactNumber implements RacketRealNumber {
  isExact: boolean;
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    this.isExact = true;
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    return (Number(this.numerator) / Number(this.denominator)).toString();
  }

  add(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber) {
      let numerator = this.numerator * other.denominator + this.denominator * other.numerator;
      let denominator = this.denominator * other.denominator;
      let numeratorSign = numerator > 0 ? 1n : -1n;
      numerator *= numeratorSign;
      let gcd = utils.gcd(numerator, denominator);
      return new RacketExactNumber(numeratorSign * numerator / gcd, denominator / gcd);
    } else {
      return other.add(this);
    }
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

export interface RacketInexactNumber extends RacketRealNumber {
}

export class RacketInexactFraction implements RacketInexactNumber {
  isExact: boolean;
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    this.isExact = false;
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    let value = Number(this.numerator) / Number(this.denominator);
    if (Number.isInteger(value)) return '#i' + value.toString() + '.0';
    else return '#i' + value.toString();
  }

  add(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber || other instanceof RacketInexactFraction) {
      let numerator = this.numerator * other.denominator + this.denominator * other.numerator;
      let denominator = this.denominator * other.denominator;
      let numeratorSign = numerator > 0 ? 1n : -1n;
      numerator *= numeratorSign;
      let gcd = utils.gcd(numerator, denominator);
      return new RacketInexactFraction(numeratorSign * numerator / gcd, denominator / gcd);
    } else {
      return other.add(this);
    }
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

export class RacketInexactFloat implements RacketInexactNumber {
  isExact: boolean;
  value: number;

  constructor(value: number) {
    this.isExact = false;
    this.value = value;
  }

  toString(): string {
    if (this.value === Infinity) {
      return '#i+inf.0';
    } else if (this.value === -Infinity) {
      return '#i-inf.0';
    } else if (this.value === NaN) {
      return '#i+nan.0';
    } else {
      return '#i' + this.value;
    }
  }

  add(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber || other instanceof RacketInexactFraction) {
      return new RacketInexactFloat(this.value + fractionToFloat(other.numerator, other.denominator));
    } else if (other instanceof RacketInexactFloat) {
      return new RacketInexactFloat(this.value + other.value);
    } else {
      return other.add(this);
    }
  }

  isNegative(): boolean {
    return this.value < 0;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  isPositive(): boolean {
    return this.value > 0;
  }
}

export class RacketComplexNumber implements RacketNumber {
  real: RacketRealNumber;
  imaginary: RacketRealNumber;

  constructor(real: RacketRealNumber, imaginary: RacketRealNumber) {
    this.real = real;
    this.imaginary = imaginary;
  }

  toString() : string {
    return this.real.toString() 
      + (!this.imaginary.isNegative() ? '+' : '')
      +  this.imaginary.toString().replace('#i', '') + 'i';
  }

  add(other: RacketNumber): RacketNumber {
    if (other instanceof RacketComplexNumber) {
      let real = this.real.add(other.real);
      let imaginary = this.imaginary.add(other.imaginary);
      if (!isReal(real) || !isReal(imaginary)) throw new Error('Unreachable code.');
      if (imaginary.isZero()) return real;
      else return new RacketComplexNumber(real, imaginary);
    } else {
      let real = this.real.add(other);
      if (!isReal(real)) throw new Error('Unreachable code.');
      else return new RacketComplexNumber(real, this.imaginary);
    }
  }
}

export interface RacketCallable extends RacketValue {
  call(args: RacketValue[]): RacketValue;
}

export class RacketLambda implements RacketCallable {
  params: Token[];
  body: ir2.Expr;

  constructor(params: Token[], body: ir2.Expr) {
    this.params = params;
    this.body = body;
  }

  call(args: RacketValue[]): RacketValue {
    let interpreter = racket.interpreter;
    let enclosing = interpreter.environment;
    interpreter.environment = new Environment(enclosing);
    for (let i = 0; i < args.length; i++) {
      let param = this.params[i];
      let arg = args[i];
      interpreter.environment.define(param.lexeme, arg);
    }
    let result = interpreter.evaluate(this.body);
    interpreter.environment = enclosing;
    return result;
  }
}

export interface RacketFunction extends RacketCallable {
  name: string;
}

export interface RacketBuiltInFunction extends RacketFunction {
  min: number;
  max: number;
}

export class RacketUserDefinedFunction implements RacketFunction {
  name: string;
  body: RacketLambda;

  constructor(name: string, body: RacketLambda) {
    this.name = name;
    this.body = body;
  }

  call(args: RacketValue[]): RacketValue {

    return this.body.call(args);
  }
}

//

export function isCallable(object: any): object is RacketFunction {
  return (object as RacketFunction).call !== undefined;
}

export function isNumber(object: any): object is RacketNumber {
  return isReal(object) || object instanceof RacketComplexNumber;
}

//

export enum RacketValueType {
  BUILTIN_FUNCTION = 1,
  BUILTIN_LITERAL,
  FUNCTION,
  NUMBER,
  PARAMETER,
  VARIABLE
}

//

function isReal(number: RacketNumber): number is RacketRealNumber {
  return number instanceof RacketExactNumber
    || number instanceof RacketInexactFloat
    || number instanceof RacketInexactFraction;
}

function fractionToFloat(numerator: BigInt, denominator: BigInt): number {
  return Number(numerator) / Number(denominator);
}
