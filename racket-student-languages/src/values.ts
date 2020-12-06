import { Environment } from './environment.js';
import { BuiltinFunctionError, DivByZero, StructureFunctionError } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import * as utils from './utils.js';

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

export interface RacketValue {}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Concrete Classes
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Booleans
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * A Racket boolean.
  */
export class RacketBoolean implements RacketValue {
  readonly value: boolean;

  constructor(value: boolean) {
    this.value = value;
  }

  toString(): string {
    if (this.value) {
      return '#true';
    } else {
      return '#false';
    }
  }
}

export const RACKET_TRUE = new RacketBoolean(true);
export const RACKET_FALSE = new RacketBoolean(false);

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Numbers
 *
 * Class Structure:
 *  RacketNumber
 *    RacketRealNumber
 *      RacketExactNumber
 *      RacketInexactNumber
 *        RacketInexactFraction
 *        RacketInexactFloat
 *    RacketComplexNumber
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * A Racket number.
  */
export abstract class RacketNumber implements RacketValue {
  /**
   * Is this number zero?
   */
  isZero(): boolean {
    throw new Error('Method not implemented.');
  }

  /**
   * Return a new Racket number which is equal to the negative of this one.
   */
  negated(): RacketNumber {
    throw new Error('Method not implemented.');
  }

  /**
   * Return a new Racket number which is equal to the inverse of this one.
   */
  inverted(): RacketNumber {
    throw new Error('Method not implemented.');
  }
  
  /**
   * Return a new Racket number which is equal to this plus that one.
   * @param other the number to add with this one
   */
  add(other: RacketNumber): RacketNumber {
    throw new Error('Method not implemented.');
  }

  /**
   * Return a new Racket number which is equal to this minus that one.
   * @param other the number to subtract with this one
   */
  sub(other: RacketNumber): RacketNumber {
    return this.add(other.negated());
  }

  /**
   * Return a new Racket number which is equal to this times that one.
   * @param other the number to multiply with this one
   */
  mul(other: RacketNumber): RacketNumber {
    throw new Error('Method not implemented.');
  }

  /**
   * Return a new Racket number which is equal to this divided by that one.
   * @param other the number to divide this one by
   */
  div(other: RacketNumber): RacketNumber {
    return this.mul(other.inverted());
  }
}

/**
 * A real Racket number.
 */
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

/**
 * An exact Racket number.
 */
