import BUILT_INS from './builtins.js';
import * as ir1 from './ir1.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import { SymbolTable } from './symboltable.js';
import { KEYWORDS, Token, TokenType } from './tokens.js';
import { 
  isBoolean,
  isNumber,
  isString,
  RacketBuiltInFunction,
  RacketValueType
} from './values.js';

export default class Resolver implements ir1.ExprVisitor {
  private static ResolverError = class extends Error {
    readonly msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  private readonly BUILT_INS: SymbolTable = new SymbolTable();
  private symbolTable: SymbolTable = new SymbolTable();
  private atTopLevel: boolean = true;
  private allowIdFunction: boolean = false;
  private inFunctionDefinition: boolean = false;

  constructor() {
    for (let [name, value] of BUILT_INS) {
      if (isNumber(value)) {
        this.BUILT_INS.define(name, RacketValueType.BUILTIN_LITERAL);
      } else if (value instanceof RacketBuiltInFunction) {
        this.BUILT_INS.define(name, RacketValueType.BUILTIN_FUNCTION);
      } else {
        throw new Error('Unreachable code.');
      }
    }
  }

  visitGroup(expr: ir1.Group): ir2.Call | ir2.DefineStructure | ir2.DefineVariable | ir2.LambdaExpression {
    let elements = expr.elements;
    if (elements.length === 0) {
      this.error("function call: expected a function after the open parenthesis, but nothing's there");
    }
    
    let callee = elements[0];
    let args = [...elements].splice(1);

    if (callee instanceof ir1.Keyword) {
      let type = callee.token.type;
      if (type === TokenType.DEFINE) {
        let inFunctionDefinition = this.inFunctionDefinition;
        this.inFunctionDefinition = true;
        let result = this.define(args);
        this.inFunctionDefinition = inFunctionDefinition;
        return result;
      } else if (type === TokenType.DEFINE_STRUCT) {
        return this.defineStructure(args);
      } else if (type === TokenType.LAMBDA) {
        let enclosing = this.symbolTable;
        this.symbolTable = new SymbolTable(enclosing);
        let result = this.lambdaExpression(args);
        this.symbolTable = enclosing;
        return result;
      } else throw new Error('Unreachable code');
    } else if (callee instanceof ir1.Literal) {
      if (isBoolean(callee.value)) {
        this.error('function call: expected a function after the open parenthesis, but found something else');
      } else if (isNumber(callee.value)) {
        this.error('function call: expected a function after the open parenthesis, but found a number');
      } else if (isString(callee.value)) {
        this.error('function call: expected a function after the open parenthesis, but found a string');
      } else throw new Error('Unreachable code.');
    } else if (callee instanceof ir1.Group) {
      this.error("function call: expected a function after the open parenthesis, but found a part");
    } else if (callee instanceof ir1.Identifier) {
      let name = callee.name.lexeme;
      let type = this.BUILT_INS.get(name) || this.symbolTable.get(name);
      if (type === undefined) { 
        this.error(`${name}: this function is not defined`);
      } else if (type === RacketValueType.BOOLEAN) {
        this.error('function call: expected a variable name, or a function name and its variables (in parentheses), but found something else');
      } else if (type === RacketValueType.NUMBER) {
        this.error('function call: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      } else if (type === RacketValueType.STRING) {
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
          } else if (actual === 0) {
            errMsg += `expects ${expected} argument${expected === 1 ? '' : 's'}, but found none`;
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
    let allowIdFunction = this.allowIdFunction;
    this.allowIdFunction = true;
    let evaledCallee = this.evaluate(callee);
    this.allowIdFunction = allowIdFunction;
    let evaledArgs = args.map(this.evaluate.bind(this));
    return new ir2.Call(evaledCallee, evaledArgs);
  }

  visitIdentifier(expr: ir1.Identifier): ir2.Identifier {
    let name = expr.name.lexeme;
    let type = this.BUILT_INS.get(name) || this.symbolTable.get(name);
    if (type === undefined) {
      this.error(`${name}: this variable is not defined`);
    } else if ([RacketValueType.BUILTIN_FUNCTION, RacketValueType.FUNCTION].includes(type) && !this.allowIdFunction) {
      this.error(`${name}: expected a function call, but there is no open parenthesis before this function`);
    } else if (type === RacketValueType.STRUCTURE) {
      this.error(`${name}: structure type; do you mean make-${name}`);
    }
    return new ir2.Identifier(expr.name);
  }

  visitKeyword(expr: ir1.Keyword): never {
    let name = expr.token.type.valueOf();
    this.error(`${name}: expected an open parenthesis before ${name}, but found none`);
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
    if (!this.atTopLevel) {
      this.error('define: found a definition that is not at the top level');
    } else if (exprs.length === 0) {
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
    if (variable instanceof ir1.Keyword) {
      this.error('define: expected the name of the function, but found a keyword');
    } else if (variable instanceof ir1.Group) {
      this.error('define: expected the name of the function, but found a part');
    } else if (variable instanceof ir1.Literal) {
      if (isBoolean(variable.value)) {
        this.error('define: expected the name of the function, but found something else');
      } else if (isNumber(variable.value)) {
        this.error('define: expected the name of the function, but found a number');
      } else if (isString(variable.value)) {
        this.error('define: expected the name of the function, but found a string');
      } else throw new Error('Unreachable code.');
    } else if (variable instanceof ir1.Identifier) {
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
        } else if (param instanceof ir1.Keyword) {
          this.error('define: expected a variable, but found a keyword');
        } else if (param instanceof ir1.Group) {
          this.error('define: expected a variable, but found a part');
        } else if (param instanceof ir1.Literal) {
          if (isBoolean(param.value)) {
            this.error('define: expected a variable, but found a something else');
          } else if (isNumber(param.value)) {
            this.error('define: expected a variable, but found a number');
          } else if (isString(param.value)) {
            this.error('define: expected a variable, but found a string');
          } else throw new Error('Unreachable code.');
        } else throw new Error('Unreachable code.');
      }
      if (exprs.length === 1) {
        this.symbolTable = enclosing;
        let atTopLevel = this.atTopLevel;
        this.atTopLevel = false;
        let body = this.evaluate(exprs[0])
        this.atTopLevel = atTopLevel;
        this.symbolTable.define(variable.name.lexeme, RacketValueType.FUNCTION, paramNames.length);
        return new ir2.DefineVariable(new ir2.Identifier(variable.name), new ir2.LambdaExpression(paramNames, body));
      } else if (exprs.length < 1) {
        this.error("define: expected an expression for the function body, but nothing's there");
      } else {
        this.error(`define: expected only one expression for the function body, but found ${exprs.length - 1} extra part${exprs.length - 1 === 1 ? '' : 's'}`);
      }
    } else throw new Error('Unreachable code.');
  }

  private defineStructure(exprs: ir1.Expr[]): ir2.DefineStructure {
    if (!this.atTopLevel) {
      this.error('define-struct: found a definition that is not at the top level');
    } else if (exprs.length === 0) {
      this.error("define-struct: expected the structures name after define-struct, but nothing's there");
    }
    let identifier = exprs[0];
    if (identifier instanceof ir1.Group) {
      this.error('define-struct: expected the structures name after define-struct, but found a part');
    } else if (identifier instanceof ir1.Keyword) {
      this.error('define-struct: expected the structures name after define-struct, but found a keyword');
    } else if (identifier instanceof ir1.Literal) {
      if (isBoolean(identifier.value)) {
        this.error('define-struct: expected the structures name after define-struct, but found something else');
      } else if (isNumber(identifier.value)) {
        this.error('define-struct: expected the structures name after define-struct, but found a number');
      } else if (isString(identifier.value)) {
        this.error('define-struct: expected the structures name after define-struct, but found a string');
      } else throw new Error('Unreachable code.');
    } else if (identifier instanceof ir1.Identifier) {
      let fieldNames = exprs[1];
      if (fieldNames === undefined) {
        this.error("define-struct: expected at least one field name (in parentheses) after the structure name, but nothing's there");
      } else if (fieldNames instanceof ir1.Identifier
          || fieldNames instanceof ir1.Keyword) {
        this.error('define-struct: expected at least one field name (in parentheses) after the structure name, but found something else');
      } else if (fieldNames instanceof ir1.Literal) {
        if (isBoolean(fieldNames.value)) {
          this.error('define-struct: expected at least one field name (in parentheses) after the structure name, but found something else');
        } else if (isNumber(fieldNames.value)) {
          this.error('define-struct: expected at least one field name (in parentheses) after the structure name, but found a number');
        } else if (isString(fieldNames.value)) {
          this.error('define-struct: expected at least one field name (in parentheses) after the structure name, but found a string');
        } else throw new Error('Unreachable code.');
      } else if (fieldNames instanceof ir1.Group) {
        let names: string[] = [];
        for (let fieldName of fieldNames.elements) {
          if (fieldName instanceof ir1.Group) {
            this.error('define-struct: expected a field name, but found a part');
          } else if (fieldName instanceof ir1.Literal) {
            if (isBoolean(fieldName.value)) {
              this.error('define-struct: expected a field name, but found something else');
            } else if (isNumber(fieldName.value)) {
              this.error('define-struct: expected a field name, but found a number');
            } else if (isString(fieldName.value)) {
              this.error('define-struct: expected a field name, but found a string');
            } else throw new Error('Unreachable code.');
          } else if (fieldName instanceof ir1.Identifier) {
            names.push(fieldName.name.lexeme);
          } else if (fieldName instanceof ir1.Keyword) {
            names.push(fieldName.token.type.valueOf());
          } else throw new Error('Unreachable code.');
        }
        let structName = identifier.name.lexeme;
        if (this.symbolTable.contains(structName)) {
          this.error(`${structName}: this name was defined previously and cannot be re-defined`);
        } else if (this.symbolTable.contains(`make-${structName}`)) {
          this.error(`make-${structName}: this name was defined previously and cannot be re-defined`);
        }
        for (let fieldName of names) {
          if (this.symbolTable.contains(`${structName}-${fieldName}`)) {
            this.error(`${structName}-${fieldName}: this name was defined previously and cannot be re-defined`);
          } else {
            this.symbolTable.define(`${structName}-${fieldName}`, RacketValueType.FUNCTION, 1);
          }
        }
        this.symbolTable.define(structName, RacketValueType.STRUCTURE);
        this.symbolTable.define(`make-${structName}`, RacketValueType.FUNCTION, names.length);
        return new ir2.DefineStructure(structName, names);
      } else throw new Error('Unreachable code.');
    } else throw new Error('Unreachable code.');
  }

  private defineVariable(exprs: ir1.Expr[]): ir2.DefineVariable {
    let variable = exprs[0];
    if (variable instanceof ir1.Literal) {
      if (isBoolean(variable.value)) {
        this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found something else');
      } else if (isNumber(variable.value)) {
        this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a number');
      } else if (isString(variable.value)) { 
        this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a string');
      } else throw new Error('Unreachable code.');
    } else if (variable instanceof ir1.Keyword) {
      this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a keyword');
    } else if (variable instanceof ir1.Identifier) {
      let name = variable.name.lexeme;
      if (KEYWORDS.get(name)) {
        this.error("define: expected a variable name, or a function name and its variables (in parentheses), but found a keyword");
      } else if (this.BUILT_INS.contains(name)) {
        this.error(`${name}: this name was defined in the language or a required library and cannot be re-defined`);
      } else if (this.symbolTable.contains(name)) {
        this.error(`${name}: this name was defined previously and cannot be re-defined`); 
      } else if (exprs.length === 1) {
        this.error(`define: expected an expression after the variable name ${name}, but nothing's there`);
      } else if (exprs.length > 2) {
        this.error(`define: expected only one expression after the variable name ${name}, but found ${exprs.length - 2} extra part${exprs.length - 2 === 1 ? '' : 's'}`);
      }

      let atTopLevel = this.atTopLevel;
      this.atTopLevel = false;
      let body = this.evaluate(exprs[1]);
      this.atTopLevel = atTopLevel;
      if (body instanceof ir2.Call
          || body instanceof ir2.Identifier) {
        this.symbolTable.define(name, RacketValueType.VARIABLE);
      } else if (body instanceof ir2.LambdaExpression) {
        this.symbolTable.define(name, RacketValueType.FUNCTION, body.names.length);
      } else if (body instanceof ir2.Literal) {
        if (isBoolean(body.value)) {
          this.symbolTable.define(name, RacketValueType.BOOLEAN);
        } else if (isNumber(body.value)) {
          this.symbolTable.define(name, RacketValueType.NUMBER);
        } else throw new Error('Unreachable code.');
      } else throw new Error('Unreachable code.');
      let allowIdFunction = this.allowIdFunction;
      this.allowIdFunction = true;
      let evaledVariable = variable.accept(this);
      this.allowIdFunction = allowIdFunction;
      return new ir2.DefineVariable(evaledVariable, this.evaluate(exprs[1]));
    } else throw new Error('Unreachable code.');
  }

  private lambdaExpression(exprs: ir1.Expr[]): ir2.LambdaExpression {
    if (!this.inFunctionDefinition) {
      this.error('lambda: found a lambda that is not a function definition');
    } else if (exprs.length === 0) {
      this.error("lambda: expected (lambda (variable more-variable ...) expression), but nothing's there");
    }
    let paramList = exprs[0];
    let paramNames: Token[] = [];
    if (!(paramList instanceof ir1.Group)) {
      if (paramList instanceof ir1.Identifier
          || paramList instanceof ir1.Keyword) {
        this.error('lambda: expected (lambda (variable more-variable ...) expression), but found something else');
      } else if (paramList instanceof ir1.Literal) {
        if (isBoolean(paramList.value)) {
          this.error('lambda: expected (lambda (variable more-variable ...) expression), but found something else');
        } else if (isNumber(paramList.value)) {
          this.error('lambda: expected (lambda (variable more-variable ...) expression), but found a number');
        } else if (isString(paramList.value)) {
          this.error('lambda: expected (lambda (variable more-variable ...) expression), but found a string');
        } else throw new Error('Unreachable code.');
      } else throw new Error('Unreachable code.');
    } else {
      let params = paramList.elements;
      if (params.length === 0) {
        this.error('lambda: expected (lambda (variable more-variable ...) expression), but found no variables');
      }
      for (let param of params) {
        if (param instanceof ir1.Keyword) {
          this.error('lambda: expected a variable, but found a keyword');
        } else if (param instanceof ir1.Group) {
          this.error('lambda: expected a variable, but found a part');
        } else if (param instanceof ir1.Identifier) {
          let paramName = param.name;
          paramNames.push(paramName);
          this.symbolTable.define(param.name.lexeme, RacketValueType.PARAMETER);
        } else if (param instanceof ir1.Literal) {
          if (isBoolean(param.value)) {
            this.error('lambda: expected a variable, but found something else');
          } else if (isNumber(param.value)) {
            this.error('lambda: expected a variable, but found a number');
          } else if (isString(param.value)) {
            this.error('lambda: expected a variable, but found a string');
          } else throw new Error('Unreachable code.');
        } else throw new Error('Unreachable code.');
      }
      if (exprs.length === 1) {
        this.error("lambda: expected an expression for the function body, but nothing's there");
      } else if (exprs.length > 2) {
        this.error(`lambda: expected only one expression for the function body, but found ${exprs.length - 2} extra part${exprs.length - 2 === 1 ? '' : 's'}`);
      }
      let atTopLevel = this.atTopLevel;
      this.atTopLevel = false;
      let body = this.evaluate(exprs[1]);
      this.atTopLevel = atTopLevel;
      return new ir2.LambdaExpression(paramNames, body);
    }
  }
}
