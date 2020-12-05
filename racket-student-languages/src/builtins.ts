import { BuiltinFunctionError } from './errors.js';
import {
  isCallable,
  isNumber,
  RacketBuiltInFunction, 
  RacketExactNumber, 
  RacketInexactFraction,
  RacketNumber, 
  RacketValue
} from './values.js';

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Function representations of the built in functions.
 * 
 * Signatures and purpose statements are taken directly from
 * https://docs.racket-lang.org/htdp-langs/beginner.html.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

 /**
  * The addition function.
  * @extends RacketBuiltInFunction
  * 
  * Signature:
   *  (+ x y z ...) → number
   *    x : number
   *    y : number
   *    z : number
   * Purpose Statement:
   *  Adds up all numbers.
  */
class SymPlus extends RacketBuiltInFunction {
  constructor() {
    super('+', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    let numbers = assertListOfNumbers(this.name, args);
    assertAtLeastNArguments(this.name, this.min, args.length);
    let total: RacketNumber = new RacketExactNumber(0n, 1n);
    for (let number of numbers) {
      total = total.add(number);
    }
    return total;
  }
}

/**
  * The subtraction function.
  * @extends RacketBuiltInFunction
  * 
  * Signature:
   *  (- x y ...) → number
   *    x : number
   *    y : number
   * Purpose Statement:
   *  Subtracts the second (and following) number(s) from the first ; negates 
   *  the number if there is only one argument.
  */
class SymDash extends RacketBuiltInFunction {
  constructor() {
    super('-', 1, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    let numbers = assertListOfNumbers(this.name, args);
    assertAtLeastNArguments(this.name, this.min, args.length);
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

/**
  * The multiplication function.
  * @extends RacketBuiltInFunction
  * 
  * Signature:
   *  (* x y z) → number
   *    x : number
   *    y : number
   *    z : number
   * Purpose Statement:
   *  Multiplies all numbers.
  */
class SymStar extends RacketBuiltInFunction {
  constructor() {
    super('*', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    let numbers = assertListOfNumbers(this.name, args);
    let total: RacketNumber = new RacketExactNumber(1n, 1n);
    for (let number of numbers) {
      total = total.mul(number);
    }
    return total;
  }
}

/**
  * The multiplication function.
  * @extends RacketBuiltInFunction
  * 
   * Signature:
   *  (/ x y z ...) → number
   *    x : number
   *    y : number
   *    z : number
   * Purpose Statement:
   *  Divides the first by the second (and all following) number(s).
  */
class SymSlash extends RacketBuiltInFunction {
  constructor() {
    super('/', 2, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    let numbers = assertListOfNumbers(this.name, args);
    assertAtLeastNArguments(this.name, this.min, args.length);
    let total: RacketNumber = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        total.div(numbers[i]);
      }
    return total;
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Functions that assert certain properties over the arguments.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

function error(msg: string): never {
  throw new BuiltinFunctionError(msg);
}

/**
 * Assert that the function has at least `n` arguments.
 * @param {string} name the name of the function
 * @param {number} expected the minimum number of arguments expected
 * @param {number} received the actual number of arguments received
 */
function assertAtLeastNArguments(name: string, expected: number, received: number):  void {
  if (expected <= received) {
    return;
  }
  let errMsg = `${name}: `;
  errMsg += `expects at least ${expected} argument${expected === 1 ? '' : 's'}, `;
  if (received === 0) {
    errMsg += 'but received none';
  } else {
    errMsg += `but received only ${received}`;
  }
  error(errMsg);
}

/**
 * Assert that the arguments are all numbers.
 * @param {string} name the name of the function
 * @param {RacketValue[]} args the received arguments
 */
function assertListOfNumbers(name: string, args: RacketValue[]): RacketNumber[] {
  let numbers: RacketNumber[] = [];
  for (let arg of args) {
    if (isCallable(arg)) {
      throw new BuiltinFunctionError(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (!isNumber(arg)) {
      throw new Error('Unreachable code.');
    }
    numbers.push(arg);
  }
  return numbers;
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

let BUILT_INS: Map<string, RacketValue> = new Map();
addBuiltinFunction(new SymPlus());
addBuiltinFunction(new SymDash());
addBuiltinFunction(new SymStar());
addBuiltinFunction(new SymSlash());
BUILT_INS.set('e', new RacketInexactFraction(6121026514868073n, 2251799813685248n));
export default BUILT_INS;
