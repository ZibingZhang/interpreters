import { BuiltinFunctionError } from './errors.js';
import {
  isBoolean,
  isCallable,
  isComplex,
  isExact,
  isInexact,
  isList,
  isNumber,
  isRational,
  isReal,
  isSymbol,
  RacketBoolean,
  RacketCallable,
  RacketComplexNumber,
  RacketConstructedList,
  RacketExactNumber, 
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
  
  call(args: RacketValue[]): RacketValue {
    if (this.max === Infinity) {
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
    let total: RacketNumber = new RacketExactNumber(1n, 1n);
    for (let number of numbers) {
      total = total.mul(number);
    }
    return total;
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
    let total: RacketNumber = new RacketExactNumber(0n, 1n);
    for (let number of numbers) {
      total = total.add(number);
    }
    return total;
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
class SymDash extends RacketBuiltInFunction {
  constructor() {
    super('-', 1, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    if (args.length === 1) {
      return numbers[0].negated();
    } else {
      let total: RacketNumber = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        total.sub(numbers[i]);
      }
      return total;
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
class SymSlash extends RacketBuiltInFunction {
  constructor() {
    super('/', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    super.call(args);
    let numbers = assertListOfNumbers(this.name, args);
    let total: RacketNumber = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        total.div(numbers[i]);
      }
    return total;
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
    let value = args[0];
    return toRacketBoolean(isRational(value) && value.denominator === 0n);
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
class BooleanSymEqualHuh extends RacketBuiltInFunction {
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
class SymbolSymEqualHuh extends RacketBuiltInFunction {
  constructor() {
    super('symbol=?', 2, 2);
  }

  call(args: RacketValue[]): RacketBoolean {
    super.call(args);
    let symbols = assertListOfSymbols(this.name, args);
    return toRacketBoolean(symbols[0].name === symbols[1].name);
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

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Assertions
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

/**
 * Assert that the function has at least `n` arguments.
 * @param name the name of the function
 * @param minimum the minimum number of arguments expected
 * @param received the number of arguments received
 */
function assertAtLeastNArguments(name: string, minimum: number, received: number):  void {
  if (minimum <= received) {
    return;
  }
  let errMsg = `${name}: `;
  errMsg += `expects at least ${minimum} argument${minimum === 1 ? '' : 's'}, `;
  if (received === 0) {
    errMsg += 'but received none';
  } else {
    errMsg += `but received only ${received}`;
  }
  error(errMsg);
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
// Numeric Functions
addBuiltinFunction(new SymStar());
addBuiltinFunction(new SymPlus());
addBuiltinFunction(new SymDash());
addBuiltinFunction(new SymSlash());
addBuiltinFunction(new Abs());
addBuiltinFunction(new ComplexHuh());
addBuiltinFunction(new ExactHuh());
addBuiltinFunction(new InexactHuh());
addBuiltinFunction(new IntegerHuh());
addBuiltinFunction(new MakeRectangular());
addBuiltinFunction(new Sgn());
// Boolean Functions
addBuiltinFunction(new BooleanToString());
addBuiltinFunction(new BooleanSymEqualHuh());
addBuiltinFunction(new BooleanHuh());
addBuiltinFunction(new FalseHuh());
addBuiltinFunction(new Not());
// Symbol Functions
addBuiltinFunction(new SymbolToString());
addBuiltinFunction(new SymbolSymEqualHuh());
addBuiltinFunction(new SymbolHuh());
// List Functions
addBuiltinFunction(new Cons());
// Structures
addBuiltInStructure(new RacketStructure('posn', ['x', 'y']));
// Literals
BUILT_INS.set('e', new RacketInexactFraction(6121026514868073n, 2251799813685248n));
BUILT_INS.set('empty', RACKET_EMPTY_LIST);
BUILT_INS.set('null', RACKET_EMPTY_LIST);
BUILT_INS.set('pi', new RacketInexactFraction(884279719003555n, 281474976710656n));
// Export
export default BUILT_INS;
