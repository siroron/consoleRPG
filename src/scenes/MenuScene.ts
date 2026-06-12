import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import { Player } from '../entities/Player.js';
import type { EquipmentSlots } from '../entities/Player.js';
import type { EquipmentData } from '../data-access/schemas/equipment.schema.js';
import { applyEquipmentBonuses, formatStatBonus, formatStatComparison } from '../systems/EquipmentSystem.js';
import type { Stats } from '../entities/Stats.js';
import { getExpToNextLevel, getExpForLevel } from '../systems/LevelSystem.js';
import { Menu } from '../ui/Menu.js';
import { renderHpBar, renderMpBar } from '../ui/StatusBar.js';

type TopChoice = 'status' | 'equip' | 'items' | 'save' | 'back';

export class MenuScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  async update(): Promise<void> {
    const equipmentMap = new Map(
      (await this.ctx.dataLoader.getEquipments()).map((e) => [e.id, e]),
    );

    let exit = false;
    while (!exit) {
      this.renderHeader();
      const choice = await Menu.select<TopChoice>('メニュー', [
        { value: 'status', name: '📊 ステータス確認' },
        { value: 'equip',  name: '🗡  装備変更' },
        { value: 'items',  name: '🎒 アイテム確認' },
        { value: 'save',   name: '💾 セーブする' },
        { value: 'back',   name: '↩  フィールドへ戻る' },
      ]);

      switch (choice) {
        case 'status':
          this.showStatus(equipmentMap);
          await Menu.input('続ける…');
          break;
        case 'equip':
          await this.handleEquip(equipmentMap);
          break;
        case 'items':
          await this.showInventory();
          break;
        case 'save':
          await this.handleSave();
          break;
        case 'back':
          exit = true;
          break;
      }
    }

