import { BuiltinTypeError } from './errors.js';
import {
  isFunction,
  isNumber,
  RacketBuiltInFunction, 
  RacketExactNumber, 
  RacketNumber, 
  RacketValue 
} from './values.js';

export class SymPlus implements RacketBuiltInFunction {
  min: number;
  max: number;
  name: string;

  constructor() {
    this.min = 0;
    this.max = Infinity;
    this.name = '+';
  }

  call(args: RacketValue[]): RacketNumber {
    let total: RacketNumber = new RacketExactNumber(0n, 1n);
    for (let arg of args) {
      if (isFunction(arg)) throw new BuiltinTypeError(
        `${arg.name}: expected a function call, but there is no open parenthesis before this function`
      );
      if (!isNumber(arg)) throw new Error('Unreachable code.');
      total = total.add(arg);
    }
    return total;
  }
}
