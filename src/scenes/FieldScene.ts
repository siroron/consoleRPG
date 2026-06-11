import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import type { AreaId } from '../core/GameState.js';
import { Player } from '../entities/Player.js';
import { Menu } from '../ui/Menu.js';
import { renderHpBar, renderMpBar } from '../ui/StatusBar.js';
import { formatPlaytime } from '../utils/format.js';
import { canEncounter, getEncounterEnemyIds } from '../systems/EncounterSystem.js';

const AREA_LABELS: Record<AreaId, string> = {
  town:   '街',
  forest: '森',
  cave:   '洞窟',
};

const AREA_FLAVOR: Record<AreaId, string> = {
  town:   '平和な街。商人が行き交っている。',
  forest: '深い森が広がっている…モンスターが潜む。',
  cave:   '薄暗い洞窟。危険な気配が漂う。',
};

const TRAVEL_DESTINATIONS: Record<AreaId, AreaId[]> = {
  town:   ['forest'],
  forest: ['town', 'cave'],
  cave:   ['forest'],
};

export class FieldScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  override async onEnter(): Promise<void> {
    if (this.ctx.gameState.get('party').length === 0) {
      this.ctx.gameState.set('party', [Player.createDefault().toData()]);
    }
    this.renderField();
  }

  async update(): Promise<void> {
    const area = this.ctx.gameState.get('currentArea');
    const inTown = area === 'town';
    const hasEncounters = canEncounter(area);

    type FieldChoice = 'explore' | 'rest' | 'travel' | 'shop' | 'menu' | 'title';
    const choices: { value: FieldChoice; name: string; disabled?: string | false }[] = [
      {
        value: 'explore',
        name: `【探索】${AREA_LABELS[area]}を進む`,
        disabled: hasEncounters ? false : '(ここでは戦えない)',
      },
      { value: 'rest',   name: '【休憩】野営する（HP/MP全回復）' },
      { value: 'travel', name: '【移動】別のエリアへ' },
      {
        value: 'shop',
        name: '【ショップ】道具屋',
        disabled: inTown ? false : '(街にしかない)',
      },
      { value: 'menu',  name: '【メニュー】装備・ステータス' },
      { value: 'title', name: '【タイトルへ戻る】' },
    ];

    const choice = await Menu.select<FieldChoice>('何をする？', choices);

    switch (choice) {
      case 'explore':
        await this.triggerEncounter();
        break;
      case 'rest':
        this.restParty();
        break;
      case 'travel':
        await this.handleTravel();
        break;
      case 'shop':
        await this.ctx.sceneManager.transition('shop');
        break;
      case 'menu':
        await this.ctx.sceneManager.transition('menu');
        break;
      case 'title':
        await this.ctx.sceneManager.transition('title');
        break;
    }
  }

  private renderField(): void {
    process.stdout.write('\x1Bc');
    const area = this.ctx.gameState.get('currentArea');
    console.log(chalk.green.bold(`=== フィールド [${AREA_LABELS[area]}] ===`));
    console.log(chalk.dim(`  ${AREA_FLAVOR[area]}`));
    console.log();
    const gold = this.ctx.gameState.get('gold');
    const playtime = this.ctx.gameState.get('playtime');
    console.log(chalk.yellow(`  Gold: ${gold}G`) + chalk.dim(`  Time: ${formatPlaytime(playtime)}`));
    console.log();

    const partyData = this.ctx.gameState.get('party');
    for (const p of partyData) {
      const hpLine = renderHpBar(p.name, p.currentHp, p.baseStats.maxHp, 8);
      const mpLine = renderMpBar(p.currentMp, p.baseStats.maxMp, 6);
      const lvStr  = chalk.dim(`Lv.${p.level}`);
      const koStr  = p.currentHp <= 0 ? chalk.red(' [戦闘不能]') : '';
      console.log(`  ${lvStr} ${hpLine}  ${mpLine}${koStr}`);
    }
    console.log();
  }

  private restParty(): void {
    const party = this.ctx.gameState.get('party');
    const rested = party.map((p) => ({
      ...p,
      currentHp: p.baseStats.maxHp,
      currentMp: p.baseStats.maxMp,
    }));
    this.ctx.gameState.set('party', rested);
    this.renderField();
    console.log(chalk.green('  ゆっくり休んだ。HP/MPが全回復した！'));
    console.log();
  }

  private async handleTravel(): Promise<void> {
    const area = this.ctx.gameState.get('currentArea');
    const destinations = TRAVEL_DESTINATIONS[area];

    const dest = await Menu.select<AreaId>('どこへ移動する？', [
      ...destinations.map((d) => ({ value: d, name: AREA_LABELS[d] })),
      { value: area, name: 'キャンセル' },
    ]);

    if (dest !== area) {
      this.ctx.gameState.set('currentArea', dest);
      this.renderField();
      console.log(chalk.cyan(`  ${AREA_LABELS[dest]}に到着した。`));
      console.log();
    } else {
      this.renderField();
    }
  }

  private async triggerEncounter(): Promise<void> {
    const area = this.ctx.gameState.get('currentArea');
    const enemyIds = getEncounterEnemyIds(area, this.ctx.rng);
    if (enemyIds.length === 0) return;

    this.ctx.gameState.set('pendingBattle', { enemyIds });
    await this.ctx.sceneManager.transition('battle');
  }
}
