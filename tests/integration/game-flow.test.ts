import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// sleep をノーオペレーションに置き換え（テスト高速化）
vi.mock('../../src/utils/async.js', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

import { GameState } from '../../src/core/GameState.js';
import { SceneManager } from '../../src/core/SceneManager.js';
import { EventBus } from '../../src/core/EventBus.js';
import { RNG } from '../../src/core/RNG.js';
import { DataLoader } from '../../src/data-access/DataLoader.js';
import { SaveManager } from '../../src/data-access/SaveManager.js';
import { FieldScene } from '../../src/scenes/FieldScene.js';
import { BattleScene } from '../../src/scenes/BattleScene.js';
import { Menu } from '../../src/ui/Menu.js';
import type { SceneContext } from '../../src/scenes/Scene.js';
import type { MonsterData } from '../../src/data-access/schemas/monster.schema.js';

// 1 ヒットで確実に倒せる弱い敵
const WEAK_MONSTER: MonsterData = {
  id: 'test_weak',
  name: 'テストモンスター',
  element: 'none',
  stats: { maxHp: 1, maxMp: 0, attack: 1, defense: 0, magic: 0, speed: 1, luck: 0 },
  skills: ['tackle'],
  aiType: 'aggressive',
  exp: 10,
  gold: 5,
  drops: [],
};

// 先攻で確実に 1 ヒット即死させる強敵
const STRONG_MONSTER: MonsterData = {
  id: 'test_strong',
  name: '強敵',
  element: 'none',
  stats: { maxHp: 9999, maxMp: 0, attack: 9999, defense: 0, magic: 0, speed: 999, luck: 0 },
  skills: ['tackle'],
  aiType: 'aggressive',
  exp: 0,
  gold: 0,
  drops: [],
};

// テスト用コンテキストを生成。sceneManager.transition をスパイして遷移先を記録する
function makeContext(): { ctx: SceneContext; transitions: string[] } {
  const transitions: string[] = [];
  const gameState = new GameState();
  const sceneManager = new SceneManager();
  const eventBus = new EventBus();
  const rng = new RNG('test-integration-seed');
  const dataLoader = new DataLoader();
  const saveManager = new SaveManager();

  vi.spyOn(sceneManager, 'transition').mockImplementation(async (name) => {
    transitions.push(name);
  });

  const ctx: SceneContext = { sceneManager, gameState, eventBus, rng, dataLoader, saveManager };
  return { ctx, transitions };
}

// Menu.select の回答をキューとして返すスパイを設定する
function queueSelects(...answers: string[]): void {
  const queue = [...answers];
  vi.spyOn(Menu, 'select').mockImplementation(async () => {
    const answer = queue.shift();
    if (answer === undefined) throw new Error('Unexpected Menu.select call: queue exhausted');
    return answer as never;
  });
}

// ──────────────────────────────────────────────────────────
// FieldScene
// ──────────────────────────────────────────────────────────
describe('FieldScene', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(Menu, 'input').mockResolvedValue('');
    vi.spyOn(Menu, 'confirm').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rest — HP/MP を最大値まで回復する', async () => {
    const { ctx } = makeContext();
    const scene = new FieldScene(ctx);
    await scene.onEnter(); // デフォルトパーティを生成

    const party = ctx.gameState.get('party');
    ctx.gameState.set('party', party.map((p) => ({ ...p, currentHp: 1, currentMp: 0 })));

    queueSelects('rest');
    await scene.update();

    const restored = ctx.gameState.get('party');
    expect(restored[0].currentHp).toBe(restored[0].baseStats.maxHp);
    expect(restored[0].currentMp).toBe(restored[0].baseStats.maxMp);
  });

  it('travel — 別のエリアに移動する', async () => {
    const { ctx } = makeContext();
    expect(ctx.gameState.get('currentArea')).toBe('town');

    const scene = new FieldScene(ctx);
    await scene.onEnter();

    queueSelects('travel', 'forest');
    await scene.update();

    expect(ctx.gameState.get('currentArea')).toBe('forest');
  });

  it('explore — pendingBattle をセットして battle シーンへ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    ctx.gameState.set('currentArea', 'forest'); // 森はエンカウントあり

    const scene = new FieldScene(ctx);
    await scene.onEnter();

    queueSelects('explore');
    await scene.update();

    expect(ctx.gameState.get('pendingBattle')).not.toBeNull();
    expect(transitions).toContain('battle');
  });

  it('menu — menu シーンへ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    const scene = new FieldScene(ctx);
    await scene.onEnter();

    queueSelects('menu');
    await scene.update();

    expect(transitions).toContain('menu');
  });

  it('title — title シーンへ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    const scene = new FieldScene(ctx);
    await scene.onEnter();

    queueSelects('title');
    await scene.update();

    expect(transitions).toContain('title');
  });
});

