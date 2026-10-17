// npm run play: click through the game headless, fail on the first dead end.
// Serves dist/ with vite preview (run `npm run build` first), opens it in Chromium with ?new&fast,
// and follows STEPS: each step clicks a bar verb or a token by its text and waits for the text it expects.
// Every slice extends STEPS so the whole game stays playable end to end.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
// PLAY_URL=https://makscee.github.io/thaw/ npm run play checks a deployed build instead of dist/
const BASE = process.env.PLAY_URL ?? `http://localhost:${PORT}/`;
const URL = `${BASE}?new&fast`;

/** [kind, text, expect]: 'verb' clicks the bar, 'tok' the last token with that text, 'see' only waits */
export const STEPS = [
  ['see', null, 'shell ready'],
  ['verb', 'ls', 'readme'],
  ['tok', 'readme', 'mount PWR'],
  ['tok', 'PWR', 'tools:'],
  ['tok', 'power*', 'installed'],
  ['verb', 'power', '? off'],
  ['tok', 'PWR', 'spec'],
  ['verb', 'tail', null],
  ['tok', 'log', 'DSP'],
  ['tok', 'DSP', 'DSP on'],
  ['tok', 'DSP', 'term.conf'],
  ['tok', 'term.conf', 'rows='],
  ['tok', '5', 'display ok'],
  ['verb', 'ls', 'readme'],
  ['tok', 'readme', 'MEM'],
  ['tok', 'MEM', 'map*'],
  ['tok', 'map*', 'installed'],
  ['verb', 'map', 'map open'],
];

const server = process.env.PLAY_URL ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
process.on('exit', () => server?.kill());

async function main() {
  if (server)
    await new Promise((ok, fail) => {
      server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok());
      server.on('exit', (c) => fail(new Error(`vite preview exited ${c}; did you npm run build?`)));
    });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  const idle = () => page.waitForFunction(() => document.body.dataset.busy === '0', null, { timeout: 15000 });
  let n = 0;
  for (const [kind, text, expect] of STEPS) {
    n++;
    const where = `step ${n} ${kind} ${text ?? ''}`;
    try {
      await idle();
      if (kind === 'verb') await page.locator(`.bar [data-verb="${text}"]`).click({ timeout: 3000 });
      if (kind === 'tok') await page.locator(`.tok:not(.dim):not(.btn)[data-tok="${text}"]`).last().click({ timeout: 3000 });
      await idle();
      if (expect) await page.waitForFunction((t) => document.querySelector('#desk').innerText.includes(t), expect, { timeout: 3000 });
      if (errors.length) throw new Error(errors.join('\n'));
    } catch (e) {
      mkdirSync('out', { recursive: true });
      await page.screenshot({ path: 'out/play-fail.png' });
      console.error(`play: dead end at ${where}${expect ? `, expected "${expect}"` : ''}\n${String(e).split('\n')[0]}`);
      console.error('screen:\n' + (await page.locator('#desk').innerText()));
      await browser.close();
      process.exit(1);
    }
  }
  mkdirSync('out', { recursive: true });
  await page.screenshot({ path: 'out/play-end.png' });
  console.log(`play: ${STEPS.length} steps ok`);
  await browser.close();
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
