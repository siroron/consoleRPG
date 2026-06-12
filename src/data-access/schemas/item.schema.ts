import { z } from 'zod';
import { STATUS_TYPES } from '../../constants/statusTypes.js';

export const ITEM_EFFECTS = ['heal_hp', 'heal_mp', 'cure_status'] as const;
export type ItemEffect = (typeof ITEM_EFFECTS)[number];

export const ItemSchema = z.object({
  id:           z.string().min(1),
  name:         z.string().min(1),
  description:  z.string(),
  effect:       z.enum(ITEM_EFFECTS),
  power:        z.number().int().nonnegative(),
  statusToCure: z.enum(STATUS_TYPES).optional(),
  price:        z.number().int().nonnegative(),
});

export const ItemsFileSchema = z.array(ItemSchema);

export type ItemData = z.infer<typeof ItemSchema>;