// ──────────────────────────────────────────────────────────
// BattleScene
// ──────────────────────────────────────────────────────────
describe('BattleScene', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(Menu, 'input').mockResolvedValue('');
    vi.spyOn(Menu, 'confirm').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pendingBattle が null の場合 — field シーンへ即遷移する', async () => {
    const { ctx, transitions } = makeContext();

    const scene = new BattleScene(ctx);
    await scene.update();

    expect(transitions).toContain('field');
  });

  it('victory — 弱い敵を倒して field へ遷移し、ゴールドを獲得する', async () => {
    const { ctx, transitions } = makeContext();
    vi.spyOn(ctx.dataLoader, 'getMonsters').mockResolvedValue([WEAK_MONSTER]);
    ctx.gameState.set('pendingBattle', { enemyIds: ['test_weak'] });

    // パーティを生成してから戦闘へ
    await new FieldScene(ctx).onEnter();

    // プレイヤーターン: たたかう → たいあたり（敵 1 体なので自動ターゲット）
    queueSelects('fight', 'tackle');

    const goldBefore = ctx.gameState.get('gold');
    const scene = new BattleScene(ctx);
    await scene.update();

    expect(ctx.gameState.get('pendingBattle')).toBeNull();
    expect(transitions).toContain('field');
    expect(ctx.gameState.get('gold')).toBeGreaterThan(goldBefore);
  });

  it('defeat — 強敵に倒されて gameover へ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    vi.spyOn(ctx.dataLoader, 'getMonsters').mockResolvedValue([STRONG_MONSTER]);
    ctx.gameState.set('pendingBattle', { enemyIds: ['test_strong'] });

    // HP 1 のパーティ（スピード 999 の強敵が先攻して即死）
    ctx.gameState.set('party', [{
      name: '勇者',
      level: 1,
      exp: 0,
      element: 'none',
      currentHp: 1,
      currentMp: 40,
      baseStats: { maxHp: 150, maxMp: 40, attack: 25, defense: 15, magic: 20, speed: 12, luck: 8 },
      skills: ['tackle'],
      equipment: { weapon: null, armor: null, accessory: null },
    }]);

    // 敵が先攻で倒すため Menu.select は呼ばれない
    queueSelects();

    const scene = new BattleScene(ctx);
    await scene.update();

    expect(transitions).toContain('gameover');
  });

  it('boss victory in cave — bossDefeated フラグを立てて gameclear へ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    const WEAK_BOSS = { ...WEAK_MONSTER, id: 'test_boss' };
    vi.spyOn(ctx.dataLoader, 'getMonsters').mockResolvedValue([WEAK_BOSS]);
    ctx.gameState.set('currentArea', 'cave');
    ctx.gameState.set('pendingBattle', { enemyIds: ['test_boss'], isBoss: true });

    await new FieldScene(ctx).onEnter();

    queueSelects('fight', 'tackle');

    const scene = new BattleScene(ctx);
    await scene.update();

    expect(transitions).toContain('gameclear');
    expect(ctx.gameState.get('bossDefeated').cave).toBe(true);
  });
});
