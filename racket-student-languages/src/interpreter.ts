import * as builtins from './builtins.js';
import { Environment } from './environment.js';
import { BuiltinTypeError } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { 
  isCallable, 
  isNumber,
  RacketInexactFloat,
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

  constructor() {
    this.initGlobals();
  }

  visitCall(expr: ir2.Call): RacketValue {
    let callee = this.evaluate(expr.callee);
    if (isNumber(callee)) {
      throw new Interpreter.InterpreterError(`function call: expected a function after the open parenthesis, but received ${callee.toString()}`);
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
      throw new Interpreter.InterpreterError(`${expr.name.lexeme}: this variable is not defined`);
    } else {
      return value;
    }
  }

  visitLiteral(expr: ir2.Literal): RacketValue {
    return expr.value;
  }

  //

  evaluate(expr: ir2.Expr): RacketValue {
    return expr.accept(this);
  }

  initGlobals(): void {
    const GLOBALS = new Environment();
    GLOBALS.define('+', new builtins.SymPlus());
    GLOBALS.define('e', new RacketInexactFloat(2.718281828459045));
    this.environment = GLOBALS;
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
      } else if (err instanceof BuiltinTypeError) {
        racket.error(err.msg);
      } else {
        throw err;
      }
    }
    return values;
  }
}
