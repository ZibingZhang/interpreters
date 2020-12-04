import BUILT_INS from './builtins.js';
import { Environment } from './environment.js';
import { BuiltinFunctionError } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { 
  isCallable, 
  isNumber,
  RacketLambda,
  RacketValue 
} from './values.js';

export default class Interpreter implements ir2.ExprVisitor {
  private static InterpreterError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  environment: Environment = new Environment();
  private evaluatingCallee: boolean = false;

  constructor() {
    const GLOBALS = new Environment();
    for (let [name, value] of BUILT_INS) {
      GLOBALS.define(name, value);
    }
    this.environment = GLOBALS;
  }

  visitCall(expr: ir2.Call): RacketValue {
    this.evaluatingCallee = true;
    let callee = this.evaluate(expr.callee);
    this.evaluatingCallee = false;
    if (isNumber(callee)) {
      this.error(`function call: expected a function after the open parenthesis, but received ${callee.toString()}`);
    } else if (!isCallable(callee)) {
      throw new Error('Unreachable code.');
    }
    let args = expr.arguments.map(this.evaluate.bind(this));
    return callee.call(args);
  }

  visitDefineVariable(expr: ir2.DefineVariable): void {
    let name = expr.identifier.name.lexeme;
    let value = this.evaluate(expr.expression);
    this.environment.define(name, value);
    return;
  }

  visitLambdaExpression(expr: ir2.LambdaExpression): RacketLambda {
    return new RacketLambda(expr.names, expr.body);
  }

  visitIdentifier(expr: ir2.Identifier): RacketValue {
    let value = this.environment.get(expr.name.lexeme);
    if (value === undefined) {
      this.error(`${expr.name.lexeme}: this variable is not defined`);
    } else if (isCallable(value) && !this.evaluatingCallee) {
      this.error(`${expr.name.lexeme}: expected a function call, but there is no open parenthesis before this function`);
    } else {
      return value;
    }
  }

  visitLiteral(expr: ir2.Literal): RacketValue {
    return expr.value;
  }

  //

  error(msg: string): never {
    throw new Interpreter.InterpreterError(msg);
  }

  evaluate(expr: ir2.Expr): RacketValue {
    return expr.accept(this);
  }

  interpret(exprs: ir2.Expr[]): RacketValue[] {
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
      } else {
        throw err;
      }
    }
    return values;
  }
}
