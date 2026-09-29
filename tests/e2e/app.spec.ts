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

    test('Space switches to a different polytope', async ({ page }) => {
      await page.goto('/?seed=1');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-ready', 'true');
      const before = await html.getAttribute('data-polytope');
      await page.keyboard.press('Space');
      await expect(html).not.toHaveAttribute('data-polytope', before ?? '');
    });
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
      await page.waitForTimeout(2500);
      const fps = Number(await html.getAttribute('data-fps'));
      console.info(`[e2e] 120-cell fps: ${String(fps)}`);
      expect(fps).toBeGreaterThanOrEqual(50);
    });
  });

  test('falls back to WebGL2 when forced', async ({ page }) => {
    await page.goto('/?webgl');
    await expect(page.locator('html')).toHaveAttribute('data-backend', 'webgl2');
  });
});
