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
  RACKET_EMPTY_LIST
} from './values.js';

/**
 * An interpreter for executing Intermediate Representation IIs.
 */
export default class Interpreter implements ir2.ExprVisitor {
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
    let getFunctions = structure.getFunctions();
    this.environment.define(`make-${name}`, makeFunction);
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
    return new RacketLambda(expr.names.map(name => name.lexeme), expr.body);
  }

  visitIdentifier(expr: ir2.Identifier): RacketValue {
    let value = this.environment.get(expr.name.lexeme);
    return value;
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

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Interpreting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  evaluate(expr: ir2.ExprToVisit): RacketValue {
    return expr.accept(this);
  }

  interpret(exprs: ir2.ExprToVisit[]): RacketValue[] {
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

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Error Reporting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private error(msg: string): never {
    throw new Interpreter.InterpreterError(msg);
  }
}
