import type { GameState } from '../core/GameState.js';

export class SaveManager {
  async save(_state: GameState, _slot: number): Promise<void> {
    console.warn('SaveManager: save not yet implemented');
  }

  async load(_slot: number): Promise<void> {
    console.warn('SaveManager: load not yet implemented');
  }

  async hasSave(_slot: number): Promise<boolean> {
    return false;
  }
}
