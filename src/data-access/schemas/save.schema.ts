import { z } from 'zod';

export const SaveSchema = z.object({
  version:  z.literal(1),
  playtime: z.number().nonnegative(),
  gold:     z.number().int().nonnegative(),
});
export type SaveData = z.infer<typeof SaveSchema>;
