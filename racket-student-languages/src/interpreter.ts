import BUILT_INS from './builtins.js';
import { Environment } from './environment.js';
import { BuiltinFunctionError, DivByZero, StructureFunctionError } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { 
  isCallable, 
  isNumber,
  RacketLambda,
  RacketStructure,
  RacketSymbol,
  RacketValue, 
  RACKET_EMPTY_LIST,
  RACKET_TRUE
} from './values.js';

/**
 * An interpreter for executing Intermediate Representation IIs.
 */
export default class Interpreter implements ir2.StmtVisitor {
  private static InterpreterError = class extends Error {
    readonly msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  environment: Environment = new Environment();

  constructor() {
    const GLOBALS = new Environment();
    for (let [name, value] of BUILT_INS) {
      GLOBALS.define(name, value);
    }
    this.environment = GLOBALS;
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Visitor
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  visitCall(expr: ir2.Call): RacketValue {
    let callee = this.evaluate(expr.callee);
    if (isNumber(callee)) {
      this.error(`function call: expected a function after the open parenthesis, but received ${callee.toString()}`);
    } else if (!isCallable(callee)) {
      throw new Error('Unreachable code.');
    }
    let args = expr.arguments.map(this.evaluate.bind(this));
    return callee.call(args);
  }

  visitDefineStructure(expr: ir2.DefineStructure): void {
    let name = expr.name;
    let fields = expr.fields;
    let structure = new RacketStructure(name, fields);
    let makeFunction = structure.makeFunction();
    let isInstanceFunction = structure.isInstanceFunction();
    let getFunctions = structure.getFunctions();
    this.environment.define('make-' + name, makeFunction);
    this.environment.define(name + '?', isInstanceFunction);
    for (let i = 0; i < fields.length; i++) {
      this.environment.define(`${name}-${fields[i]}`, getFunctions[i]);
    }
  }

  visitDefineVariable(expr: ir2.DefineVariable): void {
    let name = expr.identifier.name.lexeme;
    let value = this.evaluate(expr.expression);
    this.environment.define(name, value);
    return;
  }

  visitLambdaExpression(expr: ir2.LambdaExpression): RacketLambda {
    return new RacketLambda(expr.names.map(name => name.lexeme), expr.body, this.environment);
  }

  visitIdentifier(expr: ir2.Identifier): RacketValue {
    let value = this.environment.get(expr.name.lexeme);
    return value;
  }

  visitIfExpression(expr: ir2.IfExpression): RacketValue {
    let predicate = this.evaluate(expr.predicate);
    if (predicate === RACKET_TRUE) {
      return this.evaluate(expr.ifTrue);
    } else {
      return this.evaluate(expr.ifFalse);
    }
  }

  visitLiteral(expr: ir2.Literal): RacketValue {
    return expr.value;
  }

  visitQuoted(expr: ir2.Quoted): RacketValue {
    if (expr.expression instanceof ir2.Group) {
      return RACKET_EMPTY_LIST;
    } else {
      return new RacketSymbol(expr.expression.name.lexeme);
    }
  }

  visitTestCase(expr: ir2.TestCase): void {
    let actual = this.evaluate(expr.actual);
    let expected = this.evaluate(expr.expected);
    if (!actual.equals(expected)) {
      this.error(`Actual value ${actual.toString()} differs from ${expected.toString()}, the expected value.`);
    }
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Interpreting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  evaluate(expr: ir2.StmtToVisit): RacketValue {
    return expr.accept(this);
  }

  interpretBody(exprs: ir2.StmtToVisit[]): RacketValue[] {
    let values: RacketValue[] = [];
    try {
      for (let expr of exprs) {
        let value = this.evaluate(expr);
        if (value === undefined) continue;
        values.push(value);
      }
    } catch (err) {
      if (err instanceof Interpreter.InterpreterError) {
        racket.error(err.msg);
      } else if (err instanceof BuiltinFunctionError) {
        racket.error(err.msg);
      } else if (err instanceof DivByZero) {
        racket.error('/: division by zero');
      } else if (err instanceof StructureFunctionError) {
        racket.error(err.msg);
      } else {
        throw err;
      }
    }
    return values;
  }

  interpretTestCases(testCases: ir2.TestCase[]): number {
    let passedTests = 0;
    try {
      for (let testCase of testCases) {
        this.visitTestCase(testCase);
        passedTests++;
      }
    } catch (err) {
      if (err instanceof Interpreter.InterpreterError) {
        racket.error(err.msg);
      } else if (err instanceof BuiltinFunctionError) {
        racket.error(err.msg);
      } else if (err instanceof DivByZero) {
        racket.error('/: division by zero');
      } else if (err instanceof StructureFunctionError) {
        racket.error(err.msg);
      } else {
        throw err;
      }
    }
    return passedTests;
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Error Reporting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private error(msg: string): never {
    throw new Interpreter.InterpreterError(msg);
  }
}
