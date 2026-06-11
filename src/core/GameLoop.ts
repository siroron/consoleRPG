import type { SceneManager } from './SceneManager.js';
import type { GameState } from './GameState.js';

function isExitPromptError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'ExitPromptError'
  );
}

export class GameLoop {
  private running = false;
  private lastTick = 0;

  constructor(
    private readonly sceneManager: SceneManager,
    private readonly gameState: GameState,
  ) {}

  async start(): Promise<void> {
    this.running = true;
    this.lastTick = Date.now();
    await this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const now = Date.now();
      const delta = now - this.lastTick;
      this.lastTick = now;
      this.accumulatePlaytime(delta);

      try {
        await this.sceneManager.tick();
      } catch (err) {
        if (isExitPromptError(err)) {
          this.stop();
          return;
        }
        throw err;
      }
    }
  }

  private accumulatePlaytime(deltaMs: number): void {
    const prev = this.gameState.get('playtime');
    this.gameState.set('playtime', prev + deltaMs / 1000);
  }
}
