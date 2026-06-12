import type { StatusEffectType } from '../constants/statusTypes.js';
import { STATUS_CONFIG } from '../constants/statusTypes.js';
import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';
import { executeSkill, type SkillHitResult } from './SkillExecutor.js';

export type BattleAction =
  | { type: 'skill'; skill: SkillData; targets: Character[] }
  | { type: 'defend' };

export interface ActionResult {
  hits: SkillHitResult[];
  logs: string[];
}

function formatStatusName(type: StatusEffectType): string {
  return STATUS_CONFIG[type].displayName;
}

export function resolveAction(
  actor: Character,
  action: BattleAction,
  rng: () => number,
): ActionResult {
  if (action.type === 'defend') {
    actor.isDefending = true;
    return { hits: [], logs: [`🛡 ${actor.name} は防御した！`] };
  }

  // Check silence: cannot use MP-cost skills
  if (actor.hasStatus('silence') && action.skill.mpCost > 0) {
    return { hits: [], logs: [`🌀 ${actor.name} は沈黙で魔法が使えない！`] };
  }

  const { skill, targets } = action;
  const hits = executeSkill(actor, targets, skill, rng);

  const logs: string[] = [`✨ ${actor.name} は ${skill.name} を使った！`];

  for (const hit of hits) {
    if (hit.healed > 0) {
      logs.push(`  💊 ${hit.target.name} の HP が ${hit.healed} 回復した！`);
    } else if (hit.damage > 0) {
      const icon = hit.isCrit ? '⚡' : '⚔';
      let line = `  ${icon} ${hit.target.name} に ${hit.damage} のダメージ！`;
      if (hit.isCrit) line += ' 【クリティカル！】';
      if (hit.elementMultiplier >= 2.0) line += ' 効果抜群！';
      else if (hit.elementMultiplier <= 0.5) line += ' ↓効果が薄い…';
      logs.push(line);
    }

    if (hit.statusApplied) {
      logs.push(`  🌀 ${hit.target.name} は ${formatStatusName(hit.statusApplied)} 状態になった！`);
    }

    if (hit.target.isKO) {
      logs.push(`  💀 ${hit.target.name} は倒れた！`);
    }
  }

  return { hits, logs };
}