export class RacketExactNumber extends RacketRealNumber {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    super(true);
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    return (Number(this.numerator) / Number(this.denominator)).toString();
  }

  isZero(): boolean {
    return this.numerator === 0n;
  }

  negated(): RacketExactNumber {
    return new RacketExactNumber(-this.numerator, this.denominator)
  }

  inverted(): RacketExactNumber {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      let numeratorSign = this.numerator > 0 ? 1n : -1n;
      return new RacketExactNumber(numeratorSign * this.denominator, numeratorSign * this.numerator);
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

/**
 * An inexact Racket number.
 */
abstract class RacketInexactNumber extends RacketRealNumber {}

/**
 * An inexact Racket number which is stored as a fraction.
 */
export class RacketInexactFraction extends RacketInexactNumber {
  readonly numerator: bigint;
  readonly denominator: bigint;

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
    return this.numerator === 0n;
  }

  negated(): RacketInexactFraction {
    return new RacketInexactFraction(-this.numerator, this.denominator);
  }

  inverted(): RacketInexactFraction {
    if (this.isZero()) {
      throw new DivByZero();
    } else {
      let numeratorSign = this.numerator > 0 ? 1n : -1n;
      return new RacketInexactFraction(numeratorSign * this.denominator, numeratorSign * this.numerator);
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

/**
 * An inexact Racket number which is stored as a float.
 */
export class RacketInexactFloat extends RacketInexactNumber {
  readonly value: number;

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

/**
 * A complex Racket number.
 */
export class RacketComplexNumber extends RacketNumber {
  readonly real: RacketRealNumber;
  readonly imaginary: RacketRealNumber;

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

  isZero(): boolean {
    return this.real.isZero() && this.imaginary.isZero();
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
      let real = this.real.mul(other.real).sub(this.imaginary.mul(other.imaginary));
      let imaginary = this.real.mul(other.imaginary).add(this.imaginary.mul(other.real));
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

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Strings
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * A Racket string.
  */
export class RacketString implements RacketValue {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  toString(): string {
    return JSON.stringify(this.value);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Callables
 * 
 * Class Structure:
 *  RacketCallable
 *    RacketLambda
 *    RacketBuiltinFunction
 *    RacketStructureFunction
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export interface RacketCallable extends RacketValue {
  /**
   * Call this callable.
   * @param args the arguments passed to this callable
   */
  call(args: RacketValue[]): RacketValue;
}

export class RacketLambda implements RacketCallable {
  readonly params: string[];
  readonly body: ir2.Expr;

  constructor(params: string[], body: ir2.Expr) {
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
      interpreter.environment.define(param, arg);
    }
    let result = interpreter.evaluate(this.body);
    interpreter.environment = enclosing;
    return result;
  }
}

export abstract class RacketBuiltInFunction implements RacketCallable {
  readonly name: string;
  readonly min: number;
  readonly max: number;

  constructor(name: string, min: number, max: number) {
    this.name = name;
    this.min = min;
    this.max = max;
  }
  
  call(args: RacketValue[]): RacketValue {
    throw new Error('Method not implemented.');
  }

  /**
   * Raise an error.
   * @param msg the error message
   */
  error(msg: string): never {
    throw new BuiltinFunctionError(msg);
  }
}

type RacketStructureCallback = (args: RacketValue[]) => RacketValue;

class RacketStructureFunction implements RacketCallable {
  function: RacketStructureCallback;

  constructor(func: RacketStructureCallback) {
    this.function = func;
  }

  call(args: RacketValue[]): RacketValue {
    return this.function(args);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Structures
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * A Racket structure.
  */
export class RacketStructure implements RacketValue {
  name: string;
  fields: string[];

  constructor(name: string, fields: string[]) {
    this.name = name;
    this.fields = fields;
  }

  /**
   * Produce a function that creates an instance of this Racket structure.
   */
  makeFunction(): RacketStructureFunction {
    return new RacketStructureFunction((args: RacketValue[]): RacketInstance => {
      let functionName = `make-${this.name}`;
      let expected = this.fields.length;
      let received = args.length;
      if (expected === 0 && received > 0) {
        this.error(`${functionName}: expects no arguments, but found ${args.length}`);
      } else if (expected > received) {
        this.error(`${functionName}: expects ${expected} argument${expected === 1 ? '' : 's'}, but found ${received === 0 ? 'none' : `only ${received}`}`);
      } else if (expected < received) {
        this.error(`${functionName}: expects only ${expected} argument${expected === 1 ? '' : 's'}, but found ${received}`);
      } else {
        return new RacketInstance(this, args);
      }
    });
  }

  /**
   * Produce a list of functions that get attributes from instances of this Racket structure.
   */
  getFunctions() : RacketStructureFunction[] {
    let functions: RacketStructureFunction[] = [];
    this.fields.forEach((field, i) => {
      functions.push(new RacketStructureFunction((args: RacketValue[]): RacketValue => {
        let functionName = `${this.name}-${field}`;
        if (args.length === 0) {
          this.error(`${functionName}: expects 1 argument, but found none`);
        } else if (args.length > 1) {
          this.error(`${functionName}: expects only 1 argument, but found ${args.length}`);
        } else {
          let instance = args[0];
          if (!(instance instanceof RacketInstance) || instance.type !== this) {
            this.error(`${functionName}: expects a ${this.name}, given ${instance.toString()}`);
          } else {
            return instance.values[i];
          }
        }
      }));
    });
    return functions;
  }

  private error(msg: string): never {
    throw new StructureFunctionError(msg);
  }
}

/**
 * An instance of a Racket structure.
 */
export class RacketInstance implements RacketValue {
  type: RacketStructure;
  values: RacketValue[];

  constructor(type: RacketStructure, values: RacketValue[]) {
    this.type = type;
    this.values = values;
  }

  toString(): string {
    let string = `(make-${this.type.name}`;
    for (let value of this.values) {
      string += ` ${value.toString()}`;
    }
    return string + ')';
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Type Guards
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export function isCallable(object: any): object is RacketCallable {
  return (object as RacketCallable).call !== undefined;
}

export function isBoolean(object: any): object is RacketBoolean {
  return object instanceof RacketBoolean;
}

export function isInstance(object: any): object is RacketInstance {
  return object instanceof RacketInstance;
}

export function isNumber(object: any): object is RacketNumber {
  return object instanceof RacketNumber;
}

export function isString(object: any): object is RacketString {
  return object instanceof RacketString;
}

export function isStructure(object: any): object is RacketStructure {
  return object instanceof RacketStructure;
}

function isReal(number: RacketNumber): number is RacketRealNumber {
  return number instanceof RacketRealNumber;
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Racket Value Types
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export enum RacketValueType {
  BUILTIN_FUNCTION = 'BUILTIN_FUNCTION',
  BUILTIN_LITERAL = 'BUILTIN_LITERAL',
  BOOLEAN = 'BOOLEAN',
  FUNCTION = 'FUNCTION',
  INSTANCE = 'INSTANCE',
  NUMBER = 'NUMBER',
  PARAMETER = 'PARAMETER',
  STRING = 'STRING',
  STRUCTURE = 'STRUCTURE',
  VARIABLE = 'VARIABLE'
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Helper Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

function fractionToFloat(numerator: BigInt, denominator: BigInt): number {
  return Number(numerator) / Number(denominator);
}
