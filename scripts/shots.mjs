// node scripts/shots.mjs: render every place and direction, the stored frames, into out/shots.html (needs npm run build)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4180;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
process.on('exit', () => server.kill());
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok()));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error(String(e)));
await page.goto(`http://localhost:${PORT}/?new&fast`);
await page.waitForFunction(() => window.thaw);
const html = await page.evaluate(() => {
  const { render, still } = window.thaw.scene;
  const img = (s, res) => {
    const c = document.createElement('canvas');
    c.width = c.height = res;
    const x = c.getContext('2d');
    const d = x.createImageData(res, res);
    for (let i = 0; i < res * res; i++) {
      const lit = s.things.some((t) => t.mask[i]);
      d.data[i * 4] = lit ? 255 : s.pixels[i];
      d.data[i * 4 + 1] = lit ? Math.min(176, s.pixels[i]) : s.pixels[i];
      d.data[i * 4 + 2] = lit ? 0 : s.pixels[i];
      d.data[i * 4 + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL();
  };
  let h = '<body style="background:#111;color:#ccc;font:14px monospace">';
  for (const place of ['@here', '@LDR', '@T-2', '@HAB', '@RLY'])
    for (const res of [32, 96]) {
      h += `<div>${place} ${res}</div><div style="display:flex;gap:8px">`;
      for (const heading of [0, 90, 180, 270]) {
        const s = render({ place, heading, res });
        h += `<figure><img src="${img(s, res)}" width=256 style="image-rendering:pixelated"><figcaption>${heading} ${s.things.map((t) => t.id).join(' ')}</figcaption></figure>`;
      }
      h += '</div>';
    }
  h += '<div>blur, stills</div><div style="display:flex;gap:8px">';
  const b = render({ place: '@here', heading: 0, res: 32, blur: true });
  h += `<img src="${img(b, 32)}" width=256 style="image-rendering:pixelated">`;
  for (const n of ['land', 'crew', 'wave']) h += `<img src="${img(still(n), 32)}" width=256 style="image-rendering:pixelated">`;
  return h + '</div>';
});
mkdirSync('out', { recursive: true });
writeFileSync('out/shots.html', html);
await browser.close();
process.exit(0);
