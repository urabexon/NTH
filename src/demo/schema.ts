import * as z from 'zod/mini';

import { snapshotSchema } from '@/state/schema';

export const cueSchema = z.object({
  at: z.number().check(z.gte(0)),
  label: z.optional(z.string()),
  snapshot: z.optional(snapshotSchema),
  keys: z.optional(z.array(z.string().check(z.minLength(1)))),
});

export const timelineSchema = z.object({
  v: z.literal(1),
  track: z.string().check(z.minLength(1)),
  cues: z.array(cueSchema).check(z.minLength(1)),
});

export type Cue = z.infer<typeof cueSchema>;
export type Timeline = z.infer<typeof timelineSchema>;
