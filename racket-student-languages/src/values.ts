import { Environment } from './environment.js';
import { 
  DivByZero, 
  StructureFunctionError 
} from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import * as utils from './utils.js';

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Interfaces
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

export interface RacketValue {
  /**
   * Does this value equal the given value.
   * @param other the given value
   */
  equals(other: RacketValue): boolean;
}

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

  equals(other: RacketValue): boolean {
    return isBoolean(other) && this.value === other.value;
  }
}

export const RACKET_TRUE = new RacketBoolean(true);
export const RACKET_FALSE = new RacketBoolean(false);

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Lists
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * A Racket list.
  */
export interface RacketList extends RacketValue {}

export class RacketConstructedList implements RacketList {
  readonly first: RacketValue;
  readonly rest: RacketList;

  constructor(first: RacketValue, rest: RacketList) {
    this.first = first;
    this.rest = rest;
  }

  toString(): string {
    return `(cons ${this.first.toString()} ${this.rest.toString()})`;
  }

  equals(other: RacketValue): boolean {
    return isConstructed(other) && this.first.equals(other.first) && this.rest.equals(other.rest);
  }
}

export class RacketEmptyList implements RacketList {
  toString(): string {
    return "'()";
  }

  equals(other: RacketValue): boolean {
    return isEmpty(other);
  }
}

export const RACKET_EMPTY_LIST = new RacketEmptyList();

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
  equals(other: RacketValue): boolean {
    throw new Error('Method not implemented.');
  }

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

  equals(other: RacketValue): boolean {
    return isExact(other) && this.numerator === other.numerator && this.denominator === other.denominator;
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

  equals(other: RacketValue): boolean {
    return isInexactFraction(other) && this.numerator === other.numerator && this.denominator === other.denominator;
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

  equals(other: RacketValue): boolean {
    return isInexactFloat(other) && this.value === other.value;
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

  equals(other: RacketValue): boolean {
    return isString(other) && this.value === other.value;
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
  readonly body: ir2.StmtToVisit;

  constructor(params: string[], body: ir2.StmtToVisit) {
    this.params = params;
    this.body = body;
  }

  equals(other: RacketValue): boolean {
    throw new Error('Method not implemented.');
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

type RacketStructureCallback = (args: RacketValue[]) => RacketValue;

class RacketStructureFunction implements RacketCallable {
  function: RacketStructureCallback;

  constructor(func: RacketStructureCallback) {
    this.function = func;
  }

  equals(other: RacketValue): boolean {
    throw new Error('Method not implemented.');
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

  equals(other: RacketValue): boolean {
    throw new Error('Method not implemented.');
  }

  /**
   * Produce a function that creates an instance of this Racket structure.
   */
  makeFunction(): RacketStructureFunction {
    return new RacketStructureFunction((args: RacketValue[]): RacketInstance => {
      let functionName = 'make-' + this.name;
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
   * Produce a function that determines whether some value is an instance of this structure.
   */
  isInstanceFunction(): RacketStructureFunction {
    return new RacketStructureFunction((args: RacketValue[]): RacketBoolean => {
      let functionName = 'make-' + this.name;
        if (args.length === 0) {
          this.error(`${functionName}: expects 1 argument, but found none`);
        } else if (args.length > 1) {
          this.error(`${functionName}: expects only 1 argument, but found ${args.length}`);
        } else {
          let instance = args[0];
          return instance instanceof RacketInstance && instance.type === this ? RACKET_TRUE : RACKET_FALSE;
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

  equals(other: RacketValue): boolean {
    if (!isInstance(other)) {
      return false;
    }
    for (let idx = 0; idx < this.values.length; idx++) {
      if (!this.values[idx].equals(other.values[idx])) {
        return false;
      }
    }
    return true;
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Symbols
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
* A Racket symbol.
*/
export class RacketSymbol implements RacketValue {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  toString(): string {
    return "'" + this.name;
  }

  equals(other: RacketValue): boolean {
    return isSymbol(other) && this.name === other.name;
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Type Guards
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export function isCallable(object: any): object is RacketCallable {
  return (object as RacketCallable).call !== undefined;
}

export function isBoolean(object: any): object is RacketBoolean {
  return object === RACKET_TRUE || object === RACKET_FALSE;
}

export function isComplex(object: any): object is RacketComplexNumber {
  return object instanceof RacketComplexNumber;
}

export function isConstructed(object: any): object is RacketConstructedList {
  return object instanceof RacketConstructedList;
}

export function isEmpty(object: any): object is RacketEmptyList {
  return object instanceof RacketEmptyList;
}

export function isExact(number: any): number is RacketExactNumber {
  return number instanceof RacketExactNumber;
}

export function isInstance(object: any): object is RacketInstance {
  return object instanceof RacketInstance;
}

export function isInexact(object: any): object is RacketInexactNumber {
  return object instanceof RacketInexactNumber;
}

function isInexactFloat(object: any): object is RacketInexactFloat {
  return object instanceof RacketInexactFloat;
}

function isInexactFraction(object: any): object is RacketInexactFraction {
  return object instanceof RacketInexactFraction;
}

export function isList(object: any): object is RacketList {
  return object instanceof RacketConstructedList
    || object === RACKET_EMPTY_LIST;
}

export function isNumber(object: any): object is RacketNumber {
  return object instanceof RacketNumber;
}

export function isRational(object: any): object is RacketExactNumber | RacketInexactFraction {
  return object instanceof RacketExactNumber
    || object instanceof RacketInexactFraction;
}

export function isReal(number: any): number is RacketRealNumber {
  return number instanceof RacketRealNumber;
}

export function isString(object: any): object is RacketString {
  return object instanceof RacketString;
}

export function isStructure(object: any): object is RacketStructure {
  return object instanceof RacketStructure;
}

export function isSymbol(object: any): object is RacketSymbol {
  return object instanceof RacketSymbol;
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Helper Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

function fractionToFloat(numerator: BigInt, denominator: BigInt): number {
  return Number(numerator) / Number(denominator);
}
