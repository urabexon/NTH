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

  test('falls back to WebGL2 when forced', async ({ page }) => {
    await page.goto('/?webgl');
    await expect(page.locator('html')).toHaveAttribute('data-backend', 'webgl2');
  });
});
