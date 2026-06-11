import type { SkillData } from '../data-access/schemas/skill.schema.js';
import type { Character } from '../entities/Character.js';
import type { Monster } from '../entities/Monster.js';
import { Party } from '../entities/Party.js';
import type { RNG } from '../core/RNG.js';
import { STATUS_CONFIG } from '../constants/statusTypes.js';
import { sortBySpeed } from './TurnOrder.js';
import { resolveAction, type BattleAction } from './ActionResolver.js';
import { applyConfusion } from './TargetSelector.js';
import { AggressiveAI } from './enemyAI/AggressiveAI.js';
import { DefensiveAI } from './enemyAI/DefensiveAI.js';
import { SmartAI } from './enemyAI/SmartAI.js';
import type { EnemyAI } from './enemyAI/EnemyAI.js';
import type { StatusProcessResult } from './StatusEffect.js';

function createAI(type: 'aggressive' | 'defensive' | 'smart'): EnemyAI {
  if (type === 'defensive') return new DefensiveAI();
  if (type === 'smart') return new SmartAI();
  return new AggressiveAI();
}

export class BattleEngine {
  readonly party: Party;
  readonly enemies: Monster[];
  private readonly skillMap: Map<string, SkillData>;
  private readonly rng: () => number;

  private turnQueue: Character[] = [];
  private turnIndex = 0;
  private _isOver = false;
  private _victory = false;

  constructor(ctx: {
    party: Party;
    enemies: Monster[];
    skillMap: Map<string, SkillData>;
    rng: RNG;
  }) {
    this.party = ctx.party;
    this.enemies = ctx.enemies;
    this.skillMap = ctx.skillMap;
    this.rng = () => ctx.rng.next();
  }

  get isOver(): boolean { return this._isOver; }
  get victory(): boolean { return this._victory; }

  get aliveEnemies(): Monster[] {
    return this.enemies.filter((e) => e.isAlive);
  }

  initTurnQueue(): void {
    const alive: Character[] = [
      ...this.party.aliveMembers,
      ...this.enemies.filter((e) => e.isAlive),
    ];
    this.turnQueue = sortBySpeed(alive);
    this.turnIndex = 0;
  }

  getCurrentActor(): Character {
    return this.turnQueue[this.turnIndex];
  }

  processCurrentActorStatus(): { canAct: boolean; logs: string[] } {
    const actor = this.getCurrentActor();
    const result: StatusProcessResult = actor.startTurn(this.rng);
    return { canAct: result.canAct, logs: this.formatStatusLogs(actor, result) };
  }

  decideEnemyAction(monster: Monster): BattleAction {
    const ai = createAI(monster.aiType);
    return ai.decide(monster, this.party, this.skillMap, this.rng);
  }

  executeAction(actor: Character, action: BattleAction): string[] {
    let effectiveAction = action;

    // Confusion: randomize single target
    if (
      actor.hasStatus('confusion') &&
      action.type === 'skill' &&
      action.targets.length === 1
    ) {
      const allAlive: Character[] = [
        ...this.party.aliveMembers,
        ...this.aliveEnemies,
      ];
      effectiveAction = {
        ...action,
        targets: applyConfusion(action.targets, allAlive, this.rng),
      };
    }

    const { logs } = resolveAction(actor, effectiveAction, this.rng);
    return logs;
  }

  advanceTurn(): void {
    this.turnIndex++;
    if (this.turnIndex >= this.turnQueue.length) {
      this.initTurnQueue();
    }
  }

  checkBattleEnd(): boolean {
    if (this.party.isWiped) {
      this._isOver = true;
      this._victory = false;
      return true;
    }
    if (this.enemies.every((e) => e.isKO)) {
      this._isOver = true;
      this._victory = true;
      return true;
    }
    return false;
  }

  getBattleRewards(): { expGained: number; goldGained: number } {
    return {
      expGained: this.enemies.reduce((sum, e) => sum + e.exp, 0),
      goldGained: this.enemies.reduce((sum, e) => sum + e.gold, 0),
    };
  }

  private formatStatusLogs(
    actor: Character,
    result: StatusProcessResult,
  ): string[] {
    const logs: string[] = [];

    for (const tick of result.tickResults) {
      if (tick.poisonDamage) {
        logs.push(`${actor.name} は毒で ${tick.poisonDamage} のダメージを受けた！`);
      }
      if (tick.expired) {
        logs.push(
          `${actor.name} の ${STATUS_CONFIG[tick.type].displayName} が解けた！`,
        );
      }
    }

    if (result.sleepBlocked) {
      logs.push(`${actor.name} は眠っている…`);
    } else if (result.paralysisBlocked) {
      logs.push(`${actor.name} は麻痺で動けない！`);
    }

    return logs;
  }
}
