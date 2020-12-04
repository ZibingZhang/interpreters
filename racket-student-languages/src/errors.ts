export class RacketError extends Error {}

export class DivByZero extends RacketError {}

export class BuiltinFunctionError extends RacketError {
  msg: string;

  constructor(msg: string) {
    super();
    this.msg = msg;
  }
}
