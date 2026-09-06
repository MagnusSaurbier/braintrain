export type Rng = {
  next: () => number;                      // [0, 1)
  int: (min: number, max: number) => number;
  pick: <T>(arr: T[]) => T;
};

export function createRng(seed: number): Rng {
  let s = seed | 0;
  function next(): number {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  }
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
