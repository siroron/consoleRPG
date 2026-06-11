import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SaveManager, SaveError } from '../../src/data-access/SaveManager.js';
import { GameState } from '../../src/core/GameState.js';
import { Player } from '../../src/entities/Player.js';

function makeState(overrides: Partial<Parameters<GameState['restore']>[0]> = {}): GameState {
  const state = new GameState();
  const hero = Player.createDefault().toData();
  state.restore({
    currentScene: 'field',
    playtime: 120,
    gold: 500,
    party: [hero],
    pendingBattle: null,
    ownedEquipment: ['iron_sword', 'leather_mail'],
    inventory: [],
    currentArea: 'forest',
    ...overrides,
  });
  return state;
}

describe('SaveManager', () => {
  let tmpDir: string;
  let manager: SaveManager;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'console-rpg-test-'));
    manager = new SaveManager(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('hasSave returns false when no file exists', async () => {
    expect(await manager.hasSave(1)).toBe(false);
  });

  it('hasSave returns true after saving', async () => {
    const state = makeState();
    await manager.save(state, 1);
    expect(await manager.hasSave(1)).toBe(true);
  });

  it('saves and loads gold correctly', async () => {
    const state = makeState({ gold: 999 });
    await manager.save(state, 1);
    const snapshot = await manager.load(1);
    expect(snapshot.gold).toBe(999);
  });

  it('saves and loads currentArea correctly', async () => {
    const state = makeState({ currentArea: 'cave' });
    await manager.save(state, 1);
    const snapshot = await manager.load(1);
    expect(snapshot.currentArea).toBe('cave');
  });

  it('saves and loads party data correctly', async () => {
    const state = makeState();
    await manager.save(state, 1);
    const snapshot = await manager.load(1);
    expect(snapshot.party).toHaveLength(1);
    expect(snapshot.party[0].name).toBe('勇者');
  });

  it('saves and loads ownedEquipment correctly', async () => {
    const state = makeState({ ownedEquipment: ['iron_sword', 'mage_robe'] });
    await manager.save(state, 1);
    const snapshot = await manager.load(1);
    expect(snapshot.ownedEquipment).toEqual(['iron_sword', 'mage_robe']);
  });

  it('clears pendingBattle when saving', async () => {
    const state = makeState({ pendingBattle: { enemyIds: ['slime'] } });
    await manager.save(state, 1);
    const snapshot = await manager.load(1);
    expect(snapshot.pendingBattle).toBeNull();
  });

  it('restores state via GameState.restore()', async () => {
    const original = makeState({ gold: 777, currentArea: 'cave' });
    await manager.save(original, 1);

    const restored = new GameState();
    restored.restore(await manager.load(1));
    expect(restored.get('gold')).toBe(777);
    expect(restored.get('currentArea')).toBe('cave');
  });

  it('throws SaveError when loading non-existent slot', async () => {
    await expect(manager.load(99)).rejects.toThrow(SaveError);
  });

  it('throws SaveError when file is corrupted', async () => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(tmpDir, 'slot1.json'), 'not valid json', 'utf-8');
    await expect(manager.load(1)).rejects.toThrow(SaveError);
  });

  it('throws SaveError when schema validation fails', async () => {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(tmpDir, 'slot1.json'), JSON.stringify({ version: 999 }), 'utf-8');
    await expect(manager.load(1)).rejects.toThrow(SaveError);
  });

  it('saves to independent slots', async () => {
    await manager.save(makeState({ gold: 100 }), 1);
    await manager.save(makeState({ gold: 200 }), 2);
    const s1 = await manager.load(1);
    const s2 = await manager.load(2);
    expect(s1.gold).toBe(100);
    expect(s2.gold).toBe(200);
  });
});
