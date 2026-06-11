import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import type { BattleAction } from '../battle/ActionResolver.js';
import { Party } from '../entities/Party.js';
import { Player } from '../entities/Player.js';
import type { PlayerData } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';
import { BattleView } from '../ui/BattleView.js';
import { Logger } from '../ui/Logger.js';
import { Menu } from '../ui/Menu.js';
import { sleep } from '../utils/async.js';

export class BattleScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  async update(): Promise<void> {
    const pending = this.ctx.gameState.get('pendingBattle');
    if (!pending) {
      await this.ctx.sceneManager.transition('field');
      return;
    }

    // Load data
    const [allMonsters, allSkills] = await Promise.all([
      this.ctx.dataLoader.getMonsters(),
      this.ctx.dataLoader.getSkills(),
    ]);
    const monsterMap = new Map(allMonsters.map((m) => [m.id, m]));
    const skillMap = new Map<string, SkillData>(allSkills.map((s) => [s.id, s]));

    // Build combatants
    const partyData = this.ctx.gameState.get('party');
    const party = new Party(partyData.map((d) => Player.fromData(d)));

    const enemies: Monster[] = pending.enemyIds.map((id) => {
      const data = monsterMap.get(id);
      if (!data) throw new Error(`Unknown monster: ${id}`);
      return Monster.fromData(data);
    });

    const engine = new BattleEngine({ party, enemies, skillMap, rng: this.ctx.rng });
    const view = new BattleView(party, enemies);
    const logger = new Logger();

    // Battle loop
    logger.log(chalk.green('戦闘開始！'));
    engine.initTurnQueue();

    while (!engine.isOver) {
      const actor = engine.getCurrentActor();

      if (actor.isKO) {
        engine.advanceTurn();
        if (engine.checkBattleEnd()) break;
        continue;
      }

      // Process status effects at turn start
      const { canAct, logs: statusLogs } = engine.processCurrentActorStatus();
      for (const log of statusLogs) logger.log(log);

      if (!canAct) {
        this.renderAndLog(view, logger);
        await sleep(900);
        engine.advanceTurn();
        if (engine.checkBattleEnd()) break;
        continue;
      }

      let actionLogs: string[];

      if (actor.isPlayer) {
        // Player turn: show battle state then get input
        this.renderAndLog(view, logger);
        console.log(chalk.cyan.bold(`⚔  ${actor.name} のターン`));
        const action = await this.getPlayerAction(actor as Player, engine, skillMap);
        actionLogs = engine.executeAction(actor, action);
        for (const log of actionLogs) logger.log(log);
        this.renderAndLog(view, logger);
        await Menu.input('');
      } else {
        // Enemy turn: auto-decide, show result with brief pause
        this.renderAndLog(view, logger);
        const action = engine.decideEnemyAction(actor as Monster);
        actionLogs = engine.executeAction(actor, action);
        for (const log of actionLogs) logger.log(log);
        this.renderAndLog(view, logger);
        await sleep(900);
      }

      engine.advanceTurn();
      if (engine.checkBattleEnd()) break;
    }

    // Clear pending battle and persist party state
    this.ctx.gameState.set('pendingBattle', null);
    const updatedParty: PlayerData[] = party.members.map((p) => p.toData());
    this.ctx.gameState.set('party', updatedParty);

    this.renderAndLog(view, logger);

    if (engine.victory) {
      await this.handleVictory(engine);
      await this.ctx.sceneManager.transition('field');
    } else {
      console.log(chalk.red.bold('\n💀 全滅…'));
      await Menu.input('');
      await this.ctx.sceneManager.transition('gameover');
    }
  }

  private renderAndLog(view: BattleView, logger: Logger): void {
    process.stdout.write('\x1Bc');
    view.render(logger);
  }

  private async handleVictory(engine: BattleEngine): Promise<void> {
    const { expGained, goldGained } = engine.getBattleRewards();
    console.log(chalk.yellow.bold('🏆 勝利！'));
    console.log(chalk.white(`  EXP + ${expGained}`));
    console.log(chalk.yellow(`  Gold + ${goldGained}`));
    this.ctx.gameState.set('gold', this.ctx.gameState.get('gold') + goldGained);
    await Menu.input('続ける…');
  }

  private async getPlayerAction(
    actor: Player,
    engine: BattleEngine,
    skillMap: Map<string, SkillData>,
  ): Promise<BattleAction> {
    const isSilenced = actor.hasStatus('silence');

    type MainChoice = 'fight' | 'defend';
    const mainChoice = await Menu.select<MainChoice>('コマンド', [
      { value: 'fight', name: '⚔  たたかう' },
      { value: 'defend', name: '🛡  ぼうぎょ' },
    ]);

    if (mainChoice === 'defend') return { type: 'defend' };

    // Skill selection
    const availableSkills = actor.skills
      .map((id) => skillMap.get(id))
      .filter((s): s is SkillData => s !== undefined);

    const skillChoices = availableSkills.map((s) => {
      const notEnoughMp = actor.currentMp < s.mpCost;
      const silenced = isSilenced && s.mpCost > 0;
      const disabled = notEnoughMp ? '(MPが不足)' : silenced ? '(沈黙中)' : false;
      return {
        value: s.id,
        name: `${s.name}  [MP: ${s.mpCost}]`,
        disabled,
      };
    });

    const skillId = await Menu.select<string>('スキルを選べ', skillChoices);
    const skill = skillMap.get(skillId)!;

    // Target selection
    const targets = await this.selectTargets(skill, actor, engine);
    return { type: 'skill', skill, targets };
  }

  private async selectTargets(
    skill: SkillData,
    actor: Player,
    engine: BattleEngine,
  ): Promise<Character[]> {
    if (skill.target === 'self') return [actor];
    if (skill.target === 'all') return engine.aliveEnemies;

    const aliveEnemies = engine.aliveEnemies;
    if (aliveEnemies.length === 1) return aliveEnemies;

    const idx = await Menu.select<string>(
      'ターゲット',
      aliveEnemies.map((e, i) => ({ value: String(i), name: e.name })),
    );
    return [aliveEnemies[parseInt(idx)]];
  }
}
