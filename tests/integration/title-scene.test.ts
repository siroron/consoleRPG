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
import { TitleScene } from '../../src/scenes/TitleScene.js';
import { Menu } from '../../src/ui/Menu.js';
import type { SceneContext } from '../../src/scenes/Scene.js';

function makeContext(savesDir?: string): { ctx: SceneContext; transitions: string[] } {
  const transitions: string[] = [];
  const gameState = new GameState();
  const sceneManager = new SceneManager();
  const eventBus = new EventBus();
  const rng = new RNG('title-test');
  const dataLoader = new DataLoader();
  const saveManager = new SaveManager(savesDir);

  vi.spyOn(sceneManager, 'transition').mockImplementation(async (name) => {
    transitions.push(name);
  });

  const ctx: SceneContext = { sceneManager, gameState, eventBus, rng, dataLoader, saveManager };
  return { ctx, transitions };
}

describe('TitleScene', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(Menu, 'input').mockResolvedValue('');
    vi.spyOn(Menu, 'confirm').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('new_game — パーティと初期所持金をセットして field へ遷移する', async () => {
    const { ctx, transitions } = makeContext();
    vi.spyOn(Menu, 'select').mockResolvedValue('new_game' as never);

    await new TitleScene(ctx).update();

    expect(transitions).toContain('field');
    expect(ctx.gameState.get('party')).toHaveLength(1);
    expect(ctx.gameState.get('gold')).toBe(100);
    expect(ctx.gameState.get('ownedEquipment')).toContain('iron_sword');
  });

  it('continue — セーブデータを読み込んで field へ遷移する', async () => {
    const tmpDir = path.join(os.tmpdir(), `consoleRPG-title-test-${Date.now()}`);
    try {
      const { ctx, transitions } = makeContext(tmpDir);

      // セーブデータを事前に作成
      const saveState = new GameState({ gold: 777, currentArea: 'forest' });
      await ctx.saveManager.save(saveState, 1);

      vi.spyOn(Menu, 'select').mockResolvedValue('continue' as never);

      await new TitleScene(ctx).update();

      expect(transitions).toContain('field');
      expect(ctx.gameState.get('gold')).toBe(777);
      expect(ctx.gameState.get('currentArea')).toBe('forest');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('delete_save — 確認後にセーブデータを削除する', async () => {
    const tmpDir = path.join(os.tmpdir(), `consoleRPG-title-test-${Date.now()}`);
    try {
      const { ctx } = makeContext(tmpDir);

      // セーブデータを事前に作成
      await ctx.saveManager.save(new GameState(), 1);
      expect(await ctx.saveManager.hasSave(1)).toBe(true);

      vi.spyOn(Menu, 'select').mockResolvedValue('delete_save' as never);
      vi.spyOn(Menu, 'confirm').mockResolvedValue(true); // 削除を確認

      await new TitleScene(ctx).update();

      expect(await ctx.saveManager.hasSave(1)).toBe(false);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('delete_save — キャンセルした場合はセーブデータが残る', async () => {
    const tmpDir = path.join(os.tmpdir(), `consoleRPG-title-test-${Date.now()}`);
    try {
      const { ctx } = makeContext(tmpDir);

      await ctx.saveManager.save(new GameState(), 1);

      vi.spyOn(Menu, 'select').mockResolvedValue('delete_save' as never);
      vi.spyOn(Menu, 'confirm').mockResolvedValue(false); // キャンセル

      await new TitleScene(ctx).update();

      expect(await ctx.saveManager.hasSave(1)).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('quit — game:quit イベントを発火する', async () => {
    const { ctx } = makeContext();
    const emitSpy = vi.spyOn(ctx.eventBus, 'emit');
    vi.spyOn(Menu, 'select').mockResolvedValue('quit' as never);

    await new TitleScene(ctx).update();

    expect(emitSpy).toHaveBeenCalledWith('game:quit', {});
  });
});
