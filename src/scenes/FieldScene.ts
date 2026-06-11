import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Player } from '../entities/Player.js';
import { Menu } from '../ui/Menu.js';
import { renderHpBar, renderMpBar } from '../ui/StatusBar.js';
import { formatPlaytime } from '../utils/format.js';

type FieldChoice = 'explore' | 'rest' | 'status' | 'title';

export class FieldScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  override async onEnter(): Promise<void> {
    // Create default hero if starting a new game
    if (this.ctx.gameState.get('party').length === 0) {
      this.ctx.gameState.set('party', [Player.createDefault().toData()]);
    }
    this.renderField();
  }

  async update(): Promise<void> {
    const choice = await Menu.select<FieldChoice>('何をする？', [
      { value: 'explore', name: '【探索】森を進む' },
      { value: 'rest',    name: '【休憩】野営する（HP/MP全回復）' },
      { value: 'status',  name: '【状態】パーティを確認' },
      { value: 'title',   name: '【タイトルへ戻る】' },
    ]);

    switch (choice) {
      case 'explore':
        await this.triggerEncounter();
        break;
      case 'rest':
        this.restParty();
        this.renderField();
        break;
      case 'status':
        this.showStatus();
        break;
      case 'title':
        await this.ctx.sceneManager.transition('title');
        break;
    }
  }

  private renderField(): void {
    process.stdout.write('\x1Bc');
    console.log(chalk.green.bold('=== フィールド ==='));
    console.log(chalk.dim('深い森が広がっている…'));
    console.log();
    const gold = this.ctx.gameState.get('gold');
    const playtime = this.ctx.gameState.get('playtime');
    console.log(chalk.yellow(`  Gold: ${gold}G`) + chalk.dim(`  Time: ${formatPlaytime(playtime)}`));
    console.log();
  }

  private showStatus(): void {
    process.stdout.write('\x1Bc');
    console.log(chalk.bold('=== パーティ状態 ==='));
    console.log();

    const partyData = this.ctx.gameState.get('party');
    for (const data of partyData) {
      console.log(`  ${chalk.bold(data.name)} Lv.${data.level}  EXP: ${data.exp}`);
      console.log(`  ${renderHpBar(data.name, data.currentHp, data.baseStats.maxHp)}`);
      console.log(`  ${renderMpBar(data.currentMp, data.baseStats.maxMp)}`);
      console.log();
    }
  }

  private restParty(): void {
    const party = this.ctx.gameState.get('party');
    const rested = party.map((p) => ({
      ...p,
      currentHp: p.baseStats.maxHp,
      currentMp: p.baseStats.maxMp,
    }));
    this.ctx.gameState.set('party', rested);
    process.stdout.write('\x1Bc');
    this.renderField();
    console.log(chalk.green('  ゆっくり休んだ。HP/MPが全回復した！'));
    console.log();
  }

  private async triggerEncounter(): Promise<void> {
    const monsters = await this.ctx.dataLoader.getMonsters();
    if (monsters.length === 0) return;

    // Pick 1–2 random monsters
    const count = this.ctx.rng.nextInt(1, 2);
    const enemyIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = this.ctx.rng.nextInt(0, monsters.length - 1);
      enemyIds.push(monsters[idx].id);
    }

    this.ctx.gameState.set('pendingBattle', { enemyIds });
    await this.ctx.sceneManager.transition('battle');
  }
}
