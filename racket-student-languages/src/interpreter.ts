import BUILT_INS from './builtins.js';
import { Environment } from './environment.js';
import { 
  BuiltinFunctionError, 
  DivByZero, 
  StackOverflow, 
  StructureFunctionError, 
  UnreachableCode 
} from './errors.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';
import Stack from './stack.js';
import { 
  isBoolean,
  isCallable, 
  RacketLambda,
  RacketStructure,
  RacketSymbol,
  RacketValue, 
  RACKET_EMPTY_LIST,
  RACKET_FALSE,
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
  };

  private static TailEndRecursion = class extends Error {};

  environment: Environment = new Environment();
  stack: Stack = new Stack();

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

  visitAndExpression(expr: ir2.AndExpression): RacketValue {
    for (let arg of expr.expressions) {
      let value = this.evaluate(arg);
      if (value === RACKET_FALSE) {
        return RACKET_FALSE;
      } else if (value !== RACKET_TRUE) {
        this.error('and: question result is not true or false: ' + value.toString());
      }
    }
    return RACKET_TRUE;
  }

  visitCall(expr: ir2.Call): RacketValue {
    if (this.stack.size() > 1000) {
      throw new StackOverflow();
    }
    let callee = this.evaluate(expr.callee);
    if (!isCallable(callee)) {
      throw new UnreachableCode();
    }
    let name = callee.name;
    if (name === undefined) {
      let args = expr.arguments.map(this.evaluate.bind(this));
      return callee.call(args);
    } else if (this.stack.size() > 0 && name === this.stack.peek()) {
      let args = expr.arguments.map(this.evaluate.bind(this));
      this.stack.set(args);
      throw new Interpreter.TailEndRecursion();
    } else {
      this.stack.push(name);
      let args = expr.arguments.map(this.evaluate.bind(this));
      this.stack.set(args);
      while (true) {
        try {
          let result = callee.call(this.stack.args());
          this.stack.pop();
          return result;
        } catch (err) {
          if (!(err instanceof Interpreter.TailEndRecursion)) {
            throw err;
          }
        }
      }
    }
  }

  visitCondExpression(expr: ir2.CondExpression): RacketValue {
    for (let clause of expr.clauses) {
      let question = this.evaluate(clause[0]);
      if (!isBoolean(question)) {
        this.error('cond: question result is not true or false:' + question.toString());
      } else if (question === RACKET_TRUE) {
        return this.evaluate(clause[1]);
      }
    }
    this.error('cond: all question results were false');
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
    if (value instanceof RacketLambda) {
      value.name = name;
    }
    this.environment.define(name, value);
    return;
  }

  visitIdentifier(expr: ir2.Identifier): RacketValue {
    let name = expr.name.lexeme;
    let value = this.environment.get(name);
    if (value === undefined) {
      this.error(name + ' is used here before its definition');
    }
    return value;
  }

  visitIfExpression(expr: ir2.IfExpression): RacketValue {
    let predicate = this.evaluate(expr.predicate);
    if (predicate === RACKET_TRUE) {
      return this.evaluate(expr.ifTrue);
    } else if (predicate === RACKET_FALSE) {
      return this.evaluate(expr.ifFalse);
    } else {
      this.error('if: question result is not true or false: ' + predicate.toString());
    }
  }

  visitLambdaExpression(expr: ir2.LambdaExpression): RacketLambda {
    return new RacketLambda(expr.names.map(name => name.lexeme), expr.body, this.environment);
  }

  visitLiteral(expr: ir2.Literal): RacketValue {
    return expr.value;
  }

  visitOrExpression(expr: ir2.OrExpression): RacketValue {
    for (let arg of expr.expressions) {
      let value = this.evaluate(arg);
      if (value === RACKET_TRUE) {
        return RACKET_TRUE;
      } else if (value !== RACKET_FALSE) {
        this.error('or: question result is not true or false: ' + value.toString());
      }
    }
    return RACKET_FALSE;
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
      } else if (err instanceof StackOverflow) {
        racket.error('stack overflow');
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
      } else if (err instanceof StackOverflow) {
        racket.error('stack overflow');
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
