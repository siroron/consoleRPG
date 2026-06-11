import type { StatusEffectType } from '../constants/statusTypes.js';

export interface ActiveStatusEffect {
  type: StatusEffectType;
  remainingTurns: number; // 0 = permanent until cured (sleep)
}

export interface StatusTickResult {
  type: StatusEffectType;
  expired: boolean;
  poisonDamage?: number;
}

export interface StatusProcessResult {
  canAct: boolean;
  paralysisBlocked: boolean;
  sleepBlocked: boolean;
  tickResults: StatusTickResult[];
}
