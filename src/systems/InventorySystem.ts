import type { Character } from '../entities/Character.js';
import type { ItemData } from '../data-access/schemas/item.schema.js';
import { STATUS_CONFIG } from '../constants/statusTypes.js';

export type InventoryEntry = { itemId: string; count: number };

export function addItem(inventory: InventoryEntry[], itemId: string, count = 1): InventoryEntry[] {
  const existing = inventory.find((e) => e.itemId === itemId);
  if (existing) {
    return inventory.map((e) => (e.itemId === itemId ? { ...e, count: e.count + count } : e));
  }
  return [...inventory, { itemId, count }];
}

export function removeItem(inventory: InventoryEntry[], itemId: string): InventoryEntry[] {
  return inventory
    .map((e) => (e.itemId === itemId ? { ...e, count: e.count - 1 } : e))
    .filter((e) => e.count > 0);
}

export function getItemCount(inventory: InventoryEntry[], itemId: string): number {
  return inventory.find((e) => e.itemId === itemId)?.count ?? 0;
}

export function applyItemEffect(item: ItemData, target: Character): string[] {
  const logs: string[] = [`${target.name} は ${item.name} を使った！`];

  switch (item.effect) {
    case 'heal_hp': {
      const before = target.currentHp;
      target.heal(item.power);
      const restored = target.currentHp - before;
      logs.push(`  ${target.name} の HP が ${restored} 回復した！`);
      break;
    }
    case 'heal_mp': {
      const maxMp = target.getEffectiveStats().maxMp;
      const before = target.currentMp;
      target.currentMp = Math.min(target.currentMp + item.power, maxMp);
      const restored = target.currentMp - before;
      logs.push(`  ${target.name} の MP が ${restored} 回復した！`);
      break;
    }
    case 'cure_status': {
      if (item.statusToCure && target.hasStatus(item.statusToCure)) {
        target.clearStatus(item.statusToCure);
        logs.push(`  ${target.name} の ${STATUS_CONFIG[item.statusToCure].displayName} が治った！`);
      } else {
        logs.push(`  しかし効果がなかった…`);
      }
      break;
    }
  }

  return logs;
}
