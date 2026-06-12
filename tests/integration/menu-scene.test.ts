import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GameState } from '../../src/core/GameState.js';
import { SceneManager } from '../../src/core/SceneManager.js';
import { EventBus } from '../../src/core/EventBus.js';
import { RNG } from '../../src/core/RNG.js';
import { DataLoader } from '../../src/data-access/DataLoader.js';
import { SaveManager } from '../../src/data-access/SaveManager.js';
import { FieldScene } from '../../src/scenes/FieldScene.js';
import { MenuScene } from '../../src/scenes/MenuScene.js';
import { Menu } from '../../src/ui/Menu.js';
import type { SceneContext } from '../../src/scenes/Scene.js';

function makeContext(savesDir?: string): { ctx: SceneContext; transitions: string[] } {
  const transitions: string[] = [];
  const gameState = new GameState();
  const sceneManager = new SceneManager();
  const eventBus = new EventBus();
  const rng = new RNG('menu-test-seed');
  const dataLoader = new DataLoader();
  const saveManager = new SaveManager(savesDir);

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

describe('MenuScene', () => {
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
    await new FieldScene(ctx).onEnter();

    queueSelects('back');
    await new MenuScene(ctx).update();

    expect(transitions).toContain('field');
  });

  it('status — ステータスを表示して続行する', async () => {
    const { ctx, transitions } = makeContext();
    await new FieldScene(ctx).onEnter();

    // status → (表示 + input) → back
    queueSelects('status', 'back');
    await new MenuScene(ctx).update();

    expect(transitions).toContain('field');
  });

  it('items — アイテム一覧を表示して続行する', async () => {
    const { ctx, transitions } = makeContext();
    await new FieldScene(ctx).onEnter();
    ctx.gameState.set('inventory', [{ itemId: 'potion', count: 3 }]);

    queueSelects('items', 'back');
    await new MenuScene(ctx).update();

    expect(transitions).toContain('field');
  });

  it('save — ゲームをセーブしてfieldへ遷移する', async () => {
    const tmpDir = path.join(os.tmpdir(), `consoleRPG-menu-test-${Date.now()}`);
    try {
      const { ctx, transitions } = makeContext(tmpDir);
      await new FieldScene(ctx).onEnter();

      queueSelects('save', 'back');
      await new MenuScene(ctx).update();

      expect(transitions).toContain('field');
      // セーブファイルが作成されていることを確認
      const exists = await fs.access(path.join(tmpDir, 'slot1.json')).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('equip — 武器を変更して状態が更新される', async () => {
    const { ctx, transitions } = makeContext();
    await new FieldScene(ctx).onEnter();

    // steel_sword を所持、武器スロットを変更
    ctx.gameState.set('ownedEquipment', ['steel_sword']);

    // equip → weapon スロット選択 → steel_sword 選択 → 確認 → back
    queueSelects('equip', 'weapon', 'steel_sword', 'back');
    await new MenuScene(ctx).update();

    const party = ctx.gameState.get('party');
    expect(party[0].equipment.weapon).toBe('steel_sword');
    expect(transitions).toContain('field');
  });
});
