export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

export function chance(probability: number, rng: () => number): boolean {
  return rng() < probability;
}

export function rollPercent(rng: () => number): number {
  return Math.floor(rng() * 100);
}
