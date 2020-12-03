import { BuiltinTypeError } from './errors.js';
import * as ir1 from './ir1.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { SymbolTable } from './symboltable.js';
import { KEYWORDS, Token } from './tokens.js';
import { 
  isNumber,
  RacketValueType
} from './values.js';

export default class Resolver implements ir1.ExprVisitor {
  private static ResolverError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private readonly BUILTINS: SymbolTable = new SymbolTable();
  private symbolTable: SymbolTable = new SymbolTable();

  private inFunDef: boolean = false;

  constructor() {
    this.BUILTINS.define('+', RacketValueType.BUILTIN_LITERAL);
    this.BUILTINS.define('e', RacketValueType.BUILTIN_FUNCTION);
  }

  visitDefineKeyword(expr: ir1.DefineKeyword): never {
    this.error('define: expected an open parenthesis before define, but found none');
  }

  visitGroup(expr: ir1.Group): ir2.Call | ir2.DefineVariable | ir2.LambdaExpression {
    let elements = expr.elements;
    if (elements.length === 0) {
      this.error("function call: expected a function after the open parenthesis, but nothing's there");
    }
    
    let callee = elements[0];
    let args = [...elements].splice(1);

    if (callee instanceof ir1.DefineKeyword) {
      this.inFunDef = true;
      let result = this.define(args);
      this.inFunDef = false;
      return result;
    } else if (callee instanceof ir1.LambdaKeyword) {
      let enclosing = this.symbolTable;
      this.symbolTable = new SymbolTable(enclosing);
      let result = this.lambdaExpression(args);
      this.symbolTable = enclosing;
      return result;
    }

    if (callee instanceof ir1.Literal) {
      if (isNumber(callee.value)) {
        this.error('function call: expected a function after the open parenthesis, but found a number');
      } else throw new Error('Unreachable code.');
    } else if (callee instanceof ir1.Group) {
      this.error("function call: expected a function after the open parenthesis, but found a part");
    } else if (callee instanceof ir1.Identifier) {
      let name = callee.name.lexeme;
      let type = this.BUILTINS.get(name) || this.symbolTable.get(name);
      if (type === undefined) { 
        this.error(`${name}: this function is not defined`);
      } else if (type === RacketValueType.NUMBER) {
        this.error('function call: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      } else if (type === RacketValueType.VARIABLE) {
        this.error('function call: expected a variable name, or a function name and its variables (in parentheses), but found a variable');
      } else if (type === RacketValueType.FUNCTION) {
        let expected = this.symbolTable.getArity(name);
        let actual = args.length;
        if (expected != actual) {
          let errMsg = `${name}: `;
          if (actual > expected) {
            errMsg += `expects only ${expected} argument${expected === 1 ? '' : 's'}, but found ${actual}`;
          } else {
            errMsg += `expects ${expected} argument${expected === 1 ? '' : 's'}, but found only ${actual}`;
          }
          this.error(errMsg);
        }
      } else if ([
          RacketValueType.BUILTIN_LITERAL,
          RacketValueType.BUILTIN_FUNCTION,
          RacketValueType.PARAMETER
        ].includes(type)) {
        // weird that this doesn't error on builtin literals
      } else throw new Error('Unreachable code.');
    } else throw new Error('Unreachable code.');
    let evaledCallee = this.evaluate(callee);
    let evaledArgs = args.map(this.evaluate.bind(this));
    return new ir2.Call(evaledCallee, evaledArgs);
  }

  visitIdentifier(expr: ir1.Identifier): ir2.Identifier {
    let type = this.BUILTINS.get(expr.name.lexeme) || this.symbolTable.get(expr.name.lexeme);
    if (type === undefined) {
      this.error(`${expr.name.lexeme}: this variable is not defined`);
    }
    return new ir2.Identifier(expr.name);
  }

  visitLambdaKeyword(expr: ir1.LambdaKeyword): never {
    this.error('lambda: expected an open parenthesis before lambda, but found none');
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
        racket.error(err.msg);
      } else if (err instanceof BuiltinTypeError) {
        racket.error(err.msg);
      } else throw err;
    }
    return values;
  }

  //

  private error(msg: string): never {
    throw new Resolver.ResolverError(msg);
  }

  private evaluate(expr: ir1.Expr): ir2.Expr {
    return expr.accept(this);
  }

  //

  private define(exprs: ir1.Expr[]): ir2.DefineVariable {
    if (exprs.length === 0) {
      this.error("define: expected a variable name, or a function name and its variables (in parentheses), but nothing's there");
    }
    let first = exprs[0];
    if (first instanceof ir1.Group) {
      return this.defineFunction(first, [...exprs].splice(1));
    } else {
      return this.defineVariable(exprs);
    }
  }

  private defineFunction(nameAndParamList: ir1.Group, exprs: ir1.Expr[]): ir2.DefineVariable { 
    if (nameAndParamList.elements.length === 0) {
      this.error("define: expected a name for the function, but nothing's there");
    }
    let variable = nameAndParamList.elements[0];
    if (variable instanceof ir1.Identifier) {
      let paramList = [...nameAndParamList.elements].splice(1);
      if (paramList.length === 0) {
        this.error('define: expected at least one variable after the function name, but found none');
      }
      let enclosing = this.symbolTable;
      this.symbolTable = new SymbolTable(enclosing);
      let paramNames: Token[] = [];
      for (let param of paramList) {
        if (param instanceof ir1.Identifier) {
          let paramName = param.name;
          paramNames.push(paramName);
          this.symbolTable.define(paramName.lexeme, RacketValueType.VARIABLE);
        } else if (param instanceof ir1.DefineKeyword
            || param instanceof ir1.LambdaKeyword) {
          this.error('define: expected a variable, but found a keyword');
        } else if (param instanceof ir1.Group) {
          this.error('define: expected a variable, but found a part');
        } else if (param instanceof ir1.Literal) {
          this.error('define: expected a variable, but found a number');
        } else throw new Error('Unreachable code.');
      }
      if (exprs.length === 1) {
        this.symbolTable = enclosing;
        this.symbolTable.define(variable.name.lexeme, RacketValueType.FUNCTION, paramNames.length);
        return new ir2.DefineVariable(new ir2.Identifier(variable.name), new ir2.LambdaExpression(paramNames, this.evaluate(exprs[0])));
      } else if (exprs.length < 1) {
        this.error("define: expected an expression for the function body, but nothing's there");
      } else {
        this.error(`define: expected only one expression for the function body, but found ${exprs.length - 1} extra part${exprs.length - 1 === 1 ? '' : 's'}`);
      }
    } else if (variable instanceof ir1.DefineKeyword
        || variable instanceof ir1.LambdaKeyword) {
      this.error('define: expected the name of the function, but found a keyword');
    } else if (variable instanceof ir1.Group) {
      this.error('define: expected the name of the function, but found a part');
    } else if (variable instanceof ir1.Literal) {
      this.error('define: expected the name of the function, but found a number');
    } else throw new Error('Unreachable code.');
  }

  private defineVariable(exprs: ir1.Expr[]): ir2.DefineVariable {
    let variable = exprs[0];
    if (variable instanceof ir1.Identifier) {
      let name = variable.name.lexeme;
      if (KEYWORDS.get(name)) {
        this.error("define: expected a variable name, or a function name and its variables (in parentheses), but found a keyword");
      } else if (this.BUILTINS.contains(name)) {
        this.error(`${name}: this name was defined in the language or a required library and cannot be re-defined`);
      } else if (this.symbolTable.contains(name)) {
        this.error(`${name}: this name was defined previously and cannot be re-defined`); 
      } else if (exprs.length === 1) {
        this.error(`define: expected an expression after the variable name ${name}, but nothing's there`);
      } else if (exprs.length > 2) {
        this.error(`define: expected only one expression after the variable name ${name}, but found ${exprs.length - 2} extra part${exprs.length - 2 === 1 ? '' : 's'}`);
      }

      let value = this.evaluate(exprs[1]);
      if (value instanceof ir2.Call
          || value instanceof ir2.Identifier) {
        this.symbolTable.define(name, RacketValueType.VARIABLE);
      } else if (value instanceof ir2.LambdaExpression) {
        this.symbolTable.define(name, RacketValueType.FUNCTION, value.names.length);
      } else if (value instanceof ir2.Literal) {
        this.symbolTable.define(name, RacketValueType.NUMBER);
      } else throw new Error('Unreachable code.');
      return new ir2.DefineVariable(variable.accept(this), this.evaluate(exprs[1]));
    } else if (variable instanceof ir1.Literal) {
      if (isNumber(variable.value)) {
        this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      } else throw new Error('Unreachable code.');
    } else if (variable instanceof ir1.DefineKeyword
        || variable instanceof ir1.LambdaKeyword) {
      this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a keyword');
    } else throw new Error('Unreachable code.');
  }

  private lambdaExpression(exprs: ir1.Expr[]): ir2.LambdaExpression {
    if (!this.inFunDef) {
      this.error('lambda: found a lambda that is not a function definition');
    } else if (exprs.length === 0) {
      this.error("lambda: expected (lambda (variable more-variable ...) expression), but nothing's there");
    }
    let paramList = exprs[0];
    let paramNames: Token[] = [];
    if (paramList instanceof ir1.Group) {
      let params = paramList.elements;
      if (params.length === 0) {
        this.error('lambda: expected (lambda (variable more-variable ...) expression), but found no variables');
      }
      for (let param of params) {
        if (param instanceof ir1.DefineKeyword
            || param instanceof ir1.LambdaKeyword) {
          this.error('lambda: expected a variable, but found a keyword');
        } else if (param instanceof ir1.Group) {
          this.error('lambda: expected a variable, but found a part');
        } else if (param instanceof ir1.Identifier) {
          let paramName = param.name;
          paramNames.push(paramName);
          this.symbolTable.define(param.name.lexeme, RacketValueType.PARAMETER);
        } else if (param instanceof ir1.Literal) {
          this.error('lambda: expected a variable, but found a number');
        } else throw new Error('Unreachable code.');
      }
      if (exprs.length === 1) {
        this.error("lambda: expected an expression for the function body, but nothing's there");
      } else if (exprs.length > 2) {
        this.error(`lambda: expected only one expression for the function body, but found ${exprs.length - 2} extra part${exprs.length - 2 === 1 ? '' : 's'}`);
      }
      let evaledBody = this.evaluate(exprs[1]);
      return new ir2.LambdaExpression(paramNames, evaledBody);
      
    } else {
      if (paramList instanceof ir1.Identifier
          || paramList instanceof ir1.DefineKeyword
          || paramList instanceof ir1.LambdaKeyword) {
        this.error('lambda: expected (lambda (variable more-variable ...) expression), but found something else');
      } else if (paramList instanceof ir1.Literal) {
        this.error('lambda: expected (lambda (variable more-variable ...) expression), but found a number');
      } else throw new Error('Unreachable code.');
    }
  }
}
