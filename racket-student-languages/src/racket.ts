import interpreter from './interpreter.js';
import parser from './parser.js';
import resolver from './resolver.js';
import scanner from './scanner.js';

class Racket {
  private hasError = false;
  private errors: string[] = [];

  run(text: string): void {
    let tokens = scanner.scan(text);

    if (this.hasError) { this.report(); return; }

    let ir1Exprs = parser.parse(tokens);

    if (this.hasError) { this.report(); return; }

    let ir2Exprs = resolver.resolve(ir1Exprs);
    
    if (this.hasError) { this.report(); return; }
    
    let values = interpreter.interpret(ir2Exprs);

    if (this.hasError) { this.report(); return; }

    for (let value of values) {
      console.log(value.toString());
    }
  }

  error(msg: string): void {
    this.hasError = true;
    this.errors.push(msg);
  }

  private report(): void {
    for (let msg of this.errors) {
      console.log(msg);
    }
  }
}

export default new Racket();
