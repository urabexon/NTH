import * as z from 'zod/mini';

import { EFFECT_KINDS } from '@/post/DeformEffect';
import { PARAMETER_KEYS } from '@/ui/Parameters';

const parameterEntries = Object.fromEntries(
  PARAMETER_KEYS.map((key) => [key, z.optional(z.number())]),
) as Record<(typeof PARAMETER_KEYS)[number], z.ZodMiniOptional<z.ZodMiniNumber>>;

export const snapshotSchema = z.object({
  v: z.literal(1),
  polytope: z.optional(z.string()),
  params: z.object(parameterEntries),
  effect: z.enum(EFFECT_KINDS),
  slitScan: z.boolean(),
  magnify: z.boolean(),
  invert: z.boolean(),
  faces: z.boolean(),
  particles: z.boolean(),
});

export type Snapshot = z.infer<typeof snapshotSchema>;

export const presetSchema = z.object({
  name: z.string(),
  snapshot: snapshotSchema,
});

export const presetStoreSchema = z.object({
  v: z.literal(1),
  slots: z.record(z.string(), presetSchema),
});

export type Preset = z.infer<typeof presetSchema>;
export type PresetStoreData = z.infer<typeof presetStoreSchema>;
