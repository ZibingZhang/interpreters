import { Environment } from './environment.js';
import { BuiltinFunctionError, DivByZero } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { Token } from './tokens.js';
import * as utils from './utils.js';

export interface RacketValue {}

export abstract class RacketNumber implements RacketValue {
  isZero(): boolean {
    throw new Error('Method not implemented.');
  }

  negated(): RacketNumber {
    throw new Error('Method not implemented.');
  }

  inverted(): RacketNumber {
    throw new Error('Method not implemented.');
  }
  
  add(other: RacketNumber): RacketNumber {
    throw new Error('Method not implemented.');
  }

  sub(other: RacketNumber): RacketNumber {
    return this.add(other.negated());
  }

  mul(other: RacketNumber): RacketNumber {
    throw new Error('Method not implemented.');
  }

  div(other: RacketNumber): RacketNumber {
    return this.mul(other.inverted());
  }
}

export abstract class RacketRealNumber extends RacketNumber {
  isExact: boolean;

  constructor(isExact: boolean) {
    super();
    this.isExact = isExact;
  }

  negated(): RacketRealNumber {
    throw new Error('Method not implemented.');
  }

  inverted(): RacketRealNumber {
    throw new Error('Method not implemented.');
  }

  isNegative(): boolean {
    throw new Error('Method not implemented.');
  }

  isPositive(): boolean {
    throw new Error('Method not implemented.');
  }
}

export class RacketExactNumber extends RacketRealNumber {
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    super(true);
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    return (Number(this.numerator) / Number(this.denominator)).toString();
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  negated(): RacketExactNumber {
    return new RacketExactNumber(-this.numerator, this.denominator)
  }

  inverted(): RacketExactNumber {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      let numeratorSign = this.numerator > 0 ? 1n : -1n;
      return new RacketExactNumber(numeratorSign * this.numerator, numeratorSign * this.denominator);
    }
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

  mul(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber) {
      if (this.isZero() || other.isZero()) return new RacketExactNumber(0n, 1n);
      let numerator = this.numerator * other.numerator;
      let denominator = this.denominator * other.denominator;
      let numeratorSign = numerator > 0 ? 1n : -1n;
      numerator *= numeratorSign;
      let gcd = utils.gcd(numerator, denominator);
      return new RacketExactNumber(numeratorSign * numerator / gcd, denominator / gcd);
    } else {
      return other.mul(this);
    }
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

abstract class RacketInexactNumber extends RacketRealNumber {}

export class RacketInexactFraction extends RacketInexactNumber {
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    super(false);
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    let value = Number(this.numerator) / Number(this.denominator);
    if (Number.isInteger(value)) return '#i' + value.toString() + '.0';
    else return '#i' + value.toString();
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  negated(): RacketInexactFraction {
    return new RacketInexactFraction(-this.numerator, this.denominator);
  }

  inverted(): RacketInexactFraction {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      let numeratorSign = this.numerator > 0 ? 1n : -1n;
      return new RacketInexactFraction(numeratorSign * this.numerator, numeratorSign * this.denominator);
    }
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

  mul(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber || other instanceof RacketInexactFraction) {
      if (this.isZero() || other.isZero()) return new RacketInexactFraction(0n, 1n);
      let numerator = this.numerator * other.numerator;
      let denominator = this.denominator * other.denominator;
      let numeratorSign = numerator > 0 ? 1n : -1n;
      numerator *= numeratorSign;
      let gcd = utils.gcd(numerator, denominator);
      return new RacketInexactFraction(numeratorSign * numerator / gcd, denominator / gcd);
    } else {
      return other.mul(this);
    }
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

export class RacketInexactFloat extends RacketInexactNumber {
  value: number;

  constructor(value: number) {
    super(false);
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

  isZero(): boolean {
    return this.value === 0;
  }

  negated(): RacketInexactFloat {
    return new RacketInexactFloat(-this.value);
  }

  inverted(): RacketInexactFloat {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      return new RacketInexactFloat(1 / this.value);
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

  mul(other: RacketNumber): RacketNumber {
    if (other instanceof RacketExactNumber || other instanceof RacketInexactFraction) {
      if (this.isZero() || other.isZero()) return new RacketInexactFraction(0n, 1n);
      return new RacketInexactFloat(this.value * fractionToFloat(other.numerator, other.denominator));
    } else if (other instanceof RacketInexactFloat) {
      if (this.isZero() || other.isZero()) return new RacketInexactFraction(0n, 1n);
      return new RacketInexactFloat(this.value * other.value);
    } else {
      return other.mul(this);
    }
  }

  isNegative(): boolean {
    return this.value < 0;
  }

  isPositive(): boolean {
    return this.value > 0;
  }
}

export class RacketComplexNumber extends RacketNumber {
  real: RacketRealNumber;
  imaginary: RacketRealNumber;

  constructor(real: RacketRealNumber, imaginary: RacketRealNumber) {
    super();
    this.real = real;
    this.imaginary = imaginary;
  }

  toString() : string {
    return this.real.toString() 
      + (!this.imaginary.isNegative() ? '+' : '')
      +  this.imaginary.toString().replace('#i', '') + 'i';
  }

  negated(): RacketComplexNumber {
    return new RacketComplexNumber(this.real.negated(), this.imaginary.negated());
  }

  inverted(): RacketComplexNumber {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      let magnitudeSquared = this.real.mul(this.real).add(this.imaginary.mul(this.imaginary));
      if (!isReal(magnitudeSquared)) throw new Error('Unreachable code.');
      let invertedMagnitudeSquared = magnitudeSquared.inverted();
      let real = this.real.mul(invertedMagnitudeSquared);
      let imaginary = this.imaginary.mul(invertedMagnitudeSquared).negated();
      if (!isReal(real) || !isReal(imaginary)) throw new Error('Unreachable code.');
      return new RacketComplexNumber(real, imaginary);
    }
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

  mul(other: RacketNumber): RacketNumber {
    if (other instanceof RacketComplexNumber) {
      let real = this.real.mul(other.real);
      let imaginary = this.imaginary.mul(other.imaginary);
      if (!isReal(real) || !isReal(imaginary)) throw new Error('Unreachable code.');
      if (imaginary.isZero()) return real;
      else return new RacketComplexNumber(real, imaginary);
    } else {
      let real = this.real.mul(other);
      if (!isReal(real)) throw new Error('Unreachable code.');
      else return new RacketComplexNumber(real, this.imaginary);
    }
  }
}

//

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

export abstract class RacketBuiltInFunction implements RacketFunction {
  name: string;
  min: number;
  max: number;

  constructor(name: string, min: number, max: number) {
    this.name = name;
    this.min = min;
    this.max = max;
  }
  
  call(args: RacketValue[]): RacketValue {
    throw new Error('Method not implemented.');
  }

  error(msg: string): never {
    throw new BuiltinFunctionError(msg);
  }
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
  return object instanceof RacketNumber;
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
  return number instanceof RacketRealNumber;
}

function fractionToFloat(numerator: BigInt, denominator: BigInt): number {
  return Number(numerator) / Number(denominator);
}
