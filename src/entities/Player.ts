import type { Element } from '../constants/elements.js';
import type { Stats } from './Stats.js';
import { Character } from './Character.js';

export interface EquipmentSlots {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface PlayerData {
  name: string;
  level: number;
  exp: number;
  currentHp: number;
  currentMp: number;
  baseStats: Stats;
  skills: string[];
  element: Element;
  equipment: EquipmentSlots;
}

export class Player extends Character {
  level: number;
  exp: number;
  equipment: EquipmentSlots;
  private _equipmentBonuses: Partial<Stats> = {};

  override get isPlayer(): boolean { return true; }

  constructor(data: PlayerData) {
    super({
      name: data.name,
      element: data.element,
      stats: data.baseStats,
      skills: data.skills,
      currentHp: data.currentHp,
      currentMp: data.currentMp,
    });
    this.level = data.level;
    this.exp = data.exp;
    this.equipment = { ...data.equipment };
  }

  override getEffectiveStats(): Stats {
    const b = this.baseStats;
    return {
      maxHp:   b.maxHp   + (this._equipmentBonuses.maxHp   ?? 0),
      maxMp:   b.maxMp   + (this._equipmentBonuses.maxMp   ?? 0),
      attack:  b.attack  + (this._equipmentBonuses.attack  ?? 0),
      defense: b.defense + (this._equipmentBonuses.defense ?? 0),
      magic:   b.magic   + (this._equipmentBonuses.magic   ?? 0),
      speed:   b.speed   + (this._equipmentBonuses.speed   ?? 0),
      luck:    b.luck    + (this._equipmentBonuses.luck    ?? 0),
    };
  }

  setEquipmentBonuses(bonuses: Partial<Stats>): void {
    this._equipmentBonuses = bonuses;
  }

  getEquipmentBonuses(): Readonly<Partial<Stats>> {
    return this._equipmentBonuses;
  }

  levelUp(growth: Partial<Stats>): void {
    this.level++;
    const stats = this.baseStats as unknown as Record<string, number>;
    for (const [key, val] of Object.entries(growth) as [string, number][]) {
      stats[key] = (stats[key] ?? 0) + val;
    }
    // Partially restore HP/MP equal to the stat gain
    if (growth.maxHp) this.currentHp = Math.min(this.currentHp + growth.maxHp, this.baseStats.maxHp);
    if (growth.maxMp) this.currentMp = Math.min(this.currentMp + growth.maxMp, this.baseStats.maxMp);
  }

  static fromData(data: PlayerData): Player {
    return new Player(data);
  }

  toData(): PlayerData {
    return {
      name: this.name,
      level: this.level,
      exp: this.exp,
      currentHp: this.currentHp,
      currentMp: this.currentMp,
      baseStats: { ...this.baseStats },
      skills: [...this.skills],
      element: this.element,
      equipment: { ...this.equipment },
    };
  }

  static createDefault(): Player {
    return new Player({
      name: '勇者',
      level: 1,
      exp: 0,
      element: 'none',
      currentHp: 150,
      currentMp: 40,
      baseStats: { maxHp: 150, maxMp: 40, attack: 25, defense: 15, magic: 20, speed: 12, luck: 8 },
      skills: ['tackle', 'fire_bolt', 'wind_slash', 'heal'],
      equipment: { weapon: 'iron_sword', armor: 'leather_mail', accessory: null },
    });
  }
}
