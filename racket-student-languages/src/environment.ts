import { RacketValue } from "./values";

export class Environment {
  enclosing: Environment | undefined;
  private values: Map<string, RacketValue> = new Map();

  constructor(enclosing: Environment | undefined = undefined) {
    this.enclosing = enclosing;
  }

  contains(name: string): boolean {
    return this.values.has(name) || (!!this.enclosing && this.enclosing.contains(name));
  }

  define(name: string, value: RacketValue): void {
    this.values.set(name, value);
  }

  get(name: string): RacketValue | undefined {
    let value = this.values.get(name);
    if (value === undefined) {
      if (this.enclosing === undefined) {
        throw new Error('Unreachable code.');
      } else {
        return this.enclosing.get(name);
      }
    } else {
      return value;
    }
  }
}
