import { z } from 'zod';
import { ELEMENTS } from '../../constants/elements.js';
import { STATUS_TYPES } from '../../constants/statusTypes.js';

export const SkillSchema = z.object({
  id:         z.string().min(1),
  name:       z.string().min(1),
  mpCost:     z.number().int().nonnegative(),
  power:      z.number().int().nonnegative(),
  element:    z.enum(ELEMENTS),
  target:     z.enum(['single', 'all', 'self']),
  effect:     z.enum(STATUS_TYPES).optional(),
  effectRate: z.number().min(0).max(1).optional(),
});
export type SkillData = z.infer<typeof SkillSchema>;

export const SkillsFileSchema = z.array(SkillSchema);
