import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 5199;
const URL = `http://localhost:${PORT}`;
const POLYTOPES = ['hypercube', '24-cell', '120-cell', '600-cell'];
const VARIANTS = {
  'all on': '',
  'dof=0': 'dof=0',
  'motionBlur=0': 'motionBlur=0',
  'trails=0': 'trails=0',
  'particles=0': 'particles=0',
  'dust=0': 'dust=0',
  'faces=0': 'faces=0',
  'bloom=0': 'bloom=0',
};
const SETTLE_MS = 2600;

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('dev server did not start');
}

async function measure(page, polytope, query) {
  await page.goto(`${URL}/?seed=1&polytope=${polytope}&${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(() => {
    const d = document.documentElement.dataset;
    return {
      fps: d.fps,
      cpu: d.perfCpu,
      gpu: d.perfGpu,
      draws: d.perfDraws,
      tris: d.perfTriangles,
      vram: d.perfVram,
      scale: d.renderScale,
    };
  });
}

const server = spawn('pnpm', ['dev', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
try {
  await waitForServer();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const rows = [];
  for (const dpr of [1, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    for (const polytope of POLYTOPES) {
      for (const [name, query] of Object.entries(VARIANTS)) {
        if (name !== 'all on' && polytope !== '120-cell') continue;
        const m = await measure(page, polytope, query);
        rows.push(
          `| ${String(dpr)} | ${polytope} | ${name} | ${m.scale} | ${m.fps} | ${m.cpu} | ${m.gpu} | ${m.draws} | ${m.tris} | ${m.vram} |`,
        );
        process.stderr.write(`dpr${String(dpr)} ${polytope} ${name}\n`);
      }
    }
    await context.close();
  }
  await browser.close();
  console.log(
    '| DPR | polytope | variant | render scale | fps | cpu ms | gpu ms | draw calls | triangles | VRAM MB |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const row of rows) console.log(row);
} finally {
  server.kill();
}
