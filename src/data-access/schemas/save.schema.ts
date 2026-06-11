import { z } from 'zod';
import { ELEMENTS } from '../../constants/elements.js';

const StatsSchema = z.object({
  maxHp:   z.number().int().positive(),
  maxMp:   z.number().int().nonnegative(),
  attack:  z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
  magic:   z.number().int().nonnegative(),
  speed:   z.number().int().nonnegative(),
  luck:    z.number().int().nonnegative(),
});

const EquipmentSlotsSchema = z.object({
  weapon:    z.string().nullable(),
  armor:     z.string().nullable(),
  accessory: z.string().nullable(),
});

const PlayerDataSchema = z.object({
  name:      z.string().min(1),
  level:     z.number().int().positive(),
  exp:       z.number().int().nonnegative(),
  currentHp: z.number().int().nonnegative(),
  currentMp: z.number().int().nonnegative(),
  baseStats: StatsSchema,
  skills:    z.array(z.string()),
  element:   z.enum(ELEMENTS),
  equipment: EquipmentSlotsSchema,
});

export const SaveSchema = z.object({
  version:       z.literal(1),
  playtime:      z.number().nonnegative(),
  gold:          z.number().int().nonnegative(),
  party:         z.array(PlayerDataSchema),
  pendingBattle: z.object({ enemyIds: z.array(z.string()) }).nullable(),
  ownedEquipment: z.array(z.string()),
  inventory:     z.array(z.object({ itemId: z.string(), count: z.number().int().positive() })),
  currentArea:   z.enum(['town', 'forest', 'cave']),
});

export type SaveData = z.infer<typeof SaveSchema>;
