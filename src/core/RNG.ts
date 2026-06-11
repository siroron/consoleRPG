import seedrandom from 'seedrandom';

export class RNG {
  private rng: seedrandom.PRNG;
  private readonly seed: string;

  constructor(seed?: string) {
    this.seed = seed ?? Math.random().toString(36).slice(2);
    this.rng = seedrandom(this.seed);
  }

  next(): number {
    return this.rng();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  chance(probability: number): boolean {
    return this.rng() < probability;
  }

  reset(): void {
    this.rng = seedrandom(this.seed);
  }

  getSeed(): string {
    return this.seed;
  }
}
