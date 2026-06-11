import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import type { BattleAction } from '../battle/ActionResolver.js';
import { applyEquipmentBonuses } from '../systems/EquipmentSystem.js';
import { getExpForLevel, getStatGrowthForLevel, getExpToNextLevel } from '../systems/LevelSystem.js';
import { getSkillsLearnedAtLevel } from '../systems/SkillTree.js';
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

    const [allMonsters, allSkills, allEquipments] = await Promise.all([
      this.ctx.dataLoader.getMonsters(),
      this.ctx.dataLoader.getSkills(),
      this.ctx.dataLoader.getEquipments(),
    ]);
    const monsterMap = new Map(allMonsters.map((m) => [m.id, m]));
    const skillMap = new Map<string, SkillData>(allSkills.map((s) => [s.id, s]));
    const equipmentMap = new Map(allEquipments.map((e) => [e.id, e]));

    // Build party with equipment bonuses applied
    const partyData = this.ctx.gameState.get('party');
    const players = partyData.map((d) => {
      const p = Player.fromData(d);
      applyEquipmentBonuses(p, equipmentMap);
      return p;
    });
    const party = new Party(players);

    const enemies: Monster[] = pending.enemyIds.map((id) => {
      const data = monsterMap.get(id);
      if (!data) throw new Error(`Unknown monster: ${id}`);
      return Monster.fromData(data);
    });

    const engine = new BattleEngine({ party, enemies, skillMap, rng: this.ctx.rng });
    const view = new BattleView(party, enemies);
    const logger = new Logger();

    logger.log(chalk.green('戦闘開始！'));
    for (const e of enemies) logger.log(chalk.dim(`  ${e.name} が現れた！`));
    engine.initTurnQueue();

    while (!engine.isOver) {
      const actor = engine.getCurrentActor();

      if (actor.isKO) {
        engine.advanceTurn();
        if (engine.checkBattleEnd()) break;
        continue;
      }

      const { canAct, logs: statusLogs } = engine.processCurrentActorStatus();
      for (const log of statusLogs) logger.log(log);

      if (!canAct) {
        this.renderScreen(view, logger);
        await sleep(900);
        engine.advanceTurn();
        if (engine.checkBattleEnd()) break;
        continue;
      }

      let actionLogs: string[];

      if (actor.isPlayer) {
        this.renderScreen(view, logger);
        console.log(chalk.cyan.bold(`⚔  ${actor.name} のターン`));
        const action = await this.getPlayerAction(actor as Player, engine, skillMap);
        actionLogs = engine.executeAction(actor, action);
        for (const log of actionLogs) logger.log(log);
        this.renderScreen(view, logger);
        await Menu.input('');
      } else {
        this.renderScreen(view, logger);
        const action = engine.decideEnemyAction(actor as Monster);
        actionLogs = engine.executeAction(actor, action);
        for (const log of actionLogs) logger.log(log);
        this.renderScreen(view, logger);
        await sleep(900);
      }

      engine.advanceTurn();
      if (engine.checkBattleEnd()) break;
    }

    this.ctx.gameState.set('pendingBattle', null);

    this.renderScreen(view, logger);

    if (engine.victory) {
      await this.handleVictory(engine, skillMap, party);
      const updatedParty: PlayerData[] = party.members.map((p) => p.toData());
      this.ctx.gameState.set('party', updatedParty);
      await this.ctx.sceneManager.transition('field');
    } else {
      console.log(chalk.red.bold('\n💀 全滅…'));
      await Menu.input('');
      const updatedParty: PlayerData[] = party.members.map((p) => p.toData());
      this.ctx.gameState.set('party', updatedParty);
      await this.ctx.sceneManager.transition('gameover');
    }
  }

  private renderScreen(view: BattleView, logger: Logger): void {
    process.stdout.write('\x1Bc');
    view.render(logger);
  }

  private async handleVictory(
    engine: BattleEngine,
    skillMap: Map<string, SkillData>,
    party: Party,
  ): Promise<void> {
    const { expGained, goldGained } = engine.getBattleRewards();
    console.log(chalk.yellow.bold('🏆 勝利！'));
    console.log(chalk.white(`  EXP + ${expGained}`));
    console.log(chalk.yellow(`  Gold + ${goldGained}`));
    this.ctx.gameState.set('gold', this.ctx.gameState.get('gold') + goldGained);

    // Apply EXP and process level-ups for each alive member
    for (const player of party.members) {
      player.exp += expGained;
      while (player.exp >= getExpForLevel(player.level + 1)) {
        const growth = getStatGrowthForLevel(player.level + 1);
        player.levelUp(growth);
        console.log(chalk.green.bold(`\n  ⬆ レベルアップ！${player.name} は Lv.${player.level} になった！`));
        const g = growth;
        console.log(chalk.dim(`     HP+${g.maxHp ?? 0} MP+${g.maxMp ?? 0} ATK+${g.attack ?? 0} DEF+${g.defense ?? 0} MAG+${g.magic ?? 0}`));

        // Learn new skills
        for (const skillId of getSkillsLearnedAtLevel(player.level)) {
          if (!player.skills.includes(skillId)) {
            player.skills.push(skillId);
            const skill = skillMap.get(skillId);
            if (skill) console.log(chalk.cyan(`     ✨ ${skill.name} を習得した！`));
          }
        }
      }
      const toNext = getExpToNextLevel(player.level);
      const current = player.exp - getExpForLevel(player.level);
      console.log(chalk.dim(`  ${player.name} EXP: ${current}/${toNext}`));
    }

    await Menu.input('\n続ける…');
  }

  private async getPlayerAction(
    actor: Player,
    engine: BattleEngine,
    skillMap: Map<string, SkillData>,
  ): Promise<BattleAction> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const isSilenced = actor.hasStatus('silence');

      type MainChoice = 'fight' | 'defend';
      const main = await Menu.select<MainChoice>('コマンド', [
        { value: 'fight',  name: '⚔  たたかう' },
        { value: 'defend', name: '🛡  ぼうぎょ' },
      ]);
      if (main === 'defend') return { type: 'defend' };

      const availableSkills = actor.skills
        .map((id) => skillMap.get(id))
        .filter((s): s is SkillData => s !== undefined);

      const skillChoices: { value: string; name: string; disabled?: string | false }[] = [
        ...availableSkills.map((s) => {
          const noMp     = actor.currentMp < s.mpCost;
          const silenced = isSilenced && s.mpCost > 0;
          return {
            value: s.id,
            name: `${s.name}  [MP: ${s.mpCost}]`,
            disabled: (noMp ? '(MPが不足)' : silenced ? '(沈黙中)' : false) as string | false,
          };
        }),
        { value: '__back__', name: chalk.dim('↩  もどる') },
      ];

      const skillId = await Menu.select<string>('スキル', skillChoices);
      if (skillId === '__back__') continue;

      const skill = skillMap.get(skillId)!;
      const targets = await this.selectTargets(skill, actor, engine);
      return { type: 'skill', skill, targets };
    }
  }

  private async selectTargets(
    skill: SkillData,
    actor: Player,
    engine: BattleEngine,
  ): Promise<Character[]> {
    if (skill.target === 'self') return [actor];
    if (skill.target === 'all') return engine.aliveEnemies;

    const alive = engine.aliveEnemies;
    if (alive.length === 1) return alive;

    const idx = await Menu.select<string>(
      'ターゲット',
      alive.map((e, i) => ({ value: String(i), name: e.name })),
    );
    return [alive[parseInt(idx)]];
  }
}
