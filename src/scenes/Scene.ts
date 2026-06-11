import type { SceneManager } from '../core/SceneManager.js';
import type { GameState } from '../core/GameState.js';
import type { EventBus } from '../core/EventBus.js';
import type { RNG } from '../core/RNG.js';
import type { DataLoader } from '../data-access/DataLoader.js';
import type { SaveManager } from '../data-access/SaveManager.js';

export interface SceneContext {
  sceneManager: SceneManager;
  gameState: GameState;
  eventBus: EventBus;
  rng: RNG;
  dataLoader: DataLoader;
  saveManager: SaveManager;
}

export abstract class Scene {
  protected readonly ctx: SceneContext;

  constructor(context: SceneContext) {
    this.ctx = context;
  }

  onEnter(): void | Promise<void> {}
  onExit(): void | Promise<void> {}
  abstract update(): Promise<void>;
}
