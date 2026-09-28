export const DEFAULT_SUBDIVISION = 8;

export const SUBDIVISION_LEVELS: Readonly<Record<string, number>> = {
  hypercube: 40,
  pentatope: 60,
  '3x3-duoprism': 60,
  '16-cell': 30,
  'flat-torus': 7,
  '8-hedra-solid': 20,
  '2-2-7': 12,
  '2-2-9': 12,
  '3-3-3-3-4': 40,
  '3-5-maze': 8,
  '24-cell': 30,
  'truncated-hypercube': 20,
  '2-3-4': 12,
  'edge-truncated-hypercube': 10,
  '12x12-duoprism': 10,
  y: 10,
  '8-prisms-solid': 10,
  '3-3-4-maze': 8,
  '120-cell': 8,
  '20-hedra-solid': 8,
  '6-prisms-solid': 8,
  '4-hedra-solid': 5,
  '600-cell': 10,
  '12-hedra-solid': 5,
};

export function subdivisionLevelFor(slug: string): number {
  return SUBDIVISION_LEVELS[slug] ?? DEFAULT_SUBDIVISION;
}
