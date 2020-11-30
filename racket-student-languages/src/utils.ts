export function gcd(a: bigint, b: bigint): bigint {
  if (a === b) return a;
  if (a === 0n) return b;
  if (b === 0n) return a;
  if (a % 2n === 0n) {  // a is even
    if (b % 2n === 1n) {  // b is even
      return gcd(a / 2n, b);
    } else {  // b is odd
      return 2n * gcd(a / 2n, b / 2n);
    }
  } else {  // a is odd
    if (b % 2n === 1n) {  // b is even
      return gcd(a, b / 2n);
    }

    // b is odd
    if (a > b) {
      return gcd((a - b) / 2n, b);
    } else {
      return gcd((b - a) / 2n, a);
    }
  }
}
