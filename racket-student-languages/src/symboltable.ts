import { UnreachableCode } from './errors.js';

/**
 * A nested mapping from names to value types.
 * 
 * It also keeps track of the arity of functions if the value is of type function.
 */
export class SymbolTable {
  readonly enclosing: SymbolTable | undefined;
  private readonly values: Map<string, RacketValueType> = new Map();
  private readonly arities: Map<string, number> = new Map();

  constructor(enclosing: SymbolTable | undefined = undefined) {
    this.enclosing = enclosing;
  }

  /**
   * Does this table contain the name?
   * @param name the name to lookup
   */
  contains(name: string): boolean {
    return this.values.has(name) || (!!this.enclosing && this.enclosing.contains(name));
  }

  /**
   * Map the name to the value.
   * 
   * @param name the name to be mapped
   * @param value the value the name is mapped to
   * @param arity the arity of the value if it is a function
   */
  define(name: string, value: RacketValueType, arity: number | undefined = undefined): void {
    if (value === RacketValueType.FUNCTION) {
      if (arity !== undefined) {
        this.arities.set(name, arity);
      } else {
        throw new UnreachableCode();
      }
    }
    this.values.set(name, value);
  }

  /**
   * Get the value type the name is mapped to.
   * @param name the mapped name
   */
  get(name: string): RacketValueType | undefined {
    let type = this.values.get(name);
    if (type === undefined && this.enclosing) {
      return this.enclosing.get(name);
    } else {
      return type;
    }
  }

  /**
   * Get the arity of the function the name represents.
   * @param name the mapped name
   */
  getArity(name: string): number {
    let value = this.arities.get(name);
    if (value === undefined) {
      if (this.enclosing === undefined) {
        throw new UnreachableCode();
      } else {
        return this.enclosing.getArity(name);
      }
    } else {
      return value;
    }
  }
}

/* -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
 * Racket Value Types
 * -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  - */

export enum RacketValueType {
  BUILTIN_FUNCTION = 'BUILTIN_FUNCTION',
  BUILTIN_LITERAL = 'BUILTIN_LITERAL',
  FUNCTION = 'FUNCTION',
  INSTANCE = 'INSTANCE',
  PARAMETER = 'PARAMETER',
  STRUCTURE = 'STRUCTURE',
  VARIABLE = 'VARIABLE'
}