    await this.ctx.sceneManager.transition('field');
  }

  private renderHeader(): void {
    process.stdout.write('\x1Bc');
    console.log(chalk.bold.cyan('=== メニュー ==='));
    const gold = this.ctx.gameState.get('gold');
    console.log(chalk.yellow(`  所持Gold: ${gold}G`));
    console.log();
  }

  private showStatus(equipmentMap: Map<string, EquipmentData>): void {
    process.stdout.write('\x1Bc');
    console.log(chalk.bold('=== パーティステータス ==='));
    console.log();

    const partyData = this.ctx.gameState.get('party');
    for (const data of partyData) {
      const player = Player.fromData(data);
      applyEquipmentBonuses(player, equipmentMap);
      const eff = player.getEffectiveStats();
      const toNext = getExpToNextLevel(player.level);
      const current = player.exp - getExpForLevel(player.level);

      console.log(chalk.bold(`  ${data.name}`) + `  Lv.${data.level}  EXP: ${current}/${toNext}`);
      console.log(`  ${renderHpBar(data.name, data.currentHp, eff.maxHp)}`);
      console.log(`  ${renderMpBar(data.currentMp, eff.maxMp)}`);
      console.log(
        chalk.dim(
          `  ATK:${eff.attack}  DEF:${eff.defense}  MAG:${eff.magic}  SPD:${eff.speed}  LCK:${eff.luck}`,
        ),
      );
      console.log(
        chalk.dim(
          `  武器: ${this.equipName(data.equipment.weapon, equipmentMap)}` +
          `  防具: ${this.equipName(data.equipment.armor, equipmentMap)}` +
          `  装飾: ${this.equipName(data.equipment.accessory, equipmentMap)}`,
        ),
      );
      console.log();
    }
  }

  private equipName(id: string | null, map: Map<string, EquipmentData>): string {
    if (!id) return '---';
    return map.get(id)?.name ?? id;
  }

  private async handleEquip(equipmentMap: Map<string, EquipmentData>): Promise<void> {
    const partyData = this.ctx.gameState.get('party');
    if (partyData.length === 0) return;

    // Pick member
    const memberIdx = partyData.length === 1
      ? 0
      : parseInt(
          await Menu.select<string>(
            'キャラクターを選択',
            partyData.map((p, i) => ({ value: String(i), name: `${p.name} Lv.${p.level}` })),
          ),
        );
    const memberData = partyData[memberIdx];

    // Pick slot
    type SlotChoice = 'weapon' | 'armor' | 'accessory' | 'cancel';
    const slot = await Menu.select<SlotChoice>('スロットを選択', [
      {
        value: 'weapon',
        name: `武器: ${this.equipName(memberData.equipment.weapon, equipmentMap)}`,
      },
      {
        value: 'armor',
        name: `防具: ${this.equipName(memberData.equipment.armor, equipmentMap)}`,
      },
      {
        value: 'accessory',
        name: `装飾: ${this.equipName(memberData.equipment.accessory, equipmentMap)}`,
      },
      { value: 'cancel', name: 'キャンセル' },
    ]);
    if (slot === 'cancel') return;

    const ownedIds = this.ctx.gameState.get('ownedEquipment');
    const candidates = (await this.ctx.dataLoader.getEquipments()).filter(
      (e) => e.type === slot && ownedIds.includes(e.id),
    );

    type EquipChoice = string; // equipment id or 'unequip'
    const choices = [
      ...candidates.map((e) => {
        const bonus = formatStatBonus(e.statBonus);
        return { value: e.id, name: `${e.name}  [${bonus}]` };
      }),
      { value: 'unequip', name: '（外す）' },
      { value: 'cancel',  name: 'キャンセル' },
    ];

    const picked = await Menu.select<EquipChoice>('装備を選択', choices);
    if (picked === 'cancel') return;

    const newEquip: EquipmentSlots = { ...memberData.equipment };
    newEquip[slot] = picked === 'unequip' ? null : picked;

    // Preview stat diff
    const currentBonus: Partial<Stats> =
      memberData.equipment[slot] ? (equipmentMap.get(memberData.equipment[slot]!)?.statBonus ?? {}) : {};
    const newBonus: Partial<Stats> =
      picked === 'unequip' ? {} : (equipmentMap.get(picked)?.statBonus ?? {});

    process.stdout.write('\x1Bc');
    console.log(chalk.bold(`${memberData.name} の装備を変更します`));
    console.log(chalk.dim(`  現在: ${this.equipName(memberData.equipment[slot], equipmentMap)}`));
    console.log(chalk.dim(`  変更後: ${picked === 'unequip' ? '（なし）' : (equipmentMap.get(picked)?.name ?? picked)}`));
    console.log();
    console.log(chalk.bold('  ステータス変化:'));
    for (const line of formatStatComparison(newBonus, currentBonus)) console.log(line);
    console.log();

    const confirmed = await Menu.confirm('この装備にしますか？');
    if (!confirmed) return;

    const updated = partyData.map((p, i) =>
      i === memberIdx ? { ...p, equipment: newEquip } : p,
    );
    this.ctx.gameState.set('party', updated);

    process.stdout.write('\x1Bc');
    const itemName = picked === 'unequip' ? '（なし）' : (equipmentMap.get(picked)?.name ?? picked);
    console.log(chalk.green(`  ${memberData.name} の${slotLabel(slot)}を「${itemName}」に変更した！`));
    await Menu.input('続ける…');
  }

  private async showInventory(): Promise<void> {
    process.stdout.write('\x1Bc');
    console.log(chalk.bold('=== アイテム ==='));
    console.log();

    const inventory = this.ctx.gameState.get('inventory');
    if (inventory.length === 0) {
      console.log(chalk.dim('  アイテムを持っていない。'));
    } else {
      const allItems = await this.ctx.dataLoader.getItems();
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      for (const entry of inventory) {
        const item = itemMap.get(entry.itemId);
        const name = item?.name ?? entry.itemId;
        const desc = item?.description ?? '';
        console.log(`  ${chalk.white(name.padEnd(14))} ×${entry.count}  ${chalk.dim(desc)}`);
      }
    }
    console.log();
    await Menu.input('続ける…');
  }

  private async handleSave(): Promise<void> {
    process.stdout.write('\x1Bc');
    const confirmed = await Menu.confirm('スロット1にセーブしますか？');
    if (!confirmed) return;

    try {
      await this.ctx.saveManager.save(this.ctx.gameState, 1);
      process.stdout.write('\x1Bc');
      console.log(chalk.green.bold('  ゲームをセーブしました！'));
    } catch (err) {
      process.stdout.write('\x1Bc');
      console.log(chalk.red(`  セーブに失敗しました: ${String(err)}`));
    }
    await Menu.input('続ける…');
  }
}

function slotLabel(slot: 'weapon' | 'armor' | 'accessory'): string {
  if (slot === 'weapon')    return '武器';
  if (slot === 'armor')     return '防具';
  return '装飾品';
}
