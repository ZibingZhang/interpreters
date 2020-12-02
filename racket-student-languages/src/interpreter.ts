import * as builtins from './builtins.js';
import { Environment } from './environment.js';
import { BuiltinTypeError } from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { 
  isFunction, 
  isNumber,
  RacketInexactFloat,
  RacketValue 
} from './values.js';

class Interpreter implements ir2.ExprVisitor {
  private static InterpreterError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  environment: Environment = new Environment();

  constructor() {
    const GLOBALS = new Environment();
    GLOBALS.define('+', new builtins.SymPlus());
    GLOBALS.define('e', new RacketInexactFloat(2.718281828459045));
    this.environment = GLOBALS;
  }

  visitCall(expr: ir2.Call): RacketValue {
    let callee = this.evaluate(expr.callee);
    if (isNumber(callee)) throw new Interpreter.InterpreterError(`function call: expected a function after the open parenthesis, but received ${callee.toString()}`);
    else if (!isFunction(callee)) throw new Error('Unreachable code.');
    let args = expr.arguments.map(this.evaluate.bind(this));
    return callee.call(args);
  }

  visitDefineVariable(expr: ir2.DefineVariable): void {
    let name = expr.identifier.name.lexeme;
    let value = this.evaluate(expr.expression);
    this.environment.define(name, value);
    return;
  }

  visitIdentifier(expr: ir2.Identifier): RacketValue {
    let value = this.environment.get(expr.name.lexeme);
    if (value === undefined) throw new Interpreter.InterpreterError(`${expr.name.lexeme}: this variable is not defined`);
    return value;
  }

  visitLiteral(expr: ir2.Literal): RacketValue {
    return expr.value;
  }

  //

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
        this.error(err.msg);
      } else if (err instanceof BuiltinTypeError) {
        this.error(err.msg);
      } else {
        throw err;
      }
    }
    return values;
  }

  //

  private error(msg: string) {
    racket.error(msg);
  }

  private evaluate(expr: ir2.Expr): RacketValue {
    return expr.accept(this);
  }
}

export default new Interpreter();
