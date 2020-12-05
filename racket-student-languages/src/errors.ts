export class UnreachableCode extends Error {}

class RacketError extends Error {}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Errors specific to a step in the interpretation process.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export class ResolverError extends RacketError {
  readonly msg: string;

  constructor(msg: string) {
    super();
    this.msg = msg;
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
* General use errors.
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

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
