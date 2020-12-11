import { RacketValue } from "./values";

export default class Stack {
  frames: [string, RacketValue[]][] = [];

  push(name: string) {
    this.frames.unshift([name, []]);
  }

  set(args: RacketValue[]): void {
    this.frames[0][1] = args;
  }

  pop(): [string, RacketValue[]] | undefined {
    return this.frames.shift();
  }

  peek(): string {
    return this.frames[0][0];
  }

  args(): RacketValue[] {
    return this.frames[0][1];
  }

  size(): number {
    return this.frames.length;
  }
}
