import parser from './parser.js';
import scanner from './scanner.js';

class Interpreter {
  private hasError = false;
  private errors: string[] = [];

  run(text: string): void {
    let tokens = scanner.scan(text);

    if (this.hasError) {
      this.report();
      return;
    }

    parser.parse(tokens);

    if (this.hasError) {
      this.report();
      return;
    }

    for (let token of tokens) {
      console.log(token.toString());
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

export default new Interpreter();
