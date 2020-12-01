import { RacketValue } from "./values";

export class Environment {
  values: Map<string, RacketValue> = new Map();

  contains(name: string): boolean {
    return name in this.values;
  }

  define(name: string, value: RacketValue): void {
    // TODO: cant redefine something
    this.values.set(name, value);
  }

  get(name: string): RacketValue | undefined {
    return this.values.get(name);
  }
}
