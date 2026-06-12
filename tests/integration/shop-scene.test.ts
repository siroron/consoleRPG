import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState } from '../../src/core/GameState.js';
import { SceneManager } from '../../src/core/SceneManager.js';
import { EventBus } from '../../src/core/EventBus.js';
import { RNG } from '../../src/core/RNG.js';
import { DataLoader } from '../../src/data-access/DataLoader.js';
import { SaveManager } from '../../src/data-access/SaveManager.js';
import { FieldScene } from '../../src/scenes/FieldScene.js';
import { ShopScene } from '../../src/scenes/ShopScene.js';
import { Menu } from '../../src/ui/Menu.js';
import type { SceneContext } from '../../src/scenes/Scene.js';

function makeContext(): { ctx: SceneContext; transitions: string[] } {
  const transitions: string[] = [];
  const gameState = new GameState();
  const sceneManager = new SceneManager();
  const eventBus = new EventBus();
  const rng = new RNG('shop-test-seed');
  const dataLoader = new DataLoader();
  const saveManager = new SaveManager();

  vi.spyOn(sceneManager, 'transition').mockImplementation(async (name) => {
    transitions.push(name);
  });

  const ctx: SceneContext = { sceneManager, gameState, eventBus, rng, dataLoader, saveManager };
  return { ctx, transitions };
}

function queueSelects(...answers: string[]): void {
  const queue = [...answers];
  vi.spyOn(Menu, 'select').mockImplementation(async () => {
    const answer = queue.shift();
    if (answer === undefined) throw new Error('Unexpected Menu.select call: queue exhausted');
    return answer as never;
  });
}

describe('ShopScene', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(Menu, 'input').mockResolvedValue('');
    vi.spyOn(Menu, 'confirm').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('back — field シーンへ遷移する', async () => {
    const { ctx, transitions } = makeContext();

    queueSelects('back');
    await new ShopScene(ctx).update();

    expect(transitions).toContain('field');
  });

  it('buy_item — アイテムを購入しゴールドが減り、インベントリに追加される', async () => {
    const { ctx, transitions } = makeContext();
    ctx.gameState.set('gold', 1000);

    // buy_item → potion 選択 → 確認 → back
    queueSelects('buy_item', 'potion', 'back');

    const goldBefore = ctx.gameState.get('gold');
    await new ShopScene(ctx).update();

    expect(ctx.gameState.get('gold')).toBeLessThan(goldBefore);
    expect(ctx.gameState.get('inventory').find((e) => e.itemId === 'potion')).toBeDefined();
    expect(transitions).toContain('field');
  });

  it('buy_equip — 装備を購入しゴールドが減り、ownedEquipment に追加される', async () => {
    const { ctx, transitions } = makeContext();
    ctx.gameState.set('gold', 1000);
    // ownedEquipment は空（デフォルト）なので steel_sword は購入可能

    // buy_equip → steel_sword 選択 → 確認 → back
    queueSelects('buy_equip', 'steel_sword', 'back');

    const goldBefore = ctx.gameState.get('gold');
    await new ShopScene(ctx).update();

    expect(ctx.gameState.get('gold')).toBeLessThan(goldBefore);
    expect(ctx.gameState.get('ownedEquipment')).toContain('steel_sword');
    expect(transitions).toContain('field');
  });

  it('sell — 装備を売却しゴールドが増え、ownedEquipment から削除される', async () => {
    const { ctx, transitions } = makeContext();
    ctx.gameState.set('gold', 0);
    ctx.gameState.set('ownedEquipment', ['speed_ring']);
    // パーティにスピードリングを装備していない状態を作る
    await new FieldScene(ctx).onEnter();

    // sell → speed_ring 選択 → 確認 → back
    queueSelects('sell', 'speed_ring', 'back');

    const goldBefore = ctx.gameState.get('gold');
    await new ShopScene(ctx).update();

    expect(ctx.gameState.get('gold')).toBeGreaterThan(goldBefore);
    expect(ctx.gameState.get('ownedEquipment')).not.toContain('speed_ring');
    expect(transitions).toContain('field');
  });

  it('buy_item — ゴールド不足の場合は購入できない', async () => {
    const { ctx } = makeContext();
    ctx.gameState.set('gold', 0); // 全アイテム購入不可

    // buy_item → cancel （すべて disabled なのでキャンセルを選択）→ back
    queueSelects('buy_item', 'cancel', 'back');

    await new ShopScene(ctx).update();

    expect(ctx.gameState.get('inventory')).toHaveLength(0);
  });
});
