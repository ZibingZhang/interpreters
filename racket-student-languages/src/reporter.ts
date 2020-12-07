import BUILT_INS from './builtins.js';
import { 
  ResolverError,
  UnreachableCode
} from './errors.js';
import * as ir1 from './ir1.js';
import { RacketValueType } from './symboltable.js';
import { 
  isBoolean, 
  isNumber, 
  isString, 
  // isSymbol
} from './values.js';

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Concrete Class
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

/**
 * Checks for and reports errors.
 */
class ErrorReporter {
  resolver: ResolverErrorReporter = new ResolverErrorReporter();
}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Resolver Potential Errors
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

class ResolverErrorReporter {

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Visit Group
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  emptyGroup(): never {
    this.error("function call: expected a function after the open parenthesis, but nothing's there");
  }

  badCalleeType(callee: ir1.Expr): never {
    let baseMsg = 'function call: expected a function after the open parenthesis, ';
    if (callee instanceof ir1.Literal) {
      if (isBoolean(callee.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(callee.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(callee.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else if (callee instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else throw new UnreachableCode();
  }

  undefinedCallee(name: string): never {
    this.error(`${name}: this function is not defined`);
  }

  checkCalleeValueType(type: RacketValueType, name: string): void {
    let baseMsg = 'function call: expected a function after the open parenthesis, ';
    if (type === RacketValueType.STRUCTURE) {
      this.error(baseMsg + `but found a structure type (do you mean make-${name})`);
    } else if (type === RacketValueType.VARIABLE) {
      this.error(baseMsg + 'but found a variable');
    }
  }

  functionArityMismatch(name: string, expected: number, actual: number): never {
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

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Visit Identifier
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  undefinedIdentifier(name: string): never {
    this.error(`${name}: this variable is not defined`);
  }

  checkIdentifierType(type: RacketValueType, evaluatingCallee: boolean, name: string): void {
    if ([RacketValueType.BUILTIN_FUNCTION, RacketValueType.FUNCTION].includes(type)) {
      if (!evaluatingCallee) {
        this.error(`${name}: expected a function call, but there is no open parenthesis before this function`);
      }
    } else if (type === RacketValueType.STRUCTURE) {
      this.error(`${name}: structure type; do you mean make-${name}`);
    }
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Visit Keyword
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  missingOpenParenthesis(keyword: string): never {
    this.error(`${keyword}: expected an open parenthesis before ${keyword}, but found none`);
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Define
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  nonTopLevelDefinition(): never {
    this.error('define: found a definition that is not at the top level');
  }

  emptyDefine(): never {
    this.error("define: expected a variable name, or a function name and its variables (in parentheses), but nothing's there");
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Define Function
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  missingFunctionName(): never {
    this.error("define: expected a name for the function, but nothing's there");
  }

  badFunctionNameType(identifier: ir1.Expr): never {
    let baseMsg = 'define: expected the name of the function, ';
    if (identifier instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found a keyword');
    } else if (identifier instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else if (identifier instanceof ir1.Literal) {
      if (isBoolean(identifier.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(identifier.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(identifier.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  noFunctionParams(): never {
    this.error('define: expected at least one variable after the function name, but found none');
  }

  badFunctionParamType(param: ir1.Expr): never {
    let baseMsg = 'define: expected a variable, ';
    if (param instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found a keyword');
    } else if (param instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else if (param instanceof ir1.Literal) {
      if (isBoolean(param.value)) {
        this.error(baseMsg + 'but found a something else');
      } else if (isNumber(param.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(param.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  missingFunctionBody(): never {
    this.error("define: expected an expression for the function body, but nothing's there");
  }

  expectedSingleExpressionFunctionBody(exprs: number): never {
    this.error(`define: expected only one expression for the function body, but found ${exprs - 1} extra part${exprs - 1 === 1 ? '' : 's'}`);
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Define Structure
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  nonTopLevelStructureDefinition(): never {
    this.error('define-struct: found a definition that is not at the top level');
  }

  missingStructureName(): never {
    this.error("define-struct: expected the structure name after define-struct, but nothing's there");
  }

  badStructureNameType(identifier: ir1.Expr): never {
    let baseMsg = 'define-struct: expected the structures name after define-struct, ';
    if (identifier instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else if (identifier instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found a keyword');
    } else if (identifier instanceof ir1.Literal) {
      if (isBoolean(identifier.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(identifier.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(identifier.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  missingFieldNames(): never {
    this.error("define-struct: expected at least one field name (in parentheses) after the structure name, but nothing's there");
  }

  badFieldNamesType(fieldNames: ir1.Expr): never {
    let baseMsg = 'define-struct: expected at least one field name (in parentheses) after the structure name, ';
    if (fieldNames instanceof ir1.Identifier
        || fieldNames instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found something else');
    } else if (fieldNames instanceof ir1.Literal) {
      if (isBoolean(fieldNames.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(fieldNames.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(fieldNames.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  badFieldNameType(fieldName: ir1.Expr): never {
    let baseMsg = 'define-struct: expected a field name, ';
    if (fieldName instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else if (fieldName instanceof ir1.Literal) {
      if (isBoolean(fieldName.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(fieldName.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(fieldName.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Define Variable
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  badVariableNameType(identifier: ir1.Expr): never {
    let baseMsg = 'define: expected a variable name, or a function name and its variables (in parentheses), ';
    if (identifier instanceof ir1.Literal) {
      if (isBoolean(identifier.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(identifier.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(identifier.value)) { 
        this.error(baseMsg + 'but found a string');
      } else throw new Error('Unreachable code.');
    } else if (identifier instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found a keyword');
    } else throw new UnreachableCode();
  }

  variableCannotUseKeywordName(): never {
    this.error('define: expected a variable name, or a function name and its variables (in parentheses), but found a keyword');
  }

  missingVariableExpression(name: string): never {
    this.error(`define: expected an expression after the variable name ${name}, but nothing's there`);
  }

  expectedSingleExpressionVariableValue(name: string, exprs: number) {
    this.error(`define: expected only one expression after the variable name ${name}, but found ${exprs - 2} extra part${exprs - 2 === 1 ? '' : 's'}`);
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Lambda Expression
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  lambdaNotInFunctionDefinition(): never {
    this.error('lambda: found a lambda that is not a function definition');
  }

  missingLambdaParams(): never {
    this.error("lambda: expected (lambda (variable more-variable ...) expression), but nothing's there");
  }

  badLambdaParamListType(paramList: ir1.Expr): never {
    let baseMsg = 'lambda: expected (lambda (variable more-variable ...) expression), ';
    if (paramList instanceof ir1.Identifier
      || paramList instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found something else');
    } else if (paramList instanceof ir1.Literal) {
      if (isBoolean(paramList.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(paramList.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(paramList.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  noLambdaParams(): never {
    this.error('lambda: expected (lambda (variable more-variable ...) expression), but found no variables');
  }

  badLambdaParamType(param: ir1.Expr): never {
    let baseMsg = 'lambda: expected a variable, ';
    if (param instanceof ir1.Keyword) {
      this.error(baseMsg + 'but found a keyword');
    } else if (param instanceof ir1.Group) {
      this.error(baseMsg + 'but found a part');
    } else if (param instanceof ir1.Literal) {
      if (isBoolean(param.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(param.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(param.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  missingLambdaBody(): never {
    this.error("lambda: expected an expression for the function body, but nothing's there");
  }

  expectedSingleExpressionLambdaBody(exprs: number): never {
    this.error(`lambda: expected only one expression for the function body, but found ${exprs - 2} extra part${exprs - 2 === 1 ? '' : 's'}`);
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Group Sub-Case: Quoted
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  quoteArityMismatch(): never {
    this.error('quote: expected an open parenthesis before quote, but found none');
  }

  badQuotedExpressionType(expr: ir1.Expr): never {
    let baseMsg = 'quote: expected the name of a symbol or () after the quote, ';
    if (expr instanceof ir1.Literal) {
      if (isBoolean(expr.value)) {
        this.error(baseMsg + 'but found something else');
      } else if (isNumber(expr.value)) {
        this.error(baseMsg + 'but found a number');
      } else if (isString(expr.value)) {
        this.error(baseMsg + 'but found a string');
      } else throw new UnreachableCode();
    } else throw new UnreachableCode();
  }

  quotedNonEmptyGroup(): never {
    this.error('quote: expected the name of a symbol or () after the quote, but found a part');
  }
  
  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * General Errors
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */
  
  duplicateName(name: string): never {
    if (BUILT_INS.has(name)) {
      this.error(name + ': this name was defined in the language or a required library and cannot be re-defined');
    } else{
      this.error(name + ': this name was defined previously and cannot be re-defined');
    }
  }

  /* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
   * Error Reporting
   * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

  private error(msg: string): never {
    throw new ResolverError(msg);
  }
}

/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
 * Exports
 * = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = */

export const reporter =  new ErrorReporter();
