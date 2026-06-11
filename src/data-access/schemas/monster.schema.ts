import { z } from 'zod';
import { ELEMENTS } from '../../constants/elements.js';
import { STATUS_TYPES } from '../../constants/statusTypes.js';
import type { Stats } from '../../entities/Stats.js';

const StatsSchema = z.object({
  maxHp:   z.number().int().positive(),
  maxMp:   z.number().int().nonnegative(),
  attack:  z.number().int().positive(),
  defense: z.number().int().nonnegative(),
  magic:   z.number().int().nonnegative(),
  speed:   z.number().int().positive(),
  luck:    z.number().int().nonnegative(),
}) satisfies z.ZodType<Stats>;

export const MonsterSchema = z.object({
  id:      z.string().min(1),
  name:    z.string().min(1),
  element: z.enum(ELEMENTS),
  stats:   StatsSchema,
  skills:  z.array(z.string()),
  aiType:  z.enum(['aggressive', 'defensive', 'smart']),
  exp:     z.number().int().nonnegative(),
  gold:    z.number().int().nonnegative(),
  drops:   z.array(z.object({
    itemId: z.string(),
    rate:   z.number().min(0).max(1),
  })),
});
export type MonsterData = z.infer<typeof MonsterSchema>;

export const MonstersFileSchema = z.array(MonsterSchema);

export { STATUS_TYPES };
