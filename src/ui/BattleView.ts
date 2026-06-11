import chalk from 'chalk';
import { STATUS_CONFIG } from '../constants/statusTypes.js';
import type { Party } from '../entities/Party.js';
import type { Monster } from '../entities/Monster.js';
import type { Logger } from './Logger.js';
import { renderHpBar, renderMpBar } from './StatusBar.js';
import { hpBar } from '../utils/format.js';

export class BattleView {
  constructor(
    private readonly party: Party,
    private readonly enemies: Monster[],
  ) {}

  render(logger: Logger): void {
    console.log(chalk.bold.red('══════════ ⚔  BATTLE  ⚔ ══════════'));
    console.log();

    // Enemies
    console.log(chalk.bold('  敵：'));
    for (const enemy of this.enemies) {
      const hpRatio = enemy.currentHp / enemy.baseStats.maxHp;
      const barColor =
        hpRatio > 0.5 ? chalk.green : hpRatio > 0.25 ? chalk.yellow : chalk.red;
      const bar = barColor(hpBar(enemy.currentHp, enemy.baseStats.maxHp, 8));
      const nameStr = enemy.isKO
        ? chalk.strikethrough.dim(enemy.name.padEnd(10))
        : chalk.white(enemy.name.padEnd(10));
      const hpStr = enemy.isKO
        ? chalk.dim('  [撃破]')
        : chalk.white(` HP ${bar} ${enemy.currentHp}/${enemy.baseStats.maxHp}`);
      console.log(`    ${nameStr}${hpStr}`);
    }

    console.log();
    console.log(chalk.dim('  ──────────────────────────────────'));

    // Party
    console.log(chalk.bold('  味方：'));
    for (const member of this.party.members) {
      const hpLine = renderHpBar(member.name, member.currentHp, member.baseStats.maxHp);
      const mpLine = renderMpBar(member.currentMp, member.baseStats.maxMp);
      const lvStr = chalk.dim(`Lv.${member.level}`);

      const statuses = member.getActiveStatuses();
      const statusStr =
        statuses.length > 0
          ? ' ' + statuses.map((s) => chalk.magenta(`[${STATUS_CONFIG[s.type].displayName}]`)).join('')
          : '';

      if (member.isKO) {
        console.log(`    ${chalk.red.bold('💀 ' + member.name + ' [戦闘不能]')}`);
      } else {
        console.log(`    ${lvStr} ${hpLine}  ${mpLine}${statusStr}`);
      }
    }

    console.log();
    console.log(chalk.dim('  ──────────────────────────────────'));

    // Battle log
    console.log(chalk.bold('  ログ：'));
    const lines = logger.getLast(6);
    for (const line of lines) {
      console.log(`    ${line}`);
    }

    console.log(chalk.bold.red('════════════════════════════════════'));
    console.log();
  }
}
