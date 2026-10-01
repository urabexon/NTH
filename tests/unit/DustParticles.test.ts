import { Matrix4 } from 'three';
import { describe, expect, test } from 'vitest';

import { DUST_COUNT, DUST_DENSITY_DEFAULT } from '@/core/config';
import { Projector4D } from '@/core/Projector4D';
import { DustParticles } from '@/particles/DustParticles';

describe('DustParticles', () => {
  test('starts at the default density with a matching instance count', () => {
    const dust = new DustParticles({ projector: new Projector4D(new Matrix4()) });
    expect(dust.maxCount).toBe(DUST_COUNT);
    expect(dust.density).toBe(DUST_DENSITY_DEFAULT);
    expect(dust.count).toBe(Math.round(DUST_COUNT * DUST_DENSITY_DEFAULT));
    expect(dust.visible).toBe(true);
  });

  test('density clamps to [0, 1] and zero hides the cloud', () => {
    const dust = new DustParticles({ projector: new Projector4D(new Matrix4()), count: 100 });
    dust.density = 5;
    expect(dust.count).toBe(100);
    dust.density = 0;
    expect(dust.visible).toBe(false);
    dust.density = 0.25;
    expect(dust.count).toBe(25);
    expect(dust.visible).toBe(true);
  });
});
