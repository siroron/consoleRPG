import { describe, it, expect } from 'vitest';
import {
  computeEquipmentBonuses,
  applyEquipmentBonuses,
  equip,
  unequip,
  formatStatBonus,
} from '../../src/systems/EquipmentSystem.js';
import { Player } from '../../src/entities/Player.js';
import type { EquipmentData } from '../../src/data-access/schemas/equipment.schema.js';

const SWORD: EquipmentData = {
  id: 'iron_sword', name: '鉄の剣', type: 'weapon',
  statBonus: { attack: 10 }, price: 200, description: 'ベーシックな剣',
};
const ARMOR: EquipmentData = {
  id: 'leather_mail', name: '革鎧', type: 'armor',
  statBonus: { defense: 8 }, price: 150, description: '軽い鎧',
};
const RING: EquipmentData = {
  id: 'speed_ring', name: 'スピードリング', type: 'accessory',
  statBonus: { speed: 5, luck: 2 }, price: 200, description: '素早さが上がる',
};

const equipMap = new Map<string, EquipmentData>([
  ['iron_sword',   SWORD],
  ['leather_mail', ARMOR],
  ['speed_ring',   RING],
]);

// ──────────────────────────────────────────────────────────
// computeEquipmentBonuses
// ──────────────────────────────────────────────────────────
describe('computeEquipmentBonuses', () => {
  it('装備なしの場合は空オブジェクトを返す', () => {
    const bonuses = computeEquipmentBonuses(
      { weapon: null, armor: null, accessory: null },
      equipMap,
    );
    expect(bonuses).toEqual({});
  });

  it('武器のみのボーナスを計算する', () => {
    const bonuses = computeEquipmentBonuses(
      { weapon: 'iron_sword', armor: null, accessory: null },
      equipMap,
    );
    expect(bonuses.attack).toBe(10);
    expect(bonuses.defense).toBeUndefined();
  });

  it('全スロット装備時にボーナスを合算する', () => {
    const bonuses = computeEquipmentBonuses(
      { weapon: 'iron_sword', armor: 'leather_mail', accessory: 'speed_ring' },
      equipMap,
    );
    expect(bonuses.attack).toBe(10);
    expect(bonuses.defense).toBe(8);
    expect(bonuses.speed).toBe(5);
    expect(bonuses.luck).toBe(2);
  });

  it('equipmentMap にない ID は無視する', () => {
    const bonuses = computeEquipmentBonuses(
      { weapon: 'unknown_sword', armor: null, accessory: null },
      equipMap,
    );
    expect(bonuses).toEqual({});
  });
});

// ──────────────────────────────────────────────────────────
// applyEquipmentBonuses
// ──────────────────────────────────────────────────────────
describe('applyEquipmentBonuses', () => {
  it('武器ボーナスがプレイヤーの実効 ATK に反映される', () => {
    const player = Player.createDefault();
    player.equipment = { weapon: 'iron_sword', armor: null, accessory: null };
    const baseAtk = player.baseStats.attack;

    applyEquipmentBonuses(player, equipMap);

    expect(player.getEffectiveStats().attack).toBe(baseAtk + 10);
  });

  it('複数装備のボーナスが正しく積み上がる', () => {
    const player = Player.createDefault();
    player.equipment = { weapon: 'iron_sword', armor: 'leather_mail', accessory: 'speed_ring' };
    const baseAtk = player.baseStats.attack;
    const baseDef = player.baseStats.defense;
    const baseSpd = player.baseStats.speed;

    applyEquipmentBonuses(player, equipMap);

    const eff = player.getEffectiveStats();
    expect(eff.attack).toBe(baseAtk + 10);
    expect(eff.defense).toBe(baseDef + 8);
    expect(eff.speed).toBe(baseSpd + 5);
  });
});

// ──────────────────────────────────────────────────────────
// equip / unequip
// ──────────────────────────────────────────────────────────
describe('equip', () => {
  it('スロットに装備セットして実効ステータスを更新する', () => {
    const player = Player.createDefault();
    player.equipment = { weapon: null, armor: null, accessory: null };
    const baseAtk = player.getEffectiveStats().attack;

    equip(player, 'iron_sword', 'weapon', equipMap);

    expect(player.equipment.weapon).toBe('iron_sword');
    expect(player.getEffectiveStats().attack).toBe(baseAtk + 10);
  });
});

describe('unequip', () => {
  it('スロットから外してボーナスをリセットする', () => {
    const player = Player.createDefault();
    player.equipment = { weapon: 'iron_sword', armor: null, accessory: null };
    applyEquipmentBonuses(player, equipMap);
    const atkWithSword = player.getEffectiveStats().attack;

    unequip(player, 'weapon', equipMap);

    expect(player.equipment.weapon).toBeNull();
    expect(player.getEffectiveStats().attack).toBe(atkWithSword - 10);
  });
});

// ──────────────────────────────────────────────────────────
// formatStatBonus
// ──────────────────────────────────────────────────────────
describe('formatStatBonus', () => {
  it('各ステータスを "KEY+VAL" 形式でフォーマットする', () => {
    const result = formatStatBonus({ attack: 10, defense: 5, speed: 3 });
    expect(result).toContain('ATK+10');
    expect(result).toContain('DEF+5');
    expect(result).toContain('SPD+3');
  });

  it('ボーナスが空の場合は "---" を返す', () => {
    expect(formatStatBonus({})).toBe('---');
  });
});
