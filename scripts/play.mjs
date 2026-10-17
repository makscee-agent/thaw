// npm run play: click through the game headless, fail on the first dead end.
// Serves dist/ with vite preview (run `npm run build` first), opens it in Chromium with ?new&fast,
// and follows STEPS: each step clicks a bar verb or a token by its text and waits for the text it expects.
// Every slice extends STEPS so the whole game stays playable end to end.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

// a random port: workers on one machine run play at the same time
const PORT = Number(process.env.PLAY_PORT) || 4100 + Math.floor(Math.random() * 800);
// PLAY_URL=https://makscee.github.io/thaw/ npm run play checks a deployed build instead of dist/
const BASE = process.env.PLAY_URL ?? `http://localhost:${PORT}/`;
const URL = `${BASE}?new&fast`;

/** [kind, text, expect]: 'verb' clicks the bar, 'tok' the last token with that text, 'see' only waits,
 * 'eval' runs a function in the page (text), 'click' clicks a CSS selector */
export const STEPS = [
  ['see', null, 'shell ready'],
  ['verb', 'ls', 'readme'],
  ['tok', 'readme', 'mount PWR'],
  ['tok', 'PWR', 'tools:'],
  ['tok', 'power*', 'installed'],
  ['verb', 'power', '? off'],
  ['tok', 'ARM', 'arm*'],
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
  ['verb', 'tail', null],
  ['tok', 'ops.log', 'find us'],
  ['tok', 'readme', 'sorry'],
  ['verb', 'dev', 'WX'],
  ['tok', 'WX', 'almanac'],
  ['tok', 'almanac', '+41y'],
  ['tok', 'WX', 'exposure.log'],
  ['verb', 'tail', null],
  ['tok', 'exposure.log', 'IMG'],
  ['tok', 'IMG', 'IMG on'],
  ['tok', 'IMG', 'snap*'],
  // the scene (#1312): snap, the stored frames, arm the crate, NAV named in its manifest
  ['tok', 'snap*', 'installed'],
  ['tok', 'view*', 'installed'],
  ['verb', 'view', 'frame.1'],
  ['tok', 'frame.2', 'four of them'],
  ['verb', 'dev', 'ARM'],
  ['tok', 'ARM', 'arm*'],
  ['tok', 'arm*', 'installed'],
  ['verb', 'snap', null],
  ['tok', 'n', 'in view'],
  ['click', '.win-frame .tok[data-node="?crate"]', 'INS'],
  ['tok', 'INS', 'manifest'],
  ['tok', 'optics*', 'installed'],
  ['tok', 'manifest', 'NAV'],
  ['tok', 'NAV', 'NAV on'],
  // terrain and drive (#1313)
  ['verb', 'dev', 'nav'],
  ['tok', 'NAV', 'drive*'],
  ['tok', 'drive*', 'installed'],
  ['verb', 'dev', 'nav'],
  ['tok', 'NAV', 'waypoints'],
  ['tok', 'terrain', '1 km'],
  ['tok', 'waypoints', 'HAB 3.0 km bearing 040'],
  ['tok', 'HAB 3.0 km bearing 040', 'driving'],
  ['see', null, 'arrived'],
  ['verb', 'snap', null],
  ['tok', 'n', '96 px'],
  ['verb', 'dev', 'habitat'],
  ['tok', 'here', 'driving'],
  ['see', null, 'on the bus: WX'],
  ['tok', 'forest', 'T  /'],
  ['verb', 'dev', 'RADIO'],
  ['tok', 'RADIO', 'send*'],
  ['tok', 'send*', 'installed'],
  ['verb', 'send', 'no uplink key'],
  // SHORTCUT until arm (#1312) and the content (#1314) land (drive is in, but RLY is named nowhere yet): put T at the relay with the key, the firmware
  // and three facts, as the HAB, LDR and RLY steps will. Replace it with those steps.
  ['eval', () => {
    const s = window.thaw.w.state;
    s.mounted.push('HAB', 'LDR');
    s.installed.push('HAB/keys/uplink', 'LDR/relay.fw');
    s.position = '@RLY';
    s.armed.push('?mast');
    s.facts.push('!coords', '!pods', '!kaja');
  }, null],
  // at the relay: the mast in frame, the camera open, send from inside it
  ['verb', 'snap', null],
  ['tok', 'e', 'in view: mast'],
  ['eval', () => {
    window.thaw.w.state.bar.push('cam');
    window.thaw.term.drawBar();
  }, null],
  ['verb', 'cam', 'cam open'],
  ['verb', 'send', 'packet  0/64 bytes'],
  ['tok', 'habitat at 12.4S 103.7E', '18/64'],
  ['tok', '4 pods 3 nominal', '36/64'],
  ['tok', 'transmit', 'rescue launched'],
  ['see', null, 'again'],
  ['click', '.end-again', 'shell ready'],
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
    const where = `step ${n} ${kind} ${typeof text === 'function' ? '' : text ?? ''}`;
    try {
      await idle();
      if (kind === 'verb') await page.locator(`.bar [data-verb="${text}"]`).click({ timeout: 3000 });
      if (kind === 'tok') await page.locator(`.tok:not(.dim):not(.btn)[data-tok="${text}"]`).last().click({ timeout: 3000 });
      if (kind === 'eval') await page.evaluate(text);
      if (kind === 'click') await page.locator(text).click({ timeout: 3000 });
      await idle();
      if (expect) await page.waitForFunction((t) => document.body.innerText.includes(t), expect, { timeout: 3000 });
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
