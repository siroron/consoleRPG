import type { Scene } from '../scenes/Scene.js';
import type { SceneName } from './EventBus.js';

export class SceneManager {
  private currentScene: Scene | null = null;
  private readonly scenes = new Map<SceneName, () => Scene>();

  register(name: SceneName, factory: () => Scene): void {
    this.scenes.set(name, factory);
  }

  async transition(name: SceneName): Promise<void> {
    if (this.currentScene) {
      await this.currentScene.onExit();
    }
    const factory = this.scenes.get(name);
    if (!factory) {
      throw new Error(`Scene not registered: ${name}`);
    }
    this.currentScene = factory();
    await this.currentScene.onEnter();
  }

  getCurrent(): Scene | null {
    return this.currentScene;
  }

  async tick(): Promise<void> {
    if (this.currentScene) {
      await this.currentScene.update();
    }
  }
}
