import { describe, it, expect } from 'vitest';
import { buyEquipment, sellEquipment, getSellPrice, SELL_RATE } from '../../src/systems/ShopSystem.js';
import { GameState } from '../../src/core/GameState.js';
import type { EquipmentData } from '../../src/data-access/schemas/equipment.schema.js';

const SWORD: EquipmentData = {
  id: 'iron_sword',
  name: '鉄の剣',
  type: 'weapon',
  statBonus: { attack: 10 },
  price: 200,
  description: 'ベーシックな剣',
};

const RING: EquipmentData = {
  id: 'speed_ring',
  name: 'スピードリング',
  type: 'accessory',
  statBonus: { speed: 5 },
  price: 200,
  description: '素早さが上がる',
};

// ──────────────────────────────────────────────────────────
// buyEquipment
// ──────────────────────────────────────────────────────────
describe('buyEquipment', () => {
  it('success — ゴールドを消費して ownedEquipment に追加する', () => {
    const gs = new GameState({ gold: 500 });
    const result = buyEquipment(gs, SWORD);
    expect(result.success).toBe(true);
    expect(gs.get('gold')).toBe(300);
    expect(gs.get('ownedEquipment')).toContain('iron_sword');
  });

  it('fail — ゴールドが不足している場合は失敗する', () => {
    const gs = new GameState({ gold: 100 });
    const result = buyEquipment(gs, SWORD);
    expect(result.success).toBe(false);
    expect(gs.get('gold')).toBe(100); // unchanged
    expect(gs.get('ownedEquipment')).not.toContain('iron_sword');
  });

  it('fail — すでに所持している装備は購入できない', () => {
    const gs = new GameState({ gold: 9999, ownedEquipment: ['iron_sword'] });
    const result = buyEquipment(gs, SWORD);
    expect(result.success).toBe(false);
    expect(gs.get('ownedEquipment').filter((id) => id === 'iron_sword')).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────
// sellEquipment
// ──────────────────────────────────────────────────────────
describe('sellEquipment', () => {
  it('success — 売値を受け取り ownedEquipment から削除する', () => {
    const gs = new GameState({ gold: 0, ownedEquipment: ['speed_ring'] });
    const result = sellEquipment(gs, RING);
    expect(result.success).toBe(true);
    expect(gs.get('gold')).toBe(getSellPrice(RING));
    expect(gs.get('ownedEquipment')).not.toContain('speed_ring');
  });

  it('fail — 所持していない装備は売れない', () => {
    const gs = new GameState({ gold: 0 });
    const result = sellEquipment(gs, RING);
    expect(result.success).toBe(false);
  });

  it('fail — 装備中のアイテムは売れない', () => {
    const gs = new GameState({
      gold: 0,
      ownedEquipment: ['iron_sword'],
      party: [{
        name: '勇者', level: 1, exp: 0, element: 'none',
        currentHp: 150, currentMp: 40,
        baseStats: { maxHp: 150, maxMp: 40, attack: 25, defense: 15, magic: 20, speed: 12, luck: 8 },
        skills: [],
        equipment: { weapon: 'iron_sword', armor: null, accessory: null },
      }],
    });
    const result = sellEquipment(gs, SWORD);
    expect(result.success).toBe(false);
    expect(gs.get('ownedEquipment')).toContain('iron_sword');
  });
});

// ──────────────────────────────────────────────────────────
// getSellPrice
// ──────────────────────────────────────────────────────────
describe('getSellPrice', () => {
  it('定価の 50% (floor) を返す', () => {
    expect(getSellPrice(SWORD)).toBe(Math.floor(SWORD.price * SELL_RATE));
  });
});
