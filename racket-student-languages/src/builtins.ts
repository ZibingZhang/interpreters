import { BuiltinFunctionError } from './errors.js';
import {
  isCallable,
  isNumber,
  RacketBuiltInFunction, 
  RacketExactNumber, 
  RacketInexactFloat,
  RacketNumber, 
  RacketValue
} from './values.js';

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

class SymSlash extends RacketBuiltInFunction {
  constructor() {
    super('/', 1, Infinity);
  }

  call(args: RacketValue[]): RacketNumber {
    let numbers = assertListOfNumbers(this.name, args);
    assertAtLeastNArguments(this.name, this.min, args.length);
    if (args.length === 1) {
      return numbers[0].inverted();
    } else {
      let total: RacketNumber = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        total.div(numbers[i]);
      }
      return total;
    }
  }
}

//

function error(msg: string): never {
  throw new BuiltinFunctionError(msg);
}

function assertAtLeastNArguments(name: string, expected: number, received: number): void {
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

//

function addBuiltinFunction(fun: RacketBuiltInFunction): void {
  BUILT_INS.set(fun.name, fun);
}

let BUILT_INS: Map<string, RacketValue> = new Map();
addBuiltinFunction(new SymPlus());
addBuiltinFunction(new SymDash());
addBuiltinFunction(new SymStar());
addBuiltinFunction(new SymSlash());
BUILT_INS.set('e', new RacketInexactFloat(2.718281828459045));
export default BUILT_INS;
