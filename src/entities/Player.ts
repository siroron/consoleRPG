import type { Element } from '../constants/elements.js';
import type { Stats } from './Stats.js';
import { Character } from './Character.js';

export interface PlayerData {
  name: string;
  level: number;
  exp: number;
  currentHp: number;
  currentMp: number;
  baseStats: Stats;
  skills: string[];
  element: Element;
}

export class Player extends Character {
  level: number;
  exp: number;

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
      baseStats: this.baseStats,
      skills: this.skills,
      element: this.element,
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
    });
  }
}
