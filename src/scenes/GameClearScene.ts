import chalk from 'chalk';
import boxen from 'boxen';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Menu } from '../ui/Menu.js';
import { formatPlaytime } from '../utils/format.js';

export class GameClearScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  override onEnter(): void {
    process.stdout.write('\x1Bc');

    const playtime = this.ctx.gameState.get('playtime');
    const gold     = this.ctx.gameState.get('gold');
    const party    = this.ctx.gameState.get('party');
    const lv       = party[0]?.level ?? 1;

    const msg = [
      chalk.bold.yellow('✨  GAME CLEAR  ✨'),
      '',
      chalk.white('深淵の覇者を打ち倒し、'),
      chalk.white('世界に平和が訪れた！'),
      '',
      chalk.dim(`プレイ時間: ${formatPlaytime(playtime)}`),
      chalk.dim(`最終Lv: ${lv}  所持Gold: ${gold}G`),
    ].join('\n');

    console.log(
      boxen(msg, {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
        textAlignment: 'center',
      }),
    );
  }

  async update(): Promise<void> {
    type Choice = 'title' | 'quit';
    const choice = await Menu.select<Choice>('', [
      { value: 'title', name: 'タイトルへ戻る' },
      { value: 'quit',  name: '終了する' },
    ]);

    if (choice === 'quit') {
      await this.ctx.eventBus.emit('game:quit', {});
    } else {
      await this.ctx.sceneManager.transition('title');
    }
  }
}
