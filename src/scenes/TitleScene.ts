import chalk from 'chalk';
import boxen from 'boxen';
import { Menu } from '../ui/Menu.js';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Player } from '../entities/Player.js';

type TitleChoice = 'new_game' | 'continue' | 'quit';

export class TitleScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  override onEnter(): void {
    process.stdout.write('\x1Bc');
    this.renderBanner();
  }

  async update(): Promise<void> {
    const hasSave = await this.ctx.saveManager.hasSave(1);

    const choice = await Menu.select<TitleChoice>('Select an option', [
      { value: 'new_game', name: chalk.white('New Game') },
      { value: 'continue', name: 'Continue', disabled: hasSave ? false : '(No save data)' },
      { value: 'quit',     name: chalk.dim('Quit') },
    ]);

    switch (choice) {
      case 'new_game':
        this.ctx.gameState.set('party', [Player.createDefault().toData()]);
        this.ctx.gameState.set('gold', 100);
        this.ctx.gameState.set('ownedEquipment', ['iron_sword', 'leather_mail']);
        this.ctx.gameState.set('currentArea', 'town');
        await this.ctx.sceneManager.transition('field');
        break;
      case 'continue':
        await this.loadAndContinue();
        break;
      case 'quit':
        await this.ctx.eventBus.emit('game:quit', {});
        break;
    }
  }

  private async loadAndContinue(): Promise<void> {
    try {
      const snapshot = await this.ctx.saveManager.load(1);
      this.ctx.gameState.restore(snapshot);
      await this.ctx.sceneManager.transition('field');
    } catch (err) {
      process.stdout.write('\x1Bc');
      this.renderBanner();
      console.log(chalk.red(`  セーブデータの読み込みに失敗しました: ${String(err)}`));
      console.log();
    }
  }

  private renderBanner(): void {
    const title = chalk.bold.yellow('Console Quest');
    const subtitle = chalk.dim('A Terminal RPG Adventure');
    const banner = boxen(`${title}\n${subtitle}`, {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'yellow',
      textAlignment: 'center',
    });
    console.log(banner);
  }
}
