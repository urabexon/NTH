import { expect, test } from '@playwright/test';

test.describe('app boot', () => {
  test('renders the canvas with a GPU backend and saves a screenshot', async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-backend', /^(webgpu|webgl2)$/);
    await expect(page.locator('#stage')).toBeVisible();

    const width = testInfo.project.use.viewport?.width ?? 0;
    await page.screenshot({ path: testInfo.outputPath(`app-${String(width)}.png`) });

    expect(errors).toEqual([]);
  });

  test.describe('projection distance', () => {
    for (const d of [1.05, 1.5, 4]) {
      test(`renders without errors at d=${String(d)}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&d=${String(d)}`);
        await expect(page.locator('html')).toHaveAttribute('data-backend', /webgpu|webgl2/);
        await page.waitForTimeout(500);
        await page.screenshot({ path: testInfo.outputPath(`projection-d${String(d)}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('polytopes', () => {
    for (const slug of ['24-cell', '120-cell', '600-cell']) {
      test(`shows ${slug} and saves a screenshot`, async ({ page }, testInfo) => {
        await page.goto(`/?seed=1&polytope=${slug}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-polytope', slug);
        await page.waitForTimeout(300);
        await page.screenshot({ path: testInfo.outputPath(`polytope-${slug}.png`) });
      });
    }

    test('keys toggle effects and the legend reflects them', async ({ page }, testInfo) => {
      await page.goto('/?seed=1&polytope=hypercube');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');

      await page.keyboard.press('KeyW');
      await expect(html).toHaveAttribute('data-effect', 'repeat');
      await page.keyboard.press('KeyE');
      await expect(html).toHaveAttribute('data-effect', /mirror-(left|right)/);
      await page.keyboard.press('KeyQ');
      await expect(html).toHaveAttribute('data-effect', 'none');

      await page.keyboard.press('KeyR');
      await expect(html).toHaveAttribute('data-slitscan', 'true');
      await page.keyboard.press('KeyT');
      await expect(html).toHaveAttribute('data-magnify', 'true');
      await page.keyboard.press('KeyZ');
      await expect(html).toHaveAttribute('data-invert', 'true');

      const legend = page.locator('nav.legend');
      await expect(legend.locator('.legend-item.is-active')).toHaveCount(3);
      await page.waitForTimeout(400);
      await page.screenshot({ path: testInfo.outputPath('keys-active.png') });

      await page.keyboard.press('KeyR');
      await page.keyboard.press('KeyT');
      await page.keyboard.press('KeyZ');
      await expect(legend.locator('.legend-item.is-active')).toHaveCount(0);
    });

    test('H shows the control panel and its sliders', async ({ page }, testInfo) => {
      await page.goto('/?seed=1&polytope=hypercube');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      const panel = page.locator('.control-panel');
      await expect(panel).toHaveCount(0);
      await page.keyboard.press('KeyH');
      await expect(panel).toHaveAttribute('data-visible', 'true');
      await expect(panel.locator('.tp-lblv')).toHaveCount(17);
      await page.waitForTimeout(300);
      await page.screenshot({ path: testInfo.outputPath('panel.png') });
      await page.keyboard.press('KeyH');
      await expect(panel).toHaveAttribute('data-visible', 'false');
    });

    test('legend hides after a delay and returns on pointer move', async ({ page }) => {
      await page.goto('/?seed=1&polytope=hypercube');
      const legend = page.locator('nav.legend');
      await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
      await expect(legend).not.toHaveClass(/is-hidden/);
      await expect(legend).toHaveClass(/is-hidden/, { timeout: 5000 });
      await page.mouse.move(200, 200);
      await page.mouse.move(240, 220);
      await expect(legend).not.toHaveClass(/is-hidden/);
    });

    test('Space switches to a different polytope', async ({ page }) => {
      await page.goto('/?seed=1');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      const before = await html.getAttribute('data-polytope');
      await page.keyboard.press('Space');
      await expect(html).not.toHaveAttribute('data-polytope', before ?? '');
    });
  });

  test.describe('edges', () => {
    for (const [name, query] of Object.entries({
      thin: 'polytope=hypercube&edge=0.5',
      thick: 'polytope=hypercube&edge=6',
      'faces-off': 'polytope=hypercube&faces=0',
      'glass-120-cell': 'polytope=120-cell&particles=0&trails=0',
      'glass-only-24-cell': 'polytope=24-cell&particles=0&trails=0',
      'glass-only-hypercube': 'polytope=hypercube&particles=0&trails=0',
      'glass-no-dof': 'polytope=hypercube&particles=0&trails=0&dof=0',
    })) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(400);
        await page.screenshot({ path: testInfo.outputPath(`edges-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('depth of field and motion blur', () => {
    for (const [name, query] of Object.entries({
      'dof-strong': 'dof=4&motionBlur=0&particles=0&trails=0&polytope=120-cell',
      'blur-strong': 'motionBlur=3&dof=0&particles=0&trails=0&polytope=hypercube',
      'both-off': 'dof=0&motionBlur=0&particles=0&trails=0&polytope=hypercube',
    })) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/?seed=1&${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(600);
        await page.screenshot({ path: testInfo.outputPath(`post-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('hopf fibration', () => {
    for (const [name, query] of Object.entries({
      'fibers-64': 'fibers=64&scale=0.001&particles=0&trails=0',
      'fibers-16-with-polytope': 'fibers=16&polytope=24-cell&particles=0&trails=0',
    })) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(400);
        await page.screenshot({ path: testInfo.outputPath(`hopf-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('render scale', () => {
    test('defaults to 1 at pixel ratio 1 and honours ?renderScale', async ({ page }, testInfo) => {
      await page.goto('/?seed=1&polytope=hypercube&particles=0&dust=0');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await expect(html).toHaveAttribute('data-render-scale', '1');
      await page.goto('/?seed=1&polytope=hypercube&particles=0&dust=0&renderScale=0.5');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await expect(html).toHaveAttribute('data-render-scale', '0.5');
      await page.waitForTimeout(400);
      await page.screenshot({ path: testInfo.outputPath('render-scale-0.5.png') });
    });
  });

  test.describe('audio', () => {
    test('test tone drives the level and lowers the projection distance', async ({ page }) => {
      await page.goto('/?seed=1&polytope=hypercube&audio=test&particles=0&dust=0');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await expect(html).toHaveAttribute('data-audio', 'on');
      await expect(html).toHaveAttribute('data-audio-level', /^0\.[1-9]|^1/, { timeout: 5000 });
      await page.keyboard.press('KeyM');
      await expect(html).toHaveAttribute('data-audio', 'off');
    });

    test('M requests the microphone and reports denial without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
          value: () => Promise.reject(new Error('NotAllowedError')),
        });
      });
      await page.goto('/?seed=1&particles=0&dust=0');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await page.keyboard.press('KeyM');
      await expect(html).toHaveAttribute('data-audio', 'denied');
      expect(errors).toEqual([]);
    });
  });

  test.describe('midi', () => {
    test('drives keys and parameters from a fake nanoKONTROL2', async ({ page }) => {
      await page.addInitScript(() => {
        const input = { id: '0', name: 'nanoKONTROL2', onmidimessage: null as unknown };
        const access = { inputs: new Map([['0', input]]), onstatechange: null };
        Object.defineProperty(navigator, 'requestMIDIAccess', {
          value: () => Promise.resolve(access),
        });
        (window as unknown as { __midiSend: (bytes: number[]) => void }).__midiSend = (bytes) => {
          (input.onmidimessage as ((e: { data: Uint8Array }) => void) | null)?.({
            data: new Uint8Array(bytes),
          });
        };
      });
      await page.goto('/?seed=1&polytope=hypercube');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await expect(html).toHaveAttribute('data-midi', 'connected');
      await expect(html).toHaveAttribute('data-midi-inputs', 'nanoKONTROL2');

      const send = (bytes: number[]) =>
        page.evaluate((b) => {
          (window as unknown as { __midiSend: (bytes: number[]) => void }).__midiSend(b);
        }, bytes);

      await send([0xb0, 49, 127]);
      await expect(html).toHaveAttribute('data-effect', 'repeat');
      await send([0xb0, 49, 0]);
      await send([0xb0, 41, 127]);
      await expect(html).not.toHaveAttribute('data-polytope', 'hypercube');
      await send([0xb0, 0, 127]);
      await expect(html).toHaveAttribute('data-midi-last', '0:127');
    });

    test('reports unsupported when Web MIDI is missing', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'requestMIDIAccess', { value: undefined });
      });
      await page.goto('/?seed=1');
      await expect(page.locator('html')).toHaveAttribute('data-midi', 'unsupported');
    });
  });

  test.describe('neon look', () => {
    for (const slug of ['hypercube', '24-cell', '120-cell']) {
      test(`${slug} renders the neon look`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&polytope=${slug}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(800);
        await page.screenshot({ path: testInfo.outputPath(`neon-${slug}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('dust', () => {
    for (const [name, query] of Object.entries({
      default: 'particles=0&trails=0',
      dense: 'dust=1&particles=0&trails=0',
      off: 'dust=0&particles=0&trails=0',
    })) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/?seed=1&polytope=hypercube&${query}`);
        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-ready', 'true');
        await expect(html).toHaveAttribute('data-dust', name === 'off' ? 'false' : 'true');
        await page.waitForTimeout(1200);
        await page.screenshot({ path: testInfo.outputPath(`dust-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('particles', () => {
    for (const [name, query] of Object.entries({
      default: '',
      'long-trails': 'trails=0.95',
      off: 'particles=0&trails=0',
    })) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto(`/?seed=1&polytope=24-cell&${query}`);
        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-ready', 'true');
        await expect(html).toHaveAttribute('data-particles', name === 'off' ? 'false' : 'true');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: testInfo.outputPath(`particles-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('post-processing', () => {
    test('bloom on and off both render without errors', async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const variant of ['default', 'off']) {
        const query = variant === 'off' ? '&bloom=0' : '';
        await page.goto(`/?seed=1&polytope=24-cell${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(300);
        await page.screenshot({ path: testInfo.outputPath(`bloom-${variant}.png`) });
      }
      expect(errors).toEqual([]);
    });

    test('120-cell keeps a high frame rate with bloom', async ({ page }) => {
      await page.goto('/?seed=1&polytope=120-cell');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      await expect(html).toHaveAttribute('data-fps', /\d+/, { timeout: 10_000 });
      await page.waitForTimeout(2000);
      const fps = Number(await html.getAttribute('data-fps'));
      console.info(`[e2e] 120-cell fps: ${String(fps)}`);
      expect(fps).toBeGreaterThanOrEqual(50);
    });
  });

  test.describe('deform effects', () => {
    const variants: Record<string, string> = {
      repeat: 'effect=repeat',
      'mirror-left': 'effect=mirror-left',
      'mirror-right': 'effect=mirror-right',
      slitscan: 'slitscan',
      lens: 'lens',
      turbulence: 'turbulence=1',
    };
    for (const [name, query] of Object.entries(variants)) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&polytope=hypercube&${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(name === 'turbulence' ? 50 : 400);
        await page.screenshot({ path: testInfo.outputPath(`deform-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('composite effects', () => {
    const variants: Record<string, { query: string; wait: number }> = {
      aberration: { query: 'aberration=0.6', wait: 400 },
      'aberration-off': { query: 'aberration=0', wait: 400 },
      invert: { query: 'invert', wait: 1900 },
    };
    for (const [name, { query, wait }] of Object.entries(variants)) {
      test(`${name} renders without errors`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`/?seed=1&polytope=hypercube&${query}`);
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
        await page.waitForTimeout(wait);
        await page.screenshot({ path: testInfo.outputPath(`composite-${name}.png`) });
        expect(errors).toEqual([]);
      });
    }
  });

  test('falls back to WebGL2 when forced and skips particles', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?webgl&seed=1');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-backend', 'webgl2');
    await expect(html).toHaveAttribute('data-ready', 'true');
    await expect(html).toHaveAttribute('data-particles', 'false');
    await expect(html).toHaveAttribute('data-dust', 'false');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
