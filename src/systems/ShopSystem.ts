import type { GameState } from '../core/GameState.js';
import type { EquipmentData } from '../data-access/schemas/equipment.schema.js';

export const SELL_RATE = 0.5;

export interface ShopResult {
  success: boolean;
  message: string;
}

export function buyEquipment(
  gameState: GameState,
  equipment: EquipmentData,
): ShopResult {
  const gold = gameState.get('gold');
  if (gold < equipment.price) {
    return { success: false, message: 'Goldが不足しています！' };
  }
  const owned = gameState.get('ownedEquipment');
  if (owned.includes(equipment.id)) {
    return { success: false, message: 'すでに所持しています！' };
  }
  gameState.set('gold', gold - equipment.price);
  gameState.set('ownedEquipment', [...owned, equipment.id]);
  return { success: true, message: `${equipment.name}を購入した！` };
}

export function sellEquipment(
  gameState: GameState,
  equipment: EquipmentData,
): ShopResult {
  const owned = gameState.get('ownedEquipment');
  if (!owned.includes(equipment.id)) {
    return { success: false, message: '所持していません！' };
  }
  // Cannot sell equipped items
  const party = gameState.get('party');
  for (const member of party) {
    const eq = member.equipment;
    if (eq.weapon === equipment.id || eq.armor === equipment.id || eq.accessory === equipment.id) {
      return { success: false, message: '装備中のアイテムは売れません！' };
    }
  }
  const sellPrice = Math.floor(equipment.price * SELL_RATE);
  gameState.set('gold', gameState.get('gold') + sellPrice);
  gameState.set('ownedEquipment', owned.filter((id) => id !== equipment.id));
  return { success: true, message: `${equipment.name}を${sellPrice}Gで売却した！` };
}

export function getSellPrice(equipment: EquipmentData): number {
  return Math.floor(equipment.price * SELL_RATE);
}
