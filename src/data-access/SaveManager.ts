import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import type { GameState, GameStateSnapshot } from '../core/GameState.js';
import { SaveSchema } from './schemas/save.schema.js';

export class SaveError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = 'SaveError';
  }
}

export class SaveManager {
  private readonly savesDir: string;

  constructor(savesDir?: string) {
    const thisFile = fileURLToPath(import.meta.url);
    this.savesDir = savesDir ?? join(dirname(thisFile), '../../saves');
  }

  private slotPath(slot: number): string {
    return join(this.savesDir, `slot${slot}.json`);
  }

  async hasSave(slot: number): Promise<boolean> {
    try {
      await access(this.slotPath(slot));
      return true;
    } catch {
      return false;
    }
  }

  async save(state: GameState, slot: number): Promise<void> {
    const snapshot = state.snapshot();
    const data = {
      version: 1 as const,
      playtime:       snapshot.playtime,
      gold:           snapshot.gold,
      party:          snapshot.party,
      pendingBattle:  null, // Never save mid-battle
      ownedEquipment: snapshot.ownedEquipment,
      inventory:      snapshot.inventory,
      currentArea:    snapshot.currentArea,
      bossDefeated:   snapshot.bossDefeated,
    };

    // Validate before writing
    SaveSchema.parse(data);

    try {
      await mkdir(this.savesDir, { recursive: true });
      await writeFile(this.slotPath(slot), JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      throw new SaveError(`スロット${slot}への保存に失敗しました`, err);
    }
  }

  async load(slot: number): Promise<GameStateSnapshot> {
    const path = this.slotPath(slot);
    let raw: string;
    try {
      raw = await readFile(path, 'utf-8');
    } catch (err) {
      throw new SaveError(`スロット${slot}のデータが見つかりません`, err);
    }

    let parsed: ReturnType<typeof SaveSchema.parse>;
    try {
      parsed = SaveSchema.parse(JSON.parse(raw) as unknown);
    } catch (err) {
      throw new SaveError(`スロット${slot}のデータが破損しています`, err);
    }

    return {
      currentScene:   'field',
      playtime:       parsed.playtime,
      gold:           parsed.gold,
      party:          parsed.party,
      pendingBattle:  null,
      ownedEquipment: parsed.ownedEquipment,
      inventory:      parsed.inventory,
      currentArea:    parsed.currentArea,
      bossDefeated:   parsed.bossDefeated,
    };
  }
}
