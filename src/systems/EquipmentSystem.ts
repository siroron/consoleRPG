import chalk from 'chalk';
import type { Stats } from '../entities/Stats.js';
import type { Player } from '../entities/Player.js';
import type { EquipmentData, EquipmentSlot } from '../data-access/schemas/equipment.schema.js';

export function computeEquipmentBonuses(
  equipment: { weapon: string | null; armor: string | null; accessory: string | null },
  equipmentMap: Map<string, EquipmentData>,
): Partial<Stats> {
  const bonuses: Partial<Stats> = {};
  const ids = [equipment.weapon, equipment.armor, equipment.accessory];
  for (const id of ids) {
    if (!id) continue;
    const equip = equipmentMap.get(id);
    if (!equip) continue;
    for (const [key, val] of Object.entries(equip.statBonus) as [keyof Stats, number | undefined][]) {
      if (val !== undefined) {
        bonuses[key] = (bonuses[key] ?? 0) + val;
      }
    }
  }
  return bonuses;
}

export function applyEquipmentBonuses(
  player: Player,
  equipmentMap: Map<string, EquipmentData>,
): void {
  player.setEquipmentBonuses(computeEquipmentBonuses(player.equipment, equipmentMap));
}

export function equip(
  player: Player,
  equipmentId: string,
  slot: EquipmentSlot,
  equipmentMap: Map<string, EquipmentData>,
): void {
  player.equipment[slot] = equipmentId;
  applyEquipmentBonuses(player, equipmentMap);
}

export function unequip(
  player: Player,
  slot: EquipmentSlot,
  equipmentMap: Map<string, EquipmentData>,
): void {
  player.equipment[slot] = null;
  applyEquipmentBonuses(player, equipmentMap);
}

export function formatStatBonus(bonus: Partial<Stats>): string {
  const parts: string[] = [];
  if (bonus.maxHp)   parts.push(`HP+${bonus.maxHp}`);
  if (bonus.maxMp)   parts.push(`MP+${bonus.maxMp}`);
  if (bonus.attack)  parts.push(`ATK+${bonus.attack}`);
  if (bonus.defense) parts.push(`DEF+${bonus.defense}`);
  if (bonus.magic)   parts.push(`MAG+${bonus.magic}`);
  if (bonus.speed)   parts.push(`SPD+${bonus.speed}`);
  if (bonus.luck)    parts.push(`LCK+${bonus.luck}`);
  return parts.length > 0 ? parts.join(' ') : '---';
}

export function formatStatComparison(
  candidate: Partial<Stats>,
  current: Partial<Stats>,
): string[] {
  const STAT_KEYS: (keyof Stats)[] = ['attack', 'defense', 'magic', 'speed', 'luck', 'maxHp', 'maxMp'];
  const STAT_LABELS: Record<keyof Stats, string> = {
    attack: 'ATK', defense: 'DEF', magic: 'MAG', speed: 'SPD', luck: 'LCK', maxHp: 'HP', maxMp: 'MP',
  };
  const lines: string[] = [];
  for (const key of STAT_KEYS) {
    const newVal = candidate[key] ?? 0;
    const oldVal = current[key] ?? 0;
    if (newVal === 0 && oldVal === 0) continue;
    const diff = newVal - oldVal;
    const diffStr = diff > 0 ? `(+${diff})` : diff < 0 ? `(${diff})` : '(±0)';
    const line = `  ${STAT_LABELS[key]}: ${oldVal} → ${newVal} ${diffStr}`;
    if (diff > 0)      lines.push(chalk.green(line));
    else if (diff < 0) lines.push(chalk.red(line));
    else               lines.push(chalk.dim(line));
  }
  return lines.length > 0 ? lines : [chalk.dim('  (変化なし)')];
}
