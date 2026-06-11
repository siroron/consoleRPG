import chalk from 'chalk';
import { hpBar } from '../utils/format.js';

export function renderHpBar(
  name: string,
  current: number,
  max: number,
  width = 10,
): string {
  const ratio = current / max;
  const barColor = ratio > 0.5 ? chalk.green : ratio > 0.25 ? chalk.yellow : chalk.red;
  const bar = barColor(hpBar(current, max, width));
  const nums = chalk.white(`${current}/${max}`);
  return `${chalk.bold(name.padEnd(8))} HP ${bar} ${nums}`;
}

export function renderMpBar(
  current: number,
  max: number,
  width = 8,
): string {
  const bar = chalk.blue(hpBar(current, max, width));
  const nums = chalk.cyan(`${current}/${max}`);
  return `MP ${bar} ${nums}`;
}
