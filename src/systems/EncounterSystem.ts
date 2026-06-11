import type { AreaId } from '../core/GameState.js';
import type { RNG } from '../core/RNG.js';

type EncounterTable = { id: string; weight: number }[];

const ENCOUNTER_TABLES: Record<AreaId, EncounterTable> = {
  town: [],
  forest: [
    { id: 'slime',    weight: 4 },
    { id: 'goblin',   weight: 3 },
    { id: 'fire_bat', weight: 3 },
  ],
  cave: [
    { id: 'goblin',      weight: 2 },
    { id: 'fire_bat',    weight: 2 },
    { id: 'shadow_wolf', weight: 3 },
    { id: 'stone_golem', weight: 3 },
  ],
};

export function canEncounter(area: AreaId): boolean {
  return ENCOUNTER_TABLES[area].length > 0;
}

function pickWeighted(table: EncounterTable, rng: RNG): string {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = rng.next() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return table[table.length - 1].id;
}

export function getEncounterEnemyIds(area: AreaId, rng: RNG): string[] {
  const table = ENCOUNTER_TABLES[area];
  if (table.length === 0) return [];
  const count = rng.nextInt(1, 2);
  return Array.from({ length: count }, () => pickWeighted(table, rng));
}
