import { BuiltinFunctionError, UnreachableCode } from './errors.js';
import {
  isBoolean,
  isCallable,
  isComplex,
  isConstructed,
  isEmpty,
  isExact,
  isInexact,
  isInexactFloat,
  isInteger,
  isList,
  isNumber,
  isRational,
  isReal,
  isString,
  isSymbol,
  RacketBoolean,
  RacketCallable,
  RacketComplexNumber,
  RacketConstructedList,
  RacketExactNumber, 
  RacketInexactFloat, 
  RacketInexactFraction,
  RacketList,
  RacketNumber, 
  RacketRealNumber, 
  RacketString, 
  RacketStructure, 
  RacketSymbol, 
  RacketValue,
  RACKET_EMPTY_LIST,
  RACKET_FALSE,
  RACKET_TRUE
} from './values.js';

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Function representations of the built in functions.
 * 
 * Signatures and purpose statements are taken directly from
 * https://docs.racket-lang.org/htdp-langs/beginner.html.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * The Sections of this File (in order):
 *    Abstract Classes
 *    Numeric Functions
 *    Boolean Functions
 *    Symbol Functions
 *    Character Functions
 *    String Functions
 *    Error Handling
 *    Helper Functions
 *    Mapping
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Abstract Class
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export abstract class RacketBuiltInFunction implements RacketCallable {
  readonly name: string;
  readonly min: number;
  readonly max: number;

  constructor(name: string, min: number, max: number) {
    this.name = name;
    this.min = min;
    this.max = max;
  }

  equals(other: RacketValue): boolean {
    throw new Error('Method not implemented.');
  }
  
  call(args: RacketValue[]): RacketValue {
    if (this.max === Infinity && this.min > 0) {
      assertAtLeastNArguments(this.name, this.min, args.length);
    } else if (this.min === this.max) {
      assertExactlyNArguments(this.name, this.min, args.length);
    }

    // return bogus value for the typechecker
    return new RacketExactNumber(0n, 0n);
  }

  /**
   * Raise an error.
   * @param msg the error message
   */
  error(msg: string): never {
    throw new BuiltinFunctionError(msg);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Numeric Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 * (* x y z) → number
 *    x : number
 *    y : number
 *    z : number
 * Purpose Statement:
 *    Multiplies all numbers.
 */
class SymStar extends RacketBuiltInFunction {
  constructor() {
    super('*', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    let result: RacketNumber = new RacketExactNumber(1n, 1n);
    for (let number of numbers) {
      result = result.mul(number);
    }
    return result;
  }
}

/* Signature:
 *    (+ x y z ...) → number
 *      x : number
 *      y : number
 *      z : number
 * Purpose Statement:
 *    Adds up all numbers.
 */
class SymPlus extends RacketBuiltInFunction {
  constructor() {
    super('+', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    let result: RacketNumber = new RacketExactNumber(0n, 1n);
    for (let number of numbers) {
      result = result.add(number);
    }
    return result;
  }
}

/* Signature:
 * (- x y ...) → number
 *    x : number
 *    y : number
 * Purpose Statement:
 *    Subtracts the second (and following) number(s) from the first ; negates
 *    the number if there is only one argument.
 */
class SymMinus extends RacketBuiltInFunction {
  constructor() {
    super('-', 1, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    if (args.length === 1) {
      return numbers[0].negated();
    } else {
      let result: RacketNumber = numbers[0];
      for (let idx = 1; idx < numbers.length; idx++) {
        result = result.sub(numbers[idx]);
      }
      return result;
    }
  }
}

/* Signature:
 * (/ x y z ...) → number
 *    x : number
 *    y : number
 *    z : number
 * Purpose Statement:
 *    Divides the first by the second (and all following) number(s).
 */
class SymDivide extends RacketBuiltInFunction {
  constructor() {
    super('/', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    let result: RacketNumber = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      result = result.div(numbers[i]);
    }
    return result;
  }
}

/* Signature:
 * (< x y z ...) → boolean?
 *    x : real
 *    y : real
 *    z : real
 * Purpose Statement:
 *    Compares (real) numbers for less-than.
 */
class SymLt extends RacketBuiltInFunction {
  constructor() {
    super('<', 2, Infinity);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    for (let idx = 0; idx < reals.length - 1; idx++) {
      if (!reals[idx].lt(reals[idx+1])) {
        return RACKET_FALSE;
      }
    }
    return RACKET_TRUE;
  }
}

/* Signature:
 * (<= x y z ...) → boolean?
 *    x : real
 *    y : real
 *    z : real
 * Purpose Statement:
 *    Compares (real) numbers for less-than or equality.
 */
class SymLeq extends RacketBuiltInFunction {
  constructor() {
    super('<=', 2, Infinity);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    for (let idx = 0; idx < reals.length - 1; idx++) {
      if (!reals[idx].leq(reals[idx+1])) {
        return RACKET_FALSE;
      }
    }
    return RACKET_TRUE;
  }
}

/* Signature:
 * (= x y z ...) → boolean?
 *    x : number
 *    y : number
 *    z : number
 * Purpose Statement:
 *    Compares numbers for equality.
 */
class SymEq extends RacketBuiltInFunction {
  constructor() {
    super('=', 2, Infinity);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    let first: RacketNumber = numbers[0];
      for (let idx = 1; idx < numbers.length; idx++) {
        if (!first.equals(numbers[idx])) {
          return toRacketBoolean(false);
        }
      }
    return toRacketBoolean(true);
  }
}

/* Signature:
 * (> x y z ...) → boolean?
 *    x : real
 *    y : real
 *    z : real
 * Purpose Statement:
 *    Compares (real) numbers for greater-than.
 */
class SymGt extends RacketBuiltInFunction {
  constructor() {
    super('>', 2, Infinity);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    for (let idx = 0; idx < reals.length - 1; idx++) {
      if (!reals[idx].gt(reals[idx+1])) {
        return RACKET_FALSE;
      }
    }
    return RACKET_TRUE;
  }
}

/* Signature:
 * (>= x y z ...) → boolean?
 *    x : real
 *    y : real
 *    z : real
 * Purpose Statement:
 *    Compares (real) numbers for greater-than or equality.
 */
class SymGeq extends RacketBuiltInFunction {
  constructor() {
    super('>=', 2, Infinity);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    for (let idx = 0; idx < reals.length - 1; idx++) {
      if (!reals[idx].geq(reals[idx+1])) {
        return RACKET_FALSE;
      }
    }
    return RACKET_TRUE;
  }
}

/* Signature:
 * (abs x) → real
 *    x : real
 * Purpose Statement:
 *    Determines the absolute value of a real number.
 */
class Abs extends RacketBuiltInFunction {
  constructor() {
    super('abs', 1, 1);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    let real = reals[0];
    return real.isNegative() ? real.negated() : real;
  }
}

/* Signature:
 * (add1 x) → number
 *    x : number
 * Purpose Statement:
 *    Increments the given number.
 */
class Add1 extends RacketBuiltInFunction {
  constructor() {
    super('add1', 1, 1);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    return numbers[0].add(new RacketExactNumber(1n, 1n));
  }
}

/* Signature:
 * (ceiling x) → integer
 *    x : real
 * Purpose Statement:
 *    Determines the closest integer (exact or inexact) above a real number. See `round`.
 */
class Ceiling extends RacketBuiltInFunction {
  constructor() {
    super('ceiling', 1, 1);
  }

  call(args: RacketValue[]): RacketExactNumber | RacketInexactFraction {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    return reals[0].ceiling();
  }
}

/* Signature:
 * (complex? x) → boolean?
 *    x : real
 * Purpose Statement:
 *    Determines whether some value is complex.
 */
class ComplexHuh extends RacketBuiltInFunction {
  constructor() {
    super('complex?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isComplex(args[0]));
  }
}

/* Signature:
 * (even? x) → boolean?
 *    x : integer
 * Purpose Statement:
 *    Determines if some integer (exact or inexact) is even or not. 
 */
class EvenHuh extends RacketBuiltInFunction {
  constructor() {
    super('even?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let integers = assertListOfIntegers(this.name, args);
    return toRacketBoolean(integers[0].numerator % 2n === 0n);
  }
}

/* Signature:
 * (exact->inexact x) → number
 *    x : number
 * Purpose Statement:
 *    Converts an exact number to an inexact one.
 */
class ExactToInexact extends RacketBuiltInFunction {
  constructor() {
    super('exact->inexact', 1, 1);
  }

  call(args: RacketValue[]): RacketInexactFloat | RacketInexactFraction | RacketComplexNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    return numbers[0].inexact();
  }
}

/* Signature:
 * (exact? x) → boolean?
 *    x : number
 * Purpose Statement:
 *    Determines whether some number is exact.
 */
class ExactHuh extends RacketBuiltInFunction {
  constructor() {
    super('exact?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    assertListOfNumbers(this.name, args);
    return toRacketBoolean(isExact(args[0]));
  }
}

/* Signature:
 * (floor x) → integer
 *    x : real
 * Purpose Statement:
 *    Determines the closest integer (exact or inexact) below a real number. See `round`.
 */
class Floor extends RacketBuiltInFunction {
  constructor() {
    super('floor', 1, 1);
  }

  call(args: RacketValue[]): RacketExactNumber | RacketInexactFraction {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    return reals[0].floor();
  }
}

/* Signature:
 * (inexact? x) → boolean?
 *    x : number
 * Purpose Statement:
 *    Determines whether some number is inexact.
 */
class InexactHuh extends RacketBuiltInFunction {
  constructor() {
    super('inexact?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    assertListOfNumbers(this.name, args);
    return toRacketBoolean(isInexact(args[0]));
  }
}

/* Signature:
 * (integer? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some number is an integer (exact or inexact).
 */
class IntegerHuh extends RacketBuiltInFunction {
  constructor() {
    super('integer?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isInteger(args[0]));
  }
}

/* Signature:
 * (make-rectangular x y) → number
 *    x : real
 *    y : real
 * Purpose Statement:
 *    Creates a complex number from a real and an imaginary part.
 */
class MakeRectangular extends RacketBuiltInFunction {
  constructor() {
    super('make-rectangular', 2, 2);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    let real = reals[0];
    let imaginary = reals[1];
    if (imaginary.isZero()) {
      return real;
    } else {
      return new RacketComplexNumber(real, imaginary);
    }
  }
}

/* Signature:
 * (max x y ...) → real
 *    x : real
 *    y : real
 * Purpose Statement:
 *    Determines the largest number—aka, the maximum.
 */
class Max extends RacketBuiltInFunction {
  constructor() {
    super('max', 1, Infinity);
  }

  call(args: RacketValue[]): RacketRealNumber {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    if (args.length === 1) {
      return reals[0];
    } else {
      let largest: RacketRealNumber = reals[0];
      for (let idx = 1; idx < reals.length; idx++) {
        let next = reals[idx];
        if (isInexactFloat(next) && isNaN(next.value)) {
          return next;
        } else if (next.gt(largest)) {
          largest = next;
        }
      }
      return largest;
    }
  }
}

/* Signature:
 * (min x y ...) → real
 *    x : real
 *    y : real
 * Purpose Statement:
 *    Determines the smallest number—aka, the minimum.
 */
class Min extends RacketBuiltInFunction {
  constructor() {
    super('min', 1, Infinity);
  }

  call(args: RacketValue[]): RacketRealNumber {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    if (args.length === 1) {
      return reals[0];
    } else {
      let smallest: RacketRealNumber = reals[0];
      for (let idx = 1; idx < reals.length; idx++) {
        let next = reals[idx];
        if (isInexactFloat(next) && isNaN(next.value)) {
          return next;
        } else if (next.lt(smallest)) {
          smallest = next;
        }
      }
      return smallest;
    }
  }
}

/* Signature:
 * (modulo x y) → integer
 *    x : integer
 *    y : integer
 * Purpose Statement:
 *    Finds the remainder of the division of the first number by the second.
 */
class Modulo extends RacketBuiltInFunction {
  constructor() {
    super('modulo', 2, 2);
  }

  call(args: RacketValue[]): RacketExactNumber | RacketInexactFraction {
    super.call(args);
    let integers = assertListOfIntegers(this.name, args);
    let number = integers[0].numerator;
    let modulus = integers[1].numerator;
    let exact = isExact(integers[0]) && isExact(integers[1]);
    let numerator: bigint;
    if (modulus === 0n) {
      this.error('modulo: undefined for 0');
    } else if (number === 0n) {
      numerator = 0n;
    } else if (modulus > 0) {
      // https://web.archive.org/web/20090717035140if_/javascript.about.com/od/problemsolving/a/modulobug.htm
      numerator = ((number % modulus) + modulus) % modulus;
    } else {
      if (number > 0n) {
        numerator = (number % (-1n * modulus)) + modulus;
      } else {
        numerator = number % modulus;
      }
    }
    if (exact) {
      return new RacketExactNumber(numerator, 1n);
    } else {
      return new RacketInexactFraction(numerator, 1n);
    }
  }
}

/* Signature:
 * (negative? x) → boolean?
 *    x : real
 * Purpose Statement:
 *    Determines if some real number is strictly smaller than zero.
 */
class NegativeHuh extends RacketBuiltInFunction {
  constructor() {
    super('negative?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    return toRacketBoolean(reals[0].isNegative());
  }
}

/* Signature:
 * (number->string? x) → string
 *    x : number
 * Purpose Statement:
 *    Converts a number to a string. 
 */
class NumberToString extends RacketBuiltInFunction {
  constructor() {
    super('number->string', 1, 1);
  }

  call(args: RacketValue[]): RacketString {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    return new RacketString(numbers[0].toString());
  }
}

/* Signature:
 * (number? n) → boolean?
 *    n : any/c
 * Purpose Statement:
 *    Determines whether some value is a number.
 */
class NumberHuh extends RacketBuiltInFunction {
  constructor() {
    super('number?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isNumber(args[0]));
  }
}

/* Signature:
 * (odd? x) → boolean?
 *    x : integer
 * Purpose Statement:
 *    Determines if some integer (exact or inexact) is odd or not. 
 */
class OddHuh extends RacketBuiltInFunction {
  constructor() {
    super('odd?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let integers = assertListOfIntegers(this.name, args);
    return toRacketBoolean(integers[0].numerator % 2n === 1n);
  }
}

/* Signature:
 * (positive? x) → boolean?
 *    x : real
 * Purpose Statement:
 *    Determines if some real number is strictly larger than zero.
 */
class PositiveHuh extends RacketBuiltInFunction {
  constructor() {
    super('positive?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    return toRacketBoolean(reals[0].isPositive());
  }
}

/* Signature:
 * (rational? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is a rational number.
 */
class RationalHuh extends RacketBuiltInFunction {
  constructor() {
    super('rational?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isRational(args[0]));
  }
}

/* Signature:
 * (real? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is a real number.
 */
class RealHuh extends RacketBuiltInFunction {
  constructor() {
    super('real?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isReal(args[0]));
  }
}

/* Signature:
 * (sgn x) → (union 1 #i1.0 0 #0.0 -1 #i-1.0)
 *    x : real
 * Purpose Statement:
 *    Determines the sign of a real number.
 */
 class Sgn extends RacketBuiltInFunction {
  constructor() {
    super('sgn', 1, 1);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let reals = assertListOfReals(this.name, args);
    let real = reals[0];
    if (real.isPositive()) {
      return isExact(real) 
        ? new RacketExactNumber(1n, 1n) 
        : new RacketInexactFraction(1n, 1n);
    } else if (real.isNegative()) {
      return isExact(real) 
        ? new RacketExactNumber(-1n, 1n) 
        : new RacketInexactFraction(-1n, 1n);
    } else {
      return isExact(real) 
        ? new RacketExactNumber(0n, 1n) 
        : new RacketInexactFraction(0n, 1n);
    }
  }
}

/* Signature:
 * (sub1 x) → number
 *    x : number
 * Purpose Statement:
 *    Decrements the given number.
 */
class Sub1 extends RacketBuiltInFunction {
  constructor() {
    super('sub1', 1, 1);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    return numbers[0].sub(new RacketExactNumber(1n, 1n));
  }
}

/* Signature:
 * (zero? x) → boolean?
 *    x : number
 * Purpose Statement:
 *    Determines if some number is zero or not.
 */
class ZeroHuh extends RacketBuiltInFunction {
  constructor() {
    super('zero?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    return toRacketBoolean(numbers[0].isZero());
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Boolean Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 * (boolean->string x) → string
 *    x : boolean?
 * Purpose Statement:
 *    Produces a string for the given boolean.
 */
 class BooleanToString extends RacketBuiltInFunction {
  constructor() {
    super('boolean->string', 1, 1);
  }

  call(args: RacketValue[]): RacketString {
    super.call(args);
    let booleans = assertListOfBooleans(this.name, args);
    return new RacketString(booleans[0].toString());
  }
}

/* Signature:
 * (boolean=? x y) → boolean?
 *    x : boolean?
 *    y : boolean?
 * Purpose Statement:
 *    Determines whether two booleans are equal.
 */
class BooleanSymEqHuh extends RacketBuiltInFunction {
  constructor() {
    super('boolean=?', 2, 2);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let booleans = assertListOfBooleans(this.name, args);
    return toRacketBoolean(booleans[0] === booleans[1]);
  }
}

/* Signature:
 *  (boolean? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is a boolean.
 */
 class BooleanHuh extends RacketBuiltInFunction {
  constructor() {
    super('boolean?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isBoolean(args[0]));
  }
}

/* Signature:
 *  (false? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is false.
 */
class FalseHuh extends RacketBuiltInFunction {
  constructor() {
    super('false?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isBoolean(args[0]) && args[0] === RACKET_FALSE);
  }
}

/* Signature:
 *  (not x) → boolean?
 *    x : boolean?
 * Purpose Statement:
 *    Negates a boolean value.
 */
class Not extends RacketBuiltInFunction {
  constructor() {
    super('not', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let booleans = assertListOfBooleans(this.name, args);
    return toRacketBoolean(!booleans[0].value);
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Symbol Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 *  (symbol->string x) → string
 *    x : symbol
 * Purpose Statement:
 *    Converts a symbol to a string.
 */
class SymbolToString extends RacketBuiltInFunction {
  constructor() {
    super('symbol->string', 1, 1);
  }

  call(args: RacketValue[]): RacketString {
    super.call(args);
    let symbols = assertListOfSymbols(this.name, args);
    return new RacketString(symbols[0].toString().substr(1));
  }
}

/* Signature:
 *  (symbol=? x y) → boolean?
 *    x : symbol
 *    y : symbol
 * Purpose Statement:
 *    Determines whether two symbols are equal.
 */
class SymbolSymEqHuh extends RacketBuiltInFunction {
  constructor() {
    super('symbol=?', 2, 2);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let symbols = assertListOfSymbols(this.name, args);
    return toRacketBoolean(symbols[0].equals(symbols[1]));
  }
}

/* Signature:
 *  (symbol? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is a symbol.
 */
class SymbolHuh extends RacketBuiltInFunction {
  constructor() {
    super('symbol?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isSymbol(args[0]));
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * List Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 * (append x y z ...) → list?
 *    x : list?
 *    y : list?
 *    z : list?
 * Purpose Statement:
 *    Creates a single list from several, by concatenation of the items.
 */
class Append extends RacketBuiltInFunction {
  constructor() {
    super('append', 2, Infinity);
  }

  call(args: RacketValue[]): RacketList {
    super.call(args);
    if (!isList(args[args.length - 1])) {
      this.error(`append: last argument must be a list, but received ${args[args.length-1].toString()}`);
    }
    let elements: RacketValue[] = [];
    for (let arg of args) {
      if (!isList(arg)) {
        // @ts-ignore
        this.error(`append: expects a list, given ${arg.toString()}`);
      }
      let list = arg;
      while (isConstructed(list)) {
        elements.push(list.first);
        list = list.rest;
      }
    }
    let list: RacketList = RACKET_EMPTY_LIST;
    for (let idx = elements.length - 1; idx >= 0; idx--) {
      list = new RacketConstructedList(elements[idx], list);
    }
    return list;
  }
}

/* Signature:
 *  (cons x y) → list?
 *    x : any/x
 *    y : list?
 * Purpose Statement:
 *    Constructs a list.
 */
class Cons extends RacketBuiltInFunction {
  constructor() {
    super('cons', 2, 2);
  }

  call(args: RacketValue[]): RacketList {
    super.call(args);
    if (!isList(args[1])) {
      error(`cons: second argument must be a list, but received ${args[0].toString()} and ${args[0].toString()}`);
    }
    return new RacketConstructedList(args[0], args[1]);
  }
}

/* Signature:
 *  (eighth x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the eighth item of a non-empty list.
 */
class Eighth extends RacketBuiltInFunction {
  constructor() {
    super('eighth', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 8, args[0])
    return list.first;
  }
}

/* Signature:
 *  (empty? x) → boolean?
 *    x : any/c
 * Purpose Statement:
 *    Determines whether some value is the empty list.
 */
class EmptyHuh extends RacketBuiltInFunction {
  constructor() {
    super('empty?', 1, 1);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    return toRacketBoolean(isEmpty(args[0]));
  }
}

/* Signature:
 *  (fifth x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the fifth item of a non-empty list.
 */
class Fifth extends RacketBuiltInFunction {
  constructor() {
    super('fifth', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 5, args[0])
    return list.first;
  }
}

/* Signature:
 *  (first x) → any/c
 *    x : cons?
 * Purpose Statement:
 *    Selects the first item of a non-empty list.
 */
class First extends RacketBuiltInFunction {
  constructor() {
    super('first', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 1, args[0])
    return list.first;
  }
}

/* Signature:
 *  (fourth x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the fourth item of a non-empty list.
 */
class Fourth extends RacketBuiltInFunction {
  constructor() {
    super('fourth', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 4, args[0])
    return list.first;
  }
}

/* Signature:
 *  (length x) → natural-number?
 *    x : any/c
 * Purpose Statement:
 *    Evaluates the number of items on a list.
 */
class Length extends RacketBuiltInFunction {
  constructor() {
    super('length', 1, 1);
  }

  call(args: RacketValue[]): RacketExactNumber {
    super.call(args);
    let list = assertList(this.name, args[0]);
    let length = 0n;
    while (isConstructed(list)) {
      length++;
      list = list.rest;
    }
    return new RacketExactNumber(length, 1n);
  }
}

/* Signature:
 *  (list x ...) → list?
 *    x : any/c
 * Purpose Statement:
 *    Constructs a list of its arguments.
 */
class List extends RacketBuiltInFunction {
  constructor() {
    super('list', 0, Infinity);
  }

  call(args: RacketValue[]): RacketList {
    super.call(args);
    let list = RACKET_EMPTY_LIST;
    for (let idx = args.length - 1; idx >= 0; idx--) {
      list = new RacketConstructedList(args[idx], list);
    }
    return list;
  }
}

/* Signature:
 *  (list? x) → boolean?
 *    x : any
 * Purpose Statement:
 *    Checks whether the given value is a list.
 */
class ListHuh extends RacketBuiltInFunction {
  constructor() {
    super('list?', 1, 1);
  }

  call(args: RacketValue[]): RacketList {
    super.call(args);
    return toRacketBoolean(isList(args[0]));
  }
}

/* Signature:
 *  (rest x) → any/c
 *    x : cons?
 * Purpose Statement:
 *    Selects the rest of a non-empty list.
 */
class Rest extends RacketBuiltInFunction {
  constructor() {
    super('rest', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 1, args[0])
    return list.rest;
  }
}

/* Signature:
 *  (second x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the second item of a non-empty list. 
 */
class Second extends RacketBuiltInFunction {
  constructor() {
    super('second', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 2, args[0])
    if (!isConstructed(list)) {
      throw new UnreachableCode();
    }
    return list.first;
  }
}

/* Signature:
 *  (seventh x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the seventh item of a non-empty list. 
 */
class Seventh extends RacketBuiltInFunction {
  constructor() {
    super('seventh', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 7, args[0])
    if (!isConstructed(list)) {
      throw new UnreachableCode();
    }
    return list.first;
  }
}

/* Signature:
 *  (sixth x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the sixth item of a non-empty list. 
 */
class Sixth extends RacketBuiltInFunction {
  constructor() {
    super('sixth', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 6, args[0])
    if (!isConstructed(list)) {
      throw new UnreachableCode();
    }
    return list.first;
  }
}

/* Signature:
 *  (third x) → any/c
 *    x : list?
 * Purpose Statement:
 *    Selects the third item of a non-empty list. 
 */
class Third extends RacketBuiltInFunction {
  constructor() {
    super('third', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    let list = assertListOfLengthAtLeastN(this.name, 3, args[0])
    if (!isConstructed(list)) {
      throw new UnreachableCode();
    }
    return list.first;
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Character Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
* String Functions
* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 *  (string=? s t) → boolean?
 *    s : string
 *    t : string
 * Purpose Statement:
 *    Determines whether all strings are equal, character for character.
 */
class StringSymEqHuh extends RacketBuiltInFunction {
  constructor() {
    super('string=?', 2, 2);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let strings = assertListOfStrings(this.name, args);
    return toRacketBoolean(strings[0].equals(strings[1]));
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Image Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Miscellaneous Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/* Signature:
 *  (identity x) → any
 *    x : any/c
 * Purpose Statement:
 *    Returns `x`.
 */
class Identity extends RacketBuiltInFunction {
  constructor() {
    super('identity', 1, 1);
  }

  call(args: RacketValue[]): RacketValue {
    super.call(args);
    return args[0];
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Assertions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
 * Assert that the function has at least `n` arguments.
 * @param name the name of the function
 * @param minimum the minimum number of arguments expected
 * @param received the number of arguments received
 */
function assertAtLeastNArguments(name: string, minimum: number, received: number): void {
  if (minimum <= received) {
    return;
  }
  let errMsg = name + ': ';
  errMsg += `expects at least ${minimum} argument${minimum === 1 ? '' : 's'}, `;
  if (received === 0) {
    errMsg += 'but received none';
  } else {
    errMsg += `but received only ${received}`;
  }
  error(errMsg);
}

/**
 * Assert that the value is a list with at least `n` elements.
 * @param name the name of the function
 * @param minimum the minimum number of elements expected
 * @param received the value received
 */
function assertListOfLengthAtLeastN(name: string, minimum: number, received: RacketValue): RacketConstructedList {
  let list = received;
  for (let count = 0; count < minimum; count++) {
    if (!isConstructed(list)) {
      let errMsg = name + ': ';
      if (minimum === 1) {
        errMsg += 'expects a non-empty list; ';
      } else {
        errMsg += `expects a list with ${minimum} or more items; `;
      }
      errMsg += 'given ' + received.toString();
      error(errMsg)
    }
    if (count + 1 == minimum) {
      break;
    }
    list = list.rest;
  }
  if (!isConstructed(list)) {
    throw new UnreachableCode();
  }
  return list;
}

/**
 * Assert that the function has exactly `n` arguments.
 * @param name the name of the function
 * @param expected the number of arguments expected
 * @param received the number of arguments received
 */
function assertExactlyNArguments(name: string, expected: number, received: number):  void {
  if (expected == received) {
    return;
  }
  let errMsg = name + ': ';
  if (expected < received) {
    errMsg += `expects only ${expected} argument${expected === 1 ? '' : 's'}, but found ${received}`;
  } else {
    errMsg += `expects ${expected} argument${expected === 1 ? '' : 's'}, `;
    if (received === 0) {
      errMsg += 'but found none';
    } else {
      errMsg += `but found only ${received}`;
    }
  }
  error(errMsg);
}

/**
 * Assert that the arguments are all integers.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertList(name: string, arg: RacketValue): RacketList {
  if (!isList(arg)) {
    // @ts-ignore
    error(`${name}: expects a list, given ${arg.toString()}`)
  }
  return arg;
}

/**
 * Assert that the arguments are all integers.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfIntegers(name: string, args: RacketValue[]): (RacketExactNumber | RacketInexactFraction)[] {
  let integers: (RacketExactNumber | RacketInexactFraction)[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isInteger(arg)) {
      if (args.length === 1) {
        error(`${name}: expects integer, given ${arg.toString()}`);
      } else {
        error(`${name}: expects integer as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    integers.push(arg);
  });
  return integers;
}

/**
 * Assert that the arguments are all numbers.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfNumbers(name: string, args: RacketValue[]): RacketNumber[] {
  let numbers: RacketNumber[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isNumber(arg)) {
      if (args.length === 1) {
        error(`${name}: expects a number, given ${arg.toString()}`);
      } else {
        error(`${name}: expects a number as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    numbers.push(arg);
  });
  return numbers;
}

/**
 * Assert that the arguments are all real numbers.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfReals(name: string, args: RacketValue[]): RacketRealNumber[] {
  let numbers: RacketRealNumber[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isReal(arg)) {
      if (args.length === 1) {
        error(`${name}: expects a real, given ${arg.toString()}`);
      } else {
        error(`${name}: expects a real as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    numbers.push(arg);
  });
  return numbers;
}

/**
 * Assert that the arguments are all numbers.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfBooleans(name: string, args: RacketValue[]): RacketBoolean[] {
  let booleans: RacketBoolean[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isBoolean(arg)) {
      if (args.length === 1) {
        error(`${name}: expected either #true or #false; given ${arg.toString()}`);
      } else {
        error(`${name}: expects a boolean as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    booleans.push(arg);
  });
  return booleans;
}

/**
 * Assert that the arguments are all symbols.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfSymbols(name: string, args: RacketValue[]): RacketSymbol[] {
  let symbols: RacketSymbol[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isSymbol(arg)) {
      if (args.length === 1) {
        error(`${name}: expects a symbol; given ${arg.toString()}`);
      } else {
        error(`${name}: expects a symbol as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    symbols.push(arg);
  });
  return symbols;
}

/**
 * Assert that the arguments are all strings.
 * @param name the name of the function
 * @param args the received arguments
 */
function assertListOfStrings(name: string, args: RacketValue[]): RacketString[] {
  let strings: RacketString[] = [];
  args.forEach((arg, idx) => {
    if (isCallable(arg)) {
      error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isString(arg)) {
      if (args.length === 1) {
        error(`${name}: expects a string; given ${arg.toString()}`);
      } else {
        error(`${name}: expects a string as ${ordinal(idx + 1)} argument, given ${arg.toString()}`);
      }
    }
    strings.push(arg);
  });
  return strings;
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Error Handling
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

function error(msg: string): never {
  throw new BuiltinFunctionError(msg);
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Helper Functions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
 * Convert a number to an ordinal.
 * 
 * Stolen shamelessly from
 * https://stackoverflow.com/questions/13627308/add-st-nd-rd-and-th-ordinal-suffix-to-a-number.
 * 
 * @param n the number to be converted
 */
function ordinal(n: number): string {
  var j = n % 10,
      k = n % 100;
  if (j == 1 && k != 11) {
      return n + "st";
  }
  if (j == 2 && k != 12) {
      return n + "nd";
  }
  if (j == 3 && k != 13) {
      return n + "rd";
  }
  return n + "th";
}

/**
 * Return the Racket equivalent of the boolean value.
 * @param bool the boolean value
 */
function toRacketBoolean(bool: boolean) {
  return bool ? RACKET_TRUE : RACKET_FALSE;
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Creates a mapping of built in names to their corresponding racket values.
 * 
 * Note:
 *  Mathematical constants are approximated using fractions, and so they will
 *  appear to be rational.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

function addBuiltinFunction(fun: RacketBuiltInFunction): void {
  BUILT_INS.set(fun.name, fun);
}

function addBuiltInStructure(structure: RacketStructure): void {
  let name = structure.name;
  let fields = structure.fields;
  let makeFunction = structure.makeFunction();
  let isInstanceFunction = structure.isInstanceFunction();
  let getFunctions = structure.getFunctions();
  BUILT_INS.set('make-' + name, makeFunction);
  BUILT_INS.set(name + '?', isInstanceFunction);
  for (let i = 0; i < fields.length; i++) {
    BUILT_INS.set(`${name}-${fields[i]}`, getFunctions[i]);
  }
}

// Map from Name → Value
let BUILT_INS: Map<string, RacketValue> = new Map();
/* Numeric Functions */
addBuiltinFunction(new SymStar());
addBuiltinFunction(new SymPlus());
addBuiltinFunction(new SymMinus());
addBuiltinFunction(new SymDivide());
addBuiltinFunction(new SymLt());
addBuiltinFunction(new SymLeq());
addBuiltinFunction(new SymEq());
addBuiltinFunction(new SymGt());
addBuiltinFunction(new SymGeq());
addBuiltinFunction(new Abs());
// addBuiltinFunction(new Acos());
addBuiltinFunction(new Add1());
// addBuiltinFunction(new Angle());
// addBuiltinFunction(new Asin());
// addBuiltinFunction(new Atan());
addBuiltinFunction(new Ceiling());
addBuiltinFunction(new ComplexHuh());
// addBuiltinFunction(new Conjugate());
// addBuiltinFunction(new Cos());
// addBuiltinFunction(new Cosh());
// addBuiltinFunction(new CurrentSeconds());
// addBuiltinFunction(new Denominator());
addBuiltinFunction(new EvenHuh());
addBuiltinFunction(new ExactToInexact());
addBuiltinFunction(new ExactHuh());
// addBuiltinFunction(new Exp());
// addBuiltinFunction(new Expt());
addBuiltinFunction(new Floor());
// addBuiltinFunction(new Gcd());
// addBuiltinFunction(new ImagPart());
// addBuiltinFunction(new InexactToExact());
addBuiltinFunction(new InexactHuh());
// addBuiltinFunction(new IntegerToChar());
// addBuiltinFunction(new IntegerSqrt());
addBuiltinFunction(new IntegerHuh());
// addBuiltinFunction(new Lcm());
// addBuiltinFunction(new Log());
// addBuiltinFunction(new Magnitude());
// addBuiltinFunction(new MakePolar());
addBuiltinFunction(new MakeRectangular());
addBuiltinFunction(new Max());
addBuiltinFunction(new Min());
addBuiltinFunction(new Modulo());
addBuiltinFunction(new NegativeHuh());
addBuiltinFunction(new NumberToString());
// addBuiltinFunction(new NumberToStringDigits());
addBuiltinFunction(new NumberHuh());
// addBuiltinFunction(new Numerator());
addBuiltinFunction(new OddHuh());
addBuiltinFunction(new PositiveHuh());
// addBuiltinFunction(new Quotient());
// addBuiltinFunction(new Random());
addBuiltinFunction(new RationalHuh());
// addBuiltinFunction(new RealPart());
addBuiltinFunction(new RealHuh());
// addBuiltinFunction(new Remainder());
// addBuiltinFunction(new Round());
addBuiltinFunction(new Sgn());
// addBuiltinFunction(new Sin());
// addBuiltinFunction(new Sinh());
// addBuiltinFunction(new Sqr());
// addBuiltinFunction(new Sqrt());
addBuiltinFunction(new Sub1());
// addBuiltinFunction(new Tan());
addBuiltinFunction(new ZeroHuh());
/* Boolean Functions */
addBuiltinFunction(new BooleanToString());
addBuiltinFunction(new BooleanSymEqHuh());
addBuiltinFunction(new BooleanHuh());
addBuiltinFunction(new FalseHuh());
addBuiltinFunction(new Not());
/* Symbol Functions */
addBuiltinFunction(new SymbolToString());
addBuiltinFunction(new SymbolSymEqHuh());
addBuiltinFunction(new SymbolHuh());
/* List Functions */
addBuiltinFunction(new Append());
// addBuiltinFunction(new Assoc());
// addBuiltinFunction(new Assq());
// addBuiltinFunction(new Caaar());
// addBuiltinFunction(new Caadr());
// addBuiltinFunction(new Caar());
// addBuiltinFunction(new Cadar());
// addBuiltinFunction(new Cadddr());
// addBuiltinFunction(new Caddr());
// addBuiltinFunction(new Cadr());
// addBuiltinFunction(new Car());
// addBuiltinFunction(new Cdaar());
// addBuiltinFunction(new Cdadr());
// addBuiltinFunction(new Cdar());
// addBuiltinFunction(new Cddar());
// addBuiltinFunction(new Cdddr());
// addBuiltinFunction(new Cddr());
// addBuiltinFunction(new Cdr());
addBuiltinFunction(new Cons());
addBuiltinFunction(new Eighth());
addBuiltinFunction(new EmptyHuh());
addBuiltinFunction(new Fifth());
addBuiltinFunction(new First());
addBuiltinFunction(new Fourth());
addBuiltinFunction(new Length());
addBuiltinFunction(new List());
// addBuiltinFunction(new ListStar());
// addBuiltinFunction(new ListRef());
addBuiltinFunction(new ListHuh());
// addBuiltinFunction(new MakeList());
// addBuiltinFunction(new Member());
// addBuiltinFunction(new MemberHuh());
// addBuiltinFunction(new Memq());
// addBuiltinFunction(new MemqHuh());
// addBuiltinFunction(new Memv());
// addBuiltinFunction(new NullHuh());
// addBuiltinFunction(new Range());
// addBuiltinFunction(new Remove());
// addBuiltinFunction(new RemoveAll());
addBuiltinFunction(new Rest());
// addBuiltinFunction(new Reverse());
addBuiltinFunction(new Second());
addBuiltinFunction(new Seventh());
addBuiltinFunction(new Sixth());
addBuiltinFunction(new Third());
/* Character Functions */
// addBuiltinFunction(new CharToInteger());
// addBuiltinFunction(new CharAlphanumicHuh());
// addBuiltinFunction(new CharCiSyLeqHuh());
// addBuiltinFunction(new CharCiSymLtHuh());
// addBuiltinFunction(new CharCiSymEqHuh());
// addBuiltinFunction(new CharCiSymGeqHuh());
// addBuiltinFunction(new CharCiSymGtHuh());
// addBuiltinFunction(new CharDowncase());
// addBuiltinFunction(new CharLowerCaseHuh());
// addBuiltinFunction(new CharNumericHuh());
// addBuiltinFunction(new CharUpcase());
// addBuiltinFunction(new CharUpperCaseHuh());
// addBuiltinFunction(new CharWhitespaceHuh());
// addBuiltinFunction(new CharSymLeqHuh());
// addBuiltinFunction(new CharSymLtHuh());
// addBuiltinFunction(new CharSymEqHuh());
// addBuiltinFunction(new CharSymGeqHuh());
// addBuiltinFunction(new CharSymGtHuh());
// addBuiltinFunction(new CharHuh());
/* String Functions */
// addBuiltinFunction(new Explode());
// addBuiltinFunction(new Format());
// addBuiltinFunction(new Implode());
// addBuiltinFunction(new IntToString());
// addBuiltinFunction(new ListToString());
// addBuiltinFunction(new MakeString());
// addBuiltinFunction(new Replicate());
// addBuiltinFunction(new String());
// addBuiltinFunction(new StringToInt());
// addBuiltinFunction(new StringToList());
// addBuiltinFunction(new StringToNumber());
// addBuiltinFunction(new StringToSymbol());
// addBuiltinFunction(new StringAlphabeticHuh());
// addBuiltinFunction(new StringAppend());
// addBuiltinFunction(new StringCiSymLeqHuh());
// addBuiltinFunction(new StringCiSymLtHuh());
// addBuiltinFunction(new StringCiSymEqHuh());
// addBuiltinFunction(new StringCiSymGeqHuh());
// addBuiltinFunction(new StringCiSymGtHuh());
// addBuiltinFunction(new StringContainsCiHuh());
// addBuiltinFunction(new StringContainsHuh());
// addBuiltinFunction(new StringCopy());
// addBuiltinFunction(new StringDowncase());
// addBuiltinFunction(new StringIth());
// addBuiltinFunction(new StringLength());
// addBuiltinFunction(new StringLowerCaseHuh());
// addBuiltinFunction(new StringNumericHuh());
// addBuiltinFunction(new StringRef());
// addBuiltinFunction(new StringUpcase());
// addBuiltinFunction(new StringUpperCaseHuh());
// addBuiltinFunction(new StringWhitespaceHuh());
// addBuiltinFunction(new StringSymLeqHuh());
// addBuiltinFunction(new StringSymLtHuh());
addBuiltinFunction(new StringSymEqHuh());
// addBuiltinFunction(new StringSymGeqHuh());
// addBuiltinFunction(new StringSymGeHuh());
// addBuiltinFunction(new StringHuh());
// addBuiltinFunction(new Substring());
/* Image Functions */
// addBuiltinFunction(new ImageSymEqHuh());
// addBuiltinFunction(new ImageHuh());
/* Miscellaneous Functions */
// addBuiltinFunction(new SymEqSymTilda());
// addBuiltinFunction(new Eof());
// addBuiltinFunction(new EofObjectHuh());
// addBuiltinFunction(new EqHuh());
// addBuiltinFunction(new EqualHuh());
// addBuiltinFunction(new EqualSymTildaHuh());
// addBuiltinFunction(new EqvHuh());
// addBuiltinFunction(new Error());
// addBuiltinFunction(new Exit());
addBuiltinFunction(new Identity());
// addBuiltinFunction(new StructHuh());
/* Structures */
addBuiltInStructure(new RacketStructure('posn', ['x', 'y']));
/* Literals */
BUILT_INS.set('e', new RacketInexactFraction(6121026514868073n, 2251799813685248n));
BUILT_INS.set('empty', RACKET_EMPTY_LIST);
BUILT_INS.set('null', RACKET_EMPTY_LIST);
BUILT_INS.set('pi', new RacketInexactFraction(884279719003555n, 281474976710656n));
// Export
export default BUILT_INS;
