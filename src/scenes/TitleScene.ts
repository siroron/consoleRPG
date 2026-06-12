import chalk from 'chalk';
import boxen from 'boxen';
import { Menu } from '../ui/Menu.js';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Player } from '../entities/Player.js';

type TitleChoice = 'new_game' | 'continue' | 'delete_save' | 'quit';

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
      { value: 'new_game',    name: chalk.white('New Game') },
      { value: 'continue',   name: 'Continue',              disabled: hasSave ? false : '(No save data)' },
      { value: 'delete_save', name: chalk.red('セーブデータを削除'), disabled: hasSave ? false : '(セーブなし)' },
      { value: 'quit',       name: chalk.dim('Quit') },
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
      case 'delete_save':
        await this.handleDeleteSave();
        break;
      case 'quit':
        await this.ctx.eventBus.emit('game:quit', {});
        break;
    }
  }

  private async handleDeleteSave(): Promise<void> {
    process.stdout.write('\x1Bc');
    this.renderBanner();
    console.log(chalk.red.bold('  ⚠  セーブデータを削除すると元に戻せません。'));
    console.log();
    const confirmed = await Menu.confirm('本当に削除しますか？', false);
    if (!confirmed) return;

    try {
      await this.ctx.saveManager.delete(1);
      process.stdout.write('\x1Bc');
      this.renderBanner();
      console.log(chalk.green('  セーブデータを削除しました。'));
      console.log();
    } catch (err) {
      process.stdout.write('\x1Bc');
      this.renderBanner();
      console.log(chalk.red(`  削除に失敗しました: ${String(err)}`));
      console.log();
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
