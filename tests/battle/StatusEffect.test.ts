import { describe, it, expect } from 'vitest';
import { Player } from '../../src/entities/Player.js';
import { CONFIG } from '../../src/constants/config.js';

// 麻痺判定用の決定論的 RNG
const alwaysHigh = () => 0.9; // 0.9 >= 0.5 → 麻痺で行動不可
const alwaysLow  = () => 0.1; // 0.1 <  0.5 → 麻痺でも行動可能

function makePlayer(): Player {
  return Player.createDefault();
}

describe('Character.startTurn — 状態異常処理', () => {
  it('状態異常なし — 行動可能で tickResults が空', () => {
    const player = makePlayer();
    const result = player.startTurn(alwaysLow);

    expect(result.canAct).toBe(true);
    expect(result.tickResults).toHaveLength(0);
  });

  // ────────────────────────────────────────────
  // 毒
  // ────────────────────────────────────────────
  it('poison — 毎ターン HP ダメージを与えるが行動は可能', () => {
    const player = makePlayer();
    const hpBefore = player.currentHp;
    player.addStatusEffect('poison', 5);

    const result = player.startTurn(alwaysLow);

    const expectedDmg = Math.max(1, Math.floor(player.baseStats.maxHp * CONFIG.POISON_DAMAGE_RATE));
    expect(player.currentHp).toBe(hpBefore - expectedDmg);
    expect(result.canAct).toBe(true);
    expect(result.tickResults[0].poisonDamage).toBe(expectedDmg);
  });

  // ────────────────────────────────────────────
  // 睡眠
  // ────────────────────────────────────────────
  it('sleep — 行動不可にする', () => {
    const player = makePlayer();
    player.addStatusEffect('sleep', 0); // 0 = ダメージを受けるまで永続

    const result = player.startTurn(alwaysLow);

    expect(result.canAct).toBe(false);
    expect(result.sleepBlocked).toBe(true);
  });

  it('sleep — takeDamage を受けると自動解除される', () => {
    const player = makePlayer();
    player.addStatusEffect('sleep', 0);
    expect(player.hasStatus('sleep')).toBe(true);

    player.takeDamage(1);

    expect(player.hasStatus('sleep')).toBe(false);
  });

  // ────────────────────────────────────────────
  // 麻痺
  // ────────────────────────────────────────────
  it('paralysis — rng が高い場合は行動不可', () => {
    const player = makePlayer();
    player.addStatusEffect('paralysis', 3);

    const result = player.startTurn(alwaysHigh);

    expect(result.canAct).toBe(false);
    expect(result.paralysisBlocked).toBe(true);
  });

  it('paralysis — rng が低い場合は行動可能', () => {
    const player = makePlayer();
    player.addStatusEffect('paralysis', 3);

    const result = player.startTurn(alwaysLow);

    expect(result.canAct).toBe(true);
    expect(result.paralysisBlocked).toBe(false);
  });

  // ────────────────────────────────────────────
  // 沈黙
  // ────────────────────────────────────────────
  it('silence — 行動自体は可能（スキル制限は ActionResolver 担当）', () => {
    const player = makePlayer();
    player.addStatusEffect('silence', 3);

    const result = player.startTurn(alwaysLow);

    expect(result.canAct).toBe(true);
  });

  // ────────────────────────────────────────────
  // ターン経過・期限切れ
  // ────────────────────────────────────────────
  it('残りターンが 1 の状態異常は次の startTurn で自動解除される', () => {
    const player = makePlayer();
    player.addStatusEffect('silence', 1);
    expect(player.hasStatus('silence')).toBe(true);

    player.startTurn(alwaysLow);

    expect(player.hasStatus('silence')).toBe(false);
  });

  it('残りターンが毎 startTurn で 1 ずつ減算される', () => {
    const player = makePlayer();
    player.addStatusEffect('paralysis', 3);

    player.startTurn(alwaysLow);

    expect(player.getActiveStatuses()[0].remainingTurns).toBe(2);
  });

  it('duration 0 の状態異常（sleep）はターン経過で解除されない', () => {
    const player = makePlayer();
    player.addStatusEffect('sleep', 0);

    player.startTurn(alwaysLow); // 1ターン経過

    expect(player.hasStatus('sleep')).toBe(true);
  });
});
