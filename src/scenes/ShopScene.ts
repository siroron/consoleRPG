import chalk from 'chalk';
import { Scene } from './Scene.js';
import type { SceneContext } from './Scene.js';
import type { EquipmentData } from '../data-access/schemas/equipment.schema.js';
import { buyEquipment, sellEquipment, getSellPrice } from '../systems/ShopSystem.js';
import { formatStatBonus } from '../systems/EquipmentSystem.js';
import { Menu } from '../ui/Menu.js';

type ShopChoice = 'buy' | 'sell' | 'back';

export class ShopScene extends Scene {
  constructor(context: SceneContext) {
    super(context);
  }

  async update(): Promise<void> {
    const allEquipments = await this.ctx.dataLoader.getEquipments();

    let exit = false;
    while (!exit) {
      this.renderHeader();
      const choice = await Menu.select<ShopChoice>('ショップ', [
        { value: 'buy',  name: '🛒 購入する' },
        { value: 'sell', name: '💰 売却する' },
        { value: 'back', name: '↩  街へ戻る' },
      ]);

      switch (choice) {
        case 'buy':
          await this.handleBuy(allEquipments);
          break;
        case 'sell':
          await this.handleSell(allEquipments);
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
    console.log(chalk.bold.yellow('=== 道具屋 ==='));
    const gold = this.ctx.gameState.get('gold');
    console.log(chalk.yellow(`  所持Gold: ${gold}G`));
    console.log();
  }

  private async handleBuy(allEquipments: EquipmentData[]): Promise<void> {
    const owned = this.ctx.gameState.get('ownedEquipment');
    const gold = this.ctx.gameState.get('gold');

    const forSale = allEquipments.filter((e) => !owned.includes(e.id));
    if (forSale.length === 0) {
      process.stdout.write('\x1Bc');
      console.log(chalk.dim('  購入できるアイテムがありません。'));
      await Menu.input('続ける…');
      return;
    }

    const choices = [
      ...forSale.map((e) => {
        const bonus = formatStatBonus(e.statBonus);
        const canAfford = gold >= e.price;
        return {
          value: e.id,
          name: `${e.name}  [${bonus}]  ${e.price}G`,
          disabled: canAfford ? (false as const) : '(Gold不足)',
        };
      }),
      { value: 'cancel', name: 'キャンセル' },
    ];

    const picked = await Menu.select<string>('購入する装備を選択', choices);
    if (picked === 'cancel') return;

    const equipment = forSale.find((e) => e.id === picked)!;

    process.stdout.write('\x1Bc');
    console.log(chalk.bold(`${equipment.name}`));
    console.log(chalk.dim(`  ${equipment.description}`));
    console.log(chalk.dim(`  ボーナス: ${formatStatBonus(equipment.statBonus)}`));
    console.log(chalk.yellow(`  価格: ${equipment.price}G`));
    console.log();

    const confirmed = await Menu.confirm('購入しますか？');
    if (!confirmed) return;

    const result = buyEquipment(this.ctx.gameState, equipment);
    process.stdout.write('\x1Bc');
    if (result.success) {
      console.log(chalk.green(`  ${result.message}`));
      console.log(chalk.yellow(`  残Gold: ${this.ctx.gameState.get('gold')}G`));
    } else {
      console.log(chalk.red(`  ${result.message}`));
    }
    await Menu.input('続ける…');
  }

  private async handleSell(allEquipments: EquipmentData[]): Promise<void> {
    const owned = this.ctx.gameState.get('ownedEquipment');
    const party = this.ctx.gameState.get('party');

    const equippedIds = new Set(
      party.flatMap((p) => [p.equipment.weapon, p.equipment.armor, p.equipment.accessory].filter(Boolean)),
    );

    const sellable = allEquipments.filter((e) => owned.includes(e.id));
    if (sellable.length === 0) {
      process.stdout.write('\x1Bc');
      console.log(chalk.dim('  売却できるアイテムがありません。'));
      await Menu.input('続ける…');
      return;
    }

    const choices = [
      ...sellable.map((e) => {
        const price = getSellPrice(e);
        const isEquipped = equippedIds.has(e.id);
        return {
          value: e.id,
          name: `${e.name}  ${price}G`,
          disabled: isEquipped ? '(装備中)' : (false as const),
        };
      }),
      { value: 'cancel', name: 'キャンセル' },
    ];

    const picked = await Menu.select<string>('売却する装備を選択', choices);
    if (picked === 'cancel') return;

    const equipment = sellable.find((e) => e.id === picked)!;
    const sellPrice = getSellPrice(equipment);

    process.stdout.write('\x1Bc');
    console.log(chalk.bold(`${equipment.name}`));
    console.log(chalk.yellow(`  売値: ${sellPrice}G`));
    console.log();

    const confirmed = await Menu.confirm('売却しますか？');
    if (!confirmed) return;

    const result = sellEquipment(this.ctx.gameState, equipment);
    process.stdout.write('\x1Bc');
    if (result.success) {
      console.log(chalk.green(`  ${result.message}`));
      console.log(chalk.yellow(`  所持Gold: ${this.ctx.gameState.get('gold')}G`));
    } else {
      console.log(chalk.red(`  ${result.message}`));
    }
    await Menu.input('続ける…');
  }
}
