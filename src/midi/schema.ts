import * as z from 'zod/mini';

import { PARAMETER_KEYS } from '@/ui/Parameters';

const ccSchema = z.int().check(z.gte(0), z.lte(127));

const parameterControl = z.object({
  cc: ccSchema,
  type: z.literal('parameter'),
  parameter: z.enum(PARAMETER_KEYS),
});

const keyControl = z.object({
  cc: ccSchema,
  type: z.literal('key'),
  code: z.string().check(z.minLength(1)),
});

export const midiMappingSchema = z.object({
  device: z.string().check(z.minLength(1)),
  channel: z._default(z.int().check(z.gte(0), z.lte(15)), 0),
  controls: z.array(z.union([parameterControl, keyControl])),
});

export type MidiControl = z.infer<typeof parameterControl> | z.infer<typeof keyControl>;
export type MidiMapping = z.infer<typeof midiMappingSchema>;
