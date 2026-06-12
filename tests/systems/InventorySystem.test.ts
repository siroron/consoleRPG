import { describe, it, expect } from 'vitest';
import {
  addItem,
  removeItem,
  getItemCount,
  applyItemEffect,
  type InventoryEntry,
} from '../../src/systems/InventorySystem.js';
import { Player } from '../../src/entities/Player.js';
import type { ItemData } from '../../src/data-access/schemas/item.schema.js';

// ──────────────────────────────────────────────────────────
// テスト用データ
// ──────────────────────────────────────────────────────────
const POTION: ItemData = {
  id: 'potion', name: 'ポーション', description: 'HPを回復', effect: 'heal_hp', power: 100, price: 50,
};
const HERB: ItemData = {
  id: 'herb', name: 'やくそう', description: 'MPを回復', effect: 'heal_mp', power: 30, price: 40,
};
const ANTIDOTE: ItemData = {
  id: 'antidote', name: 'どくけし', description: '毒を治す', effect: 'cure_status',
  power: 0, statusToCure: 'poison', price: 30,
};

function makePlayer(overrides: Partial<{ currentHp: number; currentMp: number }> = {}): Player {
  const p = Player.createDefault();
  if (overrides.currentHp !== undefined) p.currentHp = overrides.currentHp;
  if (overrides.currentMp !== undefined) p.currentMp = overrides.currentMp;
  return p;
}

// ──────────────────────────────────────────────────────────
// addItem
// ──────────────────────────────────────────────────────────
describe('addItem', () => {
  it('空のインベントリに新規アイテムを追加する', () => {
    const result = addItem([], 'potion');
    expect(result).toEqual([{ itemId: 'potion', count: 1 }]);
  });

  it('既存アイテムにスタックする', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 2 }];
    const result = addItem(inv, 'potion');
    expect(result).toEqual([{ itemId: 'potion', count: 3 }]);
  });

  it('count パラメータで複数個追加できる', () => {
    const result = addItem([], 'potion', 5);
    expect(result[0].count).toBe(5);
  });

  it('異なるアイテムは別エントリとして追加される', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 1 }];
    const result = addItem(inv, 'herb');
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.itemId === 'herb')?.count).toBe(1);
  });

  it('元のインベントリは変更しない（イミュータブル）', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 1 }];
    addItem(inv, 'potion');
    expect(inv[0].count).toBe(1); // unchanged
  });
});

// ──────────────────────────────────────────────────────────
// removeItem
// ──────────────────────────────────────────────────────────
describe('removeItem', () => {
  it('カウントを 1 減らす', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 3 }];
    const result = removeItem(inv, 'potion');
    expect(result).toEqual([{ itemId: 'potion', count: 2 }]);
  });

  it('count が 0 になったエントリを削除する', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 1 }];
    const result = removeItem(inv, 'potion');
    expect(result).toHaveLength(0);
  });

  it('存在しないアイテムを指定しても他のエントリに影響しない', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 2 }];
    const result = removeItem(inv, 'herb');
    expect(result).toEqual(inv);
  });
});

// ──────────────────────────────────────────────────────────
// getItemCount
// ──────────────────────────────────────────────────────────
describe('getItemCount', () => {
  it('存在しないアイテムは 0 を返す', () => {
    expect(getItemCount([], 'potion')).toBe(0);
  });

  it('存在するアイテムの個数を返す', () => {
    const inv: InventoryEntry[] = [{ itemId: 'potion', count: 7 }];
    expect(getItemCount(inv, 'potion')).toBe(7);
  });
});

// ──────────────────────────────────────────────────────────
// applyItemEffect
// ──────────────────────────────────────────────────────────
describe('applyItemEffect', () => {
  it('heal_hp — HP を回復する', () => {
    const player = makePlayer({ currentHp: 1 });
    const maxHp = player.baseStats.maxHp;

    applyItemEffect(POTION, player);

    expect(player.currentHp).toBe(Math.min(1 + POTION.power, maxHp));
  });

  it('heal_hp — maxHp を超えない', () => {
    const player = makePlayer({ currentHp: player_max_hp_minus(10) });
    applyItemEffect({ ...POTION, power: 9999 }, player);
    expect(player.currentHp).toBe(player.baseStats.maxHp);
  });

  it('heal_mp — MP を回復する', () => {
    const player = makePlayer({ currentMp: 0 });
    applyItemEffect(HERB, player);
    expect(player.currentMp).toBe(HERB.power);
  });

  it('cure_status — 毒状態を回復する', () => {
    const player = makePlayer();
    player.addStatusEffect('poison', 3);
    expect(player.hasStatus('poison')).toBe(true);

    applyItemEffect(ANTIDOTE, player);

    expect(player.hasStatus('poison')).toBe(false);
  });

  it('cure_status — 対象の状態異常がない場合は効果なしログを返す', () => {
    const player = makePlayer();
    const logs = applyItemEffect(ANTIDOTE, player);
    expect(logs.some((l) => l.includes('効果がなかった'))).toBe(true);
  });
});

// ヘルパー：最大HP - n の値を返す
function player_max_hp_minus(n: number): number {
  return Player.createDefault().baseStats.maxHp - n;
}
