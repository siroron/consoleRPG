import type { Element } from '../constants/elements.js';
import type { StatusEffectType } from '../constants/statusTypes.js';
import { STATUS_CONFIG } from '../constants/statusTypes.js';
import { CONFIG } from '../constants/config.js';
import { clamp } from '../utils/math.js';
import type { Stats } from './Stats.js';
import type { ActiveStatusEffect, StatusProcessResult, StatusTickResult } from '../battle/StatusEffect.js';

export abstract class Character {
  readonly name: string;
  readonly element: Element;
  readonly baseStats: Stats;
  readonly skills: string[];

  currentHp: number;
  currentMp: number;
  isDefending = false;

  private statusEffects: ActiveStatusEffect[] = [];

  abstract get isPlayer(): boolean;

  constructor(params: {
    name: string;
    element: Element;
    stats: Stats;
    skills: string[];
    currentHp?: number;
    currentMp?: number;
  }) {
    this.name = params.name;
    this.element = params.element;
    this.baseStats = params.stats;
    this.skills = params.skills;
    this.currentHp = params.currentHp ?? params.stats.maxHp;
    this.currentMp = params.currentMp ?? params.stats.maxMp;
  }

  get isAlive(): boolean { return this.currentHp > 0; }
  get isKO(): boolean { return this.currentHp <= 0; }

  getEffectiveStats(): Stats { return this.baseStats; }

  takeDamage(amount: number): void {
    this.currentHp = clamp(this.currentHp - amount, 0, this.baseStats.maxHp);
    if (this.hasStatus('sleep')) {
      this.clearStatus('sleep');
    }
  }

  heal(amount: number): void {
    this.currentHp = clamp(this.currentHp + amount, 0, this.baseStats.maxHp);
  }

  consumeMp(amount: number): boolean {
    if (this.currentMp < amount) return false;
    this.currentMp = Math.max(0, this.currentMp - amount);
    return true;
  }

  addStatusEffect(type: StatusEffectType, duration: number): void {
    const existing = this.statusEffects.find((e) => e.type === type);
    if (existing) {
      existing.remainingTurns = duration;
    } else {
      this.statusEffects.push({ type, remainingTurns: duration });
    }
  }

  hasStatus(type: StatusEffectType): boolean {
    return this.statusEffects.some((e) => e.type === type);
  }

  clearStatus(type: StatusEffectType): void {
    this.statusEffects = this.statusEffects.filter((e) => e.type !== type);
  }

  getActiveStatuses(): readonly ActiveStatusEffect[] {
    return this.statusEffects;
  }

  startTurn(rng: () => number): StatusProcessResult {
    this.isDefending = false;

    const tickResults: StatusTickResult[] = [];
    let canAct = true;
    let paralysisBlocked = false;
    let sleepBlocked = false;

    // Poison damage
    if (this.hasStatus('poison')) {
      const dmg = Math.max(1, Math.floor(this.baseStats.maxHp * CONFIG.POISON_DAMAGE_RATE));
      this.currentHp = Math.max(0, this.currentHp - dmg);
      tickResults.push({ type: 'poison', expired: false, poisonDamage: dmg });
    }

    // Check blocking statuses
    if (this.hasStatus('sleep')) {
      canAct = false;
      sleepBlocked = true;
    }

    if (this.hasStatus('paralysis')) {
      const chanceToAct = STATUS_CONFIG.paralysis.chanceToActIfParalyzed ?? 0.5;
      paralysisBlocked = rng() >= chanceToAct;
      if (paralysisBlocked) canAct = false;
    }

    // Tick durations and collect expired effects
    const expired: StatusEffectType[] = [];
    for (const effect of this.statusEffects) {
      if (effect.remainingTurns === 0) continue; // permanent
      effect.remainingTurns--;
      if (effect.remainingTurns === 0) {
        expired.push(effect.type);
        tickResults.push({ type: effect.type, expired: true });
      }
    }
    this.statusEffects = this.statusEffects.filter((e) => !expired.includes(e.type));

    // Re-check canAct if sleep/paralysis just expired
    if (sleepBlocked && !this.hasStatus('sleep')) {
      canAct = true;
      sleepBlocked = false;
    }
    if (paralysisBlocked && !this.hasStatus('paralysis')) {
      canAct = true;
      paralysisBlocked = false;
    }

    return { canAct, paralysisBlocked, sleepBlocked, tickResults };
  }
}
