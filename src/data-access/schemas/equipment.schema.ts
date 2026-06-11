import { z } from 'zod';
import type { Stats } from '../../entities/Stats.js';

const StatBonusSchema = z.object({
  maxHp:   z.number().int().optional(),
  maxMp:   z.number().int().optional(),
  attack:  z.number().int().optional(),
  defense: z.number().int().optional(),
  magic:   z.number().int().optional(),
  speed:   z.number().int().optional(),
  luck:    z.number().int().optional(),
}) satisfies z.ZodType<Partial<Stats>>;

export const EquipmentSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().min(1),
  type:        z.enum(['weapon', 'armor', 'accessory']),
  statBonus:   StatBonusSchema,
  price:       z.number().int().nonnegative(),
  description: z.string(),
});
export type EquipmentData = z.infer<typeof EquipmentSchema>;
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export const EquipmentsFileSchema = z.array(EquipmentSchema);
