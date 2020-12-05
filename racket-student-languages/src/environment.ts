import { RacketValue } from "./values";

/** 
 * A nested mapping from names to values. 
 */
export class Environment {
  readonly enclosing: Environment | undefined;
  private readonly values: Map<string, RacketValue> = new Map();

  constructor(enclosing: Environment | undefined = undefined) {
    this.enclosing = enclosing;
  }
  
  /**
   * Map the name to the value.
   * @param name the name to be mapped (or defined)
   * @param value the value to which the name is mapped
   */
  define(name: string, value: RacketValue): void {
    /*
     * Note:
     *  It is not the environments job to prevent mutation. That should be
     *  enforced at the resolver level.
     */
    this.values.set(name, value);
  }

  /**
   * Get the value the name is mapped to
   * @param name the mapped name
   */
  get(name: string): RacketValue {
    /*
     * Note:
     *  It should be the case that an environment is never asked to retrieve a
     *  value that it does not have. This should be guaranteed at the resolver.
     */
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
