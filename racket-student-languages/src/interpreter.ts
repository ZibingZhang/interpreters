import * as builtins from './builtins.js';
import { Environment } from './environment.js';
import { BuiltinTypeError } from './errors.js';
import * as ast from './ast.js';
import racket from './racket.js';
import { 
  isFunction, 
  isNumber,
  RacketValue 
} from './values.js';

class Interpreter implements ast.ExprVisitor {
  private static InterpreterError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private environment: Environment = new Environment();

  constructor() {
    const GLOBALS = new Environment();
    GLOBALS.define('+', new builtins.SymPlus());
    this.environment = GLOBALS;
  }

  visitCall(expr: ast.Call): RacketValue {
    if (expr.callee === undefined) throw new Interpreter.InterpreterError("function call: expected a function after the open parenthesis, but nothing's there");
    let callee = this.evaluate(expr.callee);
    if (isNumber(callee)) throw new Interpreter.InterpreterError('function call: expected a function after the open parenthesis, but found a number');
    if (!isFunction(callee)) throw new Error('Unreachable code.');
    let args = expr.arguments.map(this.evaluate.bind(this));
    return callee.call(args);
  }

  visitDefineKeyword(expr: ast.DefineKeyword): void {
    expr;
    throw new Interpreter.InterpreterError('define: expected an open parenthesis before define, but found none');
  }

  visitDefineVariable(expr: ast.DefineVariable): void {
    let args = expr.arguments;
    if (args.length === 0) throw new Interpreter.InterpreterError("define: expected a variable name, or a function name and its variables (in parentheses), but nothing's there");
    if (args[0] instanceof ast.Identifier) {
      let name = (args[0] as ast.Identifier).name.lexeme;
      if (this.environment.contains(name)) throw new Interpreter.InterpreterError(`${name}: this name was defined previously and cannot be re-defined`);
      if (args.length === 1) throw new Interpreter.InterpreterError(`define: expected an expression after the variable name ${name}, but nothing's there`);
      if (args.length > 2) throw new Interpreter.InterpreterError(`define: expected only one expression after the variable name ${name}, but found ${args.length - 2} extra part${args.length - 2 === 1 ? '' : 's'}`);
      let value = this.evaluate(args[1]);
      this.environment.define(name, value);
    } else {
      let value = this.evaluate(args[0]);
      if (isNumber(value)) throw new Interpreter.InterpreterError('define: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      throw new Error('Unreachable code.')
    }
  }

  visitIdentifier(expr: ast.Identifier): RacketValue {
    let value = this.environment.get(expr.name.lexeme);
    if (value === undefined) throw new Interpreter.InterpreterError(`${expr.name.lexeme}: this variable is not defined`);
    return value;
  }

  visitLiteral(expr: ast.Literal): RacketValue {
    return expr.value;
  }

  //

  interpret(exprs: ast.Expr[]): RacketValue[] {
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

  private evaluate(expr: ast.Expr): RacketValue {
    return expr.accept(this);
  }
}

export default new Interpreter();
