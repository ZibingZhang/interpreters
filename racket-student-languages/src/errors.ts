export class RacketError extends Error {}

export class DivByZero extends RacketError {}

export class BuiltinFunctionError extends RacketError {
  readonly msg: string;

  constructor(msg: string) {
    super();
    this.msg = msg;
  }
}

export class StructureFunctionError extends RacketError {
  readonly msg: string;

  constructor(msg: string) {
    super();
    this.msg = msg;
  }
}
