import * as ir1 from './ir1.js';
import * as ir2 from './ir2.js';
import racket from './racket.js';

class Ir1Resolver implements ir1.ExprVisitor {
  private static Ir1ResolverError = class extends Error {
    msg: string;

    constructor(msg: string) {
      super();
      this.msg = msg;
    }
  }

  visitCall(expr: ir1.Call): ir2.Call {
    if (expr.callee === undefined) throw new Ir1Resolver.Ir1ResolverError(
      "function call: expected a function call after the open parenthesis, but nothing's there"
    );
    let callee = this.evaluate(expr.callee);
    let args = expr.args.map(this.evaluate.bind(this));
    return new ir2.Call(callee, args);
  }

  visitLiteral(expr: ir1.Literal): ir2.Literal {
    return new ir2.Literal(expr.value);
  }

  visitVariable(expr: ir1.Variable): ir2.Variable {
    return new ir2.Variable(expr.name);
  }

  resolve(ir1Exprs: ir1.Expr[]): ir2.Expr[] {
    let ir2Exprs = [];
    try {
      for (let ir1Expr of ir1Exprs) {
        ir2Exprs.push(ir1Expr.accept(this));
      }
    } catch (err) {
      if (err instanceof Ir1Resolver.Ir1ResolverError) {
        racket.error(err.msg);
      } else {
        throw err;
      }
    }
    return ir2Exprs;
  }

  private evaluate(expr: ir1.Expr): ir2.Expr {
    return expr.accept(this);
  }
}

export default new Ir1Resolver();
