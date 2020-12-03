import { RacketValueType } from "./values.js";

export class SymbolTable {
  enclosing: SymbolTable | undefined;
  private values: Map<string, RacketValueType> = new Map();
  private arities: Map<string, number> = new Map();

  constructor(enclosing: SymbolTable | undefined = undefined) {
    this.enclosing = enclosing;
  }

  contains(name: string): boolean {
    return this.values.has(name) || (!!this.enclosing && this.enclosing.contains(name));
  }

  define(name: string, value: RacketValueType, arity: number | undefined = undefined): void {
    if (value === RacketValueType.FUNCTION) {
      if (arity) {
        this.arities.set(name, arity);
      } else {
        throw new Error('Unreachable code.');
      }
    }
    this.values.set(name, value);
  }

  get(name: string): RacketValueType | undefined {
    let type = this.values.get(name);
    if (type === undefined && this.enclosing) {
      return this.enclosing.get(name);
    } else {
      return type;
    }
  }

  getArity(name: string): number {
    let value = this.arities.get(name);
    if (value === undefined) {
      if (this.enclosing === undefined) {
        throw new Error('Unreachable code.');
      } else {
        return this.enclosing.getArity(name);
      }
    } else {
      return value;
    }
  }
}

