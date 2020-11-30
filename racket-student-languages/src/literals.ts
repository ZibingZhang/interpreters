export interface RacketValue {}

export interface RacketNumber extends RacketValue {}

export interface RacketRealNumber extends RacketNumber {
  isExact: boolean;

  isNegative(): boolean;
  isZero(): boolean;
  isPositive(): boolean;
}

export class RacketExactNumber implements RacketRealNumber {
  isExact: boolean;
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    this.isExact = true;
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    return (Number(this.numerator) / Number(this.denominator)).toString();
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

export interface RacketInexactNumber extends RacketRealNumber {
}

export class RacketInexactFraction implements RacketInexactNumber {
  isExact: boolean;
  numerator: bigint;
  denominator: bigint;

  constructor(numerator: bigint, denominator: bigint) {
    this.isExact = false;
    this.numerator = numerator;
    this.denominator = denominator;
  }

  toString(): string {
    let value = Number(this.numerator) / Number(this.denominator);
    if (Number.isInteger(value)) return '#i' + value.toString() + '.0';
    else return '#i' + value.toString();
  }

  isNegative(): boolean {
    return this.numerator / this.denominator < 0;
  }

  isZero(): boolean {
    return this.numerator / this.denominator === 0n;
  }

  isPositive(): boolean {
    return this.numerator / this.denominator > 0;
  }
}

export class RacketInexactFloat implements RacketInexactNumber {
  isExact: boolean;
  value: number;

  constructor(value: number) {
    this.isExact = false;
    this.value = value;
  }

  isNegative(): boolean {
    return this.value < 0;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  isPositive(): boolean {
    return this.value > 0;
  }
}

export class RacketComplexNumber implements RacketNumber {
  real: RacketRealNumber;
  complex: RacketRealNumber;

  constructor(real: RacketRealNumber, complex: RacketRealNumber) {
    this.real = real;
    this.complex = complex;
  }

  toString() : string {
    return this.real.toString() 
      + (!this.complex.isNegative() ? '+' : '')
      +  this.complex.toString().replace('#i', '') + 'i';
  }
}
