import chalk from 'chalk';
import boxen from 'boxen';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Menu } from '../ui/Menu.js';

export class GameOverScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  override onEnter(): void {
    process.stdout.write('\x1Bc');
    const msg = chalk.red.bold('GAME OVER');
    console.log(
      boxen(msg, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'red',
        textAlignment: 'center',
      }),
    );
    console.log(chalk.dim('  パーティは全滅した…'));
    console.log();
  }

  async update(): Promise<void> {
    type Choice = 'title' | 'quit';
    const choice = await Menu.select<Choice>('どうする？', [
      { value: 'title', name: 'タイトルへ戻る' },
      { value: 'quit', name: '終了する' },
    ]);

    if (choice === 'quit') {
      await this.ctx.eventBus.emit('game:quit', {});
    } else {
      // Reset party HP before returning to title
      const party = this.ctx.gameState.get('party');
      const restored = party.map((p) => ({
        ...p,
        currentHp: p.baseStats.maxHp,
        currentMp: p.baseStats.maxMp,
      }));
      this.ctx.gameState.set('party', restored);
      await this.ctx.sceneManager.transition('title');
    }
  }
}
