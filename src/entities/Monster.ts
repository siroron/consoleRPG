import { Character } from './Character.js';
import type { MonsterData } from '../data-access/schemas/monster.schema.js';

export class Monster extends Character {
  readonly id: string;
  readonly aiType: 'aggressive' | 'defensive' | 'smart';
  readonly exp: number;
  readonly gold: number;
  readonly drops: { itemId: string; rate: number }[];

  override get isPlayer(): boolean { return false; }

  constructor(data: MonsterData) {
    super({
      name: data.name,
      element: data.element,
      stats: data.stats,
      skills: data.skills,
    });
    this.id = data.id;
    this.aiType = data.aiType;
    this.exp = data.exp;
    this.gold = data.gold;
    this.drops = data.drops;
  }

  static fromData(data: MonsterData): Monster {
    return new Monster(data);
  }
}
