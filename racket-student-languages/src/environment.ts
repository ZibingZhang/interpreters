import { RacketValue } from "./values";

export class Environment {
  values: Map<string, RacketValue> = new Map();

  define(name: string, value: RacketValue): void {
    // TODO: cant redefine something
    this.values.set(name, value);
  }

  get(name: string): RacketValue | undefined {
    return this.values.get(name);
  }
}
