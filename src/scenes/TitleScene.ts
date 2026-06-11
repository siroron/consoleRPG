import chalk from 'chalk';
import boxen from 'boxen';
import { Menu } from '../ui/Menu.js';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';

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
    const hasSave = false; // SaveManager stub always returns false

    const choice = await Menu.select<TitleChoice>('Select an option', [
      { value: 'new_game', name: chalk.white('New Game') },
      { value: 'continue', name: 'Continue', disabled: hasSave ? false : '(No save data)' },
      { value: 'quit',     name: chalk.dim('Quit') },
    ]);

    switch (choice) {
      case 'new_game':
        await this.ctx.sceneManager.transition('field');
        break;
      case 'quit':
        await this.ctx.eventBus.emit('game:quit', {});
        break;
      case 'continue':
        break;
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
