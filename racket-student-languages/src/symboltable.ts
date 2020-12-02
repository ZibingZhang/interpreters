import { RacketValueType } from "./values";

export class SymbolTable {
  values: Map<string, RacketValueType> = new Map();

  contains(name: string): boolean {
    return this.values.has(name);
  }

  define(name: string, value: RacketValueType): void {
    // TODO: cant redefine something
    this.values.set(name, value);
  }

  get(name: string): RacketValueType | undefined {
    return this.values.get(name);
  }
}

