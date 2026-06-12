import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import type { ZodSchema } from 'zod';
import { MonstersFileSchema, type MonsterData } from './schemas/monster.schema.js';
import { SkillsFileSchema, type SkillData } from './schemas/skill.schema.js';
import { EquipmentsFileSchema, type EquipmentData } from './schemas/equipment.schema.js';
import { ItemsFileSchema, type ItemData } from './schemas/item.schema.js';

export class DataLoadError extends Error {
  constructor(
    public readonly filePath: string,
    public override readonly cause: unknown,
  ) {
    super(`Failed to load data from ${filePath}: ${String(cause)}`);
    this.name = 'DataLoadError';
  }
}

export class DataLoader {
  private readonly cache = new Map<string, unknown>();
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    const thisFile = fileURLToPath(import.meta.url);
    this.dataDir = dataDir ?? join(dirname(thisFile), '../../data');
  }

  private async load<T>(filename: string, schema: ZodSchema<T>): Promise<T> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename) as T;
    }
    const filePath = join(this.dataDir, filename);
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch (err) {
      throw new DataLoadError(filePath, err);
    }
    const json = JSON.parse(raw) as unknown;
    const parsed = schema.parse(json);
    this.cache.set(filename, parsed);
    return parsed;
  }

  async getMonsters(): Promise<MonsterData[]> {
    return this.load('monsters.json', MonstersFileSchema);
  }

  async getSkills(): Promise<SkillData[]> {
    return this.load('skills.json', SkillsFileSchema);
  }

  async getEquipments(): Promise<EquipmentData[]> {
    return this.load('equipments.json', EquipmentsFileSchema);
  }

  async getItems(): Promise<ItemData[]> {
    return this.load('items.json', ItemsFileSchema);
  }
}
