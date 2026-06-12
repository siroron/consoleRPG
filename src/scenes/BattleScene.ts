import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { BattleEngine } from '../battle/BattleEngine.js';
import type { BattleAction } from '../battle/ActionResolver.js';
import { applyEquipmentBonuses } from '../systems/EquipmentSystem.js';
import { getExpForLevel, getStatGrowthForLevel, getExpToNextLevel } from '../systems/LevelSystem.js';
import { getSkillsLearnedAtLevel } from '../systems/SkillTree.js';
import { addItem, removeItem, applyItemEffect } from '../systems/InventorySystem.js';
import { Party } from '../entities/Party.js';
import { Player } from '../entities/Player.js';
import { Monster } from '../entities/Monster.js';
import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';
import type { ItemData } from '../data-access/schemas/item.schema.js';
import { BattleView } from '../ui/BattleView.js';
import { Logger } from '../ui/Logger.js';
import { Menu } from '../ui/Menu.js';
import { sleep } from '../utils/async.js';

type ItemAction = { type: 'item'; item: ItemData; target: Player };
type PlayerTurnResult = BattleAction | ItemAction;

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

    const [allMonsters, allSkills, allEquipments, allItems] = await Promise.all([
      this.ctx.dataLoader.getMonsters(),
      this.ctx.dataLoader.getSkills(),
      this.ctx.dataLoader.getEquipments(),
      this.ctx.dataLoader.getItems(),
    ]);
    const monsterMap   = new Map(allMonsters.map((m) => [m.id, m]));
    const skillMap     = new Map<string, SkillData>(allSkills.map((s) => [s.id, s]));
    const equipmentMap = new Map(allEquipments.map((e) => [e.id, e]));
    const itemMap      = new Map<string, ItemData>(allItems.map((i) => [i.id, i]));

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
    const view   = new BattleView(party, enemies);
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

      if (actor.isPlayer) {
        this.renderScreen(view, logger);
        console.log(chalk.cyan.bold(`⚔  ${actor.name} のターン`));
        const result = await this.getPlayerTurn(actor as Player, engine, skillMap, itemMap);

        let actionLogs: string[];
        if (result.type === 'item') {
          // Deduct item from inventory, then apply effect
          this.ctx.gameState.set(
            'inventory',
            removeItem(this.ctx.gameState.get('inventory'), result.item.id),
          );
          actionLogs = applyItemEffect(result.item, result.target);
        } else {
          actionLogs = engine.executeAction(actor, result);
        }

        for (const log of actionLogs) logger.log(log);
        this.renderScreen(view, logger);
        await Menu.input('');
      } else {
        this.renderScreen(view, logger);
        const action = engine.decideEnemyAction(actor as Monster);
        const actionLogs = engine.executeAction(actor, action);
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
      const isBoss = pending.isBoss ?? false;
      await this.handleVictory(engine, skillMap, itemMap, party, isBoss);
      this.ctx.gameState.set('party', party.members.map((p) => p.toData()));

      if (isBoss) {
        const area = this.ctx.gameState.get('currentArea');
        if (area === 'forest' || area === 'cave') {
          const flags = { ...this.ctx.gameState.get('bossDefeated'), [area]: true };
          this.ctx.gameState.set('bossDefeated', flags);
        }
        // Cave boss = game clear
        if (area === 'cave') {
          await this.ctx.sceneManager.transition('gameclear');
          return;
        }
      }
      await this.ctx.sceneManager.transition('field');
    } else {
      console.log(chalk.red.bold('\n💀 全滅…'));
      await Menu.input('');
      this.ctx.gameState.set('party', party.members.map((p: Player) => p.toData()));
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
    itemMap: Map<string, ItemData>,
    party: Party,
    isBoss: boolean,
  ): Promise<void> {
    const { expGained, goldGained } = engine.getBattleRewards();
    const victoryMsg = isBoss ? '🏆 ボスを倒した！' : '🏆 勝利！';
    console.log(isBoss ? chalk.red.bold(victoryMsg) : chalk.yellow.bold(victoryMsg));
    console.log(chalk.white(`  EXP + ${expGained}`));
    console.log(chalk.yellow(`  Gold + ${goldGained}`));
    this.ctx.gameState.set('gold', this.ctx.gameState.get('gold') + goldGained);

    // Process item drops
    let inventory = this.ctx.gameState.get('inventory');
    const dropLines: string[] = [];
    for (const enemy of engine.enemies) {
      for (const drop of enemy.drops) {
        if (this.ctx.rng.next() < drop.rate) {
          inventory = addItem(inventory, drop.itemId);
          const itemName = itemMap.get(drop.itemId)?.name ?? drop.itemId;
          dropLines.push(`  ${itemName} を手に入れた！`);
        }
      }
    }
    this.ctx.gameState.set('inventory', inventory);
    for (const line of dropLines) console.log(chalk.cyan(line));

    // EXP & level-up
    for (const player of party.members) {
      player.exp += expGained;
      while (player.exp >= getExpForLevel(player.level + 1)) {
        const growth = getStatGrowthForLevel(player.level + 1);
        player.levelUp(growth);
        console.log(chalk.green.bold(`\n  ⬆ レベルアップ！${player.name} は Lv.${player.level} になった！`));
        console.log(
          chalk.dim(`     HP+${growth.maxHp ?? 0} MP+${growth.maxMp ?? 0} ATK+${growth.attack ?? 0} DEF+${growth.defense ?? 0} MAG+${growth.magic ?? 0}`),
        );
        for (const skillId of getSkillsLearnedAtLevel(player.level)) {
          if (!player.skills.includes(skillId)) {
            player.skills.push(skillId);
            const skill = skillMap.get(skillId);
            if (skill) console.log(chalk.cyan(`     ✨ ${skill.name} を習得した！`));
          }
        }
      }
      const toNext  = getExpToNextLevel(player.level);
      const current = player.exp - getExpForLevel(player.level);
      console.log(chalk.dim(`  ${player.name} EXP: ${current}/${toNext}`));
    }

    await Menu.input('\n続ける…');
  }

  private async getPlayerTurn(
    actor: Player,
    engine: BattleEngine,
    skillMap: Map<string, SkillData>,
    itemMap: Map<string, ItemData>,
  ): Promise<PlayerTurnResult> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const isSilenced = actor.hasStatus('silence');
      const inventory  = this.ctx.gameState.get('inventory');
      const hasItems   = inventory.length > 0;

      type MainChoice = 'fight' | 'item' | 'defend';
      const main = await Menu.select<MainChoice>('コマンド', [
        { value: 'fight',  name: '⚔  たたかう' },
        { value: 'item',   name: '🎒  アイテム', disabled: hasItems ? false : '(なし)' },
        { value: 'defend', name: '🛡  ぼうぎょ' },
      ]);

      if (main === 'defend') return { type: 'defend' };

      if (main === 'item') {
        const result = await this.selectItem(actor, party(engine), inventory, itemMap);
        if (result) return result;
        continue; // cancelled — back to main menu
      }

      // Fight: skill selection
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

      const skill   = skillMap.get(skillId)!;
      const targets = await this.selectTargets(skill, actor, engine);
      return { type: 'skill', skill, targets };
    }
  }

  private async selectItem(
    _actor: Player,
    allies: Player[],
    inventory: { itemId: string; count: number }[],
    itemMap: Map<string, ItemData>,
  ): Promise<ItemAction | null> {
    const usableEntries = inventory.filter((e) => itemMap.has(e.itemId));
    if (usableEntries.length === 0) return null;

    const choices: { value: string; name: string }[] = [
      ...usableEntries.map((e) => {
        const item = itemMap.get(e.itemId)!;
        return { value: e.itemId, name: `${item.name}  ×${e.count}  [${item.description}]` };
      }),
      { value: '__back__', name: chalk.dim('↩  もどる') },
    ];

    const picked = await Menu.select<string>('アイテム', choices);
    if (picked === '__back__') return null;

    const item = itemMap.get(picked)!;

    // Target selection (self if 1 member, otherwise pick ally)
    let target: Player;
    if (allies.length === 1) {
      target = allies[0];
    } else {
      const idx = await Menu.select<string>(
        'だれに使う？',
        allies.map((p, i) => ({ value: String(i), name: `${p.name} HP:${p.currentHp}` })),
      );
      target = allies[parseInt(idx)];
    }

    return { type: 'item', item, target };
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

function party(engine: BattleEngine): Player[] {
  return engine.party.members as Player[];
}
