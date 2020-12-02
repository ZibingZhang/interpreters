import { BuiltinTypeError } from './errors.js';
import * as ir1 from './ir1.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { SymbolTable } from './symboltable.js';
import { 
  isNumber,
  RacketValueType
} from './values.js';

class Resolver implements ir1.ExprVisitor {
  private static ResolverError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private readonly BUILTINS: SymbolTable = new SymbolTable();
  private symbolTable: SymbolTable = new SymbolTable();

  constructor() {
    this.BUILTINS.define('+', RacketValueType.BUILTIN);
    this.BUILTINS.define('e', RacketValueType.BUILTIN);
  }

  visitCall(expr: ir1.Call): ir2.Call {
    if (expr.callee === undefined) throw new Resolver.ResolverError("function call: expected a function after the open parenthesis, but nothing's there");
    if (expr.callee instanceof ir1.Literal) {
      if (isNumber(expr.callee.value)) throw new Resolver.ResolverError('function call: expected a function after the open parenthesis, but found a number');
      else throw new Error('Unreachable code.');
    } else if (expr.callee instanceof ir1.Identifier) {
      let name = expr.callee.name.lexeme;
      let type = this.BUILTINS.get(name) || this.symbolTable.get(name);
      if (type === undefined) throw new Resolver.ResolverError(`${name}: this function is not defined`);
      else if (type === RacketValueType.NUMBER) throw new Resolver.ResolverError('function call: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      else if (type === RacketValueType.VARIABLE) throw new Resolver.ResolverError('function call: expected a variable name, or a function name and its variables (in parentheses), but found a variable');
      else if (type === RacketValueType.BUILTIN) {}
      else if (type === RacketValueType.FUNCTION) {}
      else throw new Error('Unreachable code.');
    } else throw new Error('Unreachable code.');
    let callee = this.evaluate(expr.callee);
    let args = expr.arguments.map(this.evaluate.bind(this));
    return new ir2.Call(callee, args);
  }

  visitDefineKeyword(expr: ir1.DefineKeyword): void {
    throw new Resolver.ResolverError('define: expected an open parenthesis before define, but found none');
  }

  visitDefineVariable(expr: ir1.DefineVariable): ir2.DefineVariable {
    let args = expr.arguments;
    if (args.length === 0) throw new Resolver.ResolverError("define: expected a variable name, or a function name and its variables (in parentheses), but nothing's there");
    let variable = args[0];
    if (variable instanceof ir1.Identifier) {
      let name = variable.name.lexeme;
      if (this.BUILTINS.contains(name)) throw new Resolver.ResolverError(`${name}: this name was defined in the language or a required library and cannot be re-defined`);
      if (this.symbolTable.contains(name)) throw new Resolver.ResolverError(`${name}: this name was defined previously and cannot be re-defined`);
      if (args.length === 1) throw new Resolver.ResolverError(`define: expected an expression after the variable name ${name}, but nothing's there`);
      if (args.length > 2) throw new Resolver.ResolverError(`define: expected only one expression after the variable name ${name}, but found ${args.length - 2} extra part${args.length - 2 === 1 ? '' : 's'}`);
      if (args[1] instanceof ir1.Literal) this.symbolTable.define(name, RacketValueType.NUMBER);
      else if (args[1] instanceof ir1.Call) this.symbolTable.define(name, RacketValueType.VARIABLE);
      else throw new Error('Unreachable code.');
      return new ir2.DefineVariable(variable.accept(this), this.evaluate(args[1]));
    } else {
      if (variable instanceof ir1.Literal) {
        if (isNumber(variable.value)) throw new Resolver.ResolverError('define: expected a variable name, or a function name and its variables (in parentheses), but found a number');
        else throw new Error('Unreachable code.');
      } else throw new Error('Unreachable code.');
    }
  }

  visitIdentifier(expr: ir1.Identifier): ir2.Identifier {
    let type = this.BUILTINS.get(expr.name.lexeme) || this.symbolTable.get(expr.name.lexeme);
    if (type === undefined) throw new Resolver.ResolverError(`${expr.name.lexeme}: this variable is not defined`);
    return new ir2.Identifier(expr.name);
  }

  visitLiteral(expr: ir1.Literal): ir2.Literal {
    return new ir2.Literal(expr.value);
  }

  //

  resolve(exprs: ir1.Expr[]): ir2.Expr[] {
    let values: ir2.Expr[] = [];
    try {
      for (let expr of exprs) {
        let value = this.evaluate(expr);
        if (value === undefined) continue;
        values.push(value);
      }
    } catch (err) {
      if (err instanceof Resolver.ResolverError) {
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

  private evaluate(expr: ir1.Expr): ir2.Expr {
    return expr.accept(this);
  }
}

export default new Resolver();
