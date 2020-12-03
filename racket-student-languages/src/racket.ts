import Interpreter from './interpreter.js';
import parser from './parser.js';
import Resolver from './resolver.js';
import scanner from './scanner.js';

class Racket {
  resolver: Resolver = new Resolver();
  interpreter: Interpreter = new Interpreter();

  private hasError = false;
  private errors: string[] = [];

  run(text: string): void {
    this.hasError = false;
    this.errors = [];

    let tokens = scanner.scan(text);

    if (this.report()) return;

    let ir1Exprs = parser.parse(tokens);

    if (this.report()) return;

    let resolver = new Resolver();
    let ir2Exprs = resolver.resolve(ir1Exprs);
    
    if (this.report()) return;
    
    this.interpreter = new Interpreter();
    let values = this.interpreter.interpret(ir2Exprs);

    if (this.report()) return;

    for (let value of values) {
      console.log(value.toString());
    }
  }

  error(msg: string): void {
    this.hasError = true;
    this.errors.push(msg);
  }

  private report(): boolean {
    if (!this.hasError) return false;
    for (let msg of this.errors) {
      console.log(msg);
    }
    return true;
  }
}

export default new Racket();
