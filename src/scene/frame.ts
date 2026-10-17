// FRAME (DESIGN 3, 8): the last picture, scanned in top to bottom, the direction and the `?`
// tokens under it; hovering a thing's token lights its pixels. Also opens and closes CAM.

import type { Term } from '../term';
import { dirName, setEye, thingTok } from '../model/verbs/look';
import type { Token, World } from '../model';
import * as windows from '../windows';
import { renderLine } from '../term/render';
import { cam, closeCam, render, still, type Shot } from '.';

const SCAN_MS = new URLSearchParams(location.search).has('fast') ? 0 : 1000;
const AMBER = [255, 176, 0];

let drawn = '';
let shot: Shot | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let res = 32;
let lit: string | null = null;
let scan = 1;
let camOn = false;
/** the eye's last render, so a snap renders once */
let eyeShot: { key: string; shot: Shot } | null = null;
const viewKey = (v: { place: string; heading: number; res: number; blur?: boolean; at?: [number, number] }) => `${v.place} ${v.heading} ${v.res} ${!!v.blur} ${v.at ?? ''}`;

function paint(): void {
  if (!ctx || !shot) return;
  const img = ctx.createImageData(res, res);
  const mask = lit ? shot.things.find((t) => t.id === lit)?.mask : undefined;
  const rows = Math.ceil(res * scan);
  for (let i = 0; i < res * res; i++) {
    const on = i < rows * res;
    const v = on ? shot.pixels[i] : 0;
    const a = mask?.[i] && on;
    img.data[i * 4] = a ? (AMBER[0] * (64 + v)) / 319 : v * 0.85;
    img.data[i * 4 + 1] = a ? (AMBER[1] * (64 + v)) / 319 : v * 0.85;
    img.data[i * 4 + 2] = a ? 0 : v * 0.8;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function draw(w: World, animate: boolean): void {
  const f = w.state.frame;
  if (!f) return;
  const key = JSON.stringify(f);
  if (key !== drawn) {
    drawn = key;
    const v = { place: f.place, heading: f.heading, res: f.res, blur: f.blur, at: f.at };
    shot = f.still ? still(f.still) : eyeShot?.key === viewKey(v) ? eyeShot.shot : render(v);
    res = f.still ? 32 : f.res;
    const el = document.createElement('div');
    el.className = 'frame';
    const c = document.createElement('canvas');
    c.width = c.height = res;
    ctx = c.getContext('2d');
    const under = document.createElement('div');
    under.className = 'under';
    el.append(c, under);
    windows.update('frame', el);
    lit = null;
    scan = animate && SCAN_MS ? 0 : 1;
    paint();
    if (scan < 1) {
      const t0 = performance.now();
      const step = () => {
        scan = Math.min(1, (performance.now() - t0) / SCAN_MS);
        paint();
        if (scan < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }
  // the line under the frame: direction and things, redrawn so armed things show their names
  const under = windows.body('frame').querySelector('.under');
  if (!under) return;
  under.replaceChildren(renderLine(f.still ? [`stored  ${f.still}`] : [`${dirName(f.heading)}  `, ...f.things.flatMap((id) => ['  ', thingTok(w, id)])]));
  for (const el of under.querySelectorAll<HTMLElement & { tok?: Token }>('.tok')) if (el.tok?.nodeId) el.dataset.node = el.tok.nodeId;
}

function syncCam(w: World): void {
  const want = w.state.windows.includes('cam');
  if (want === camOn) return;
  camOn = want;
  if (want) void cam(w.state.position, w.state.heading);
  else closeCam();
}

/** wire the scene into the terminal: the eye for snap, FRAME redraws, CAM */
export function hookFrame(term: Term): void {
  setEye((v) => {
    eyeShot = { key: viewKey(v), shot: render(v) };
    return eyeShot.shot.things.map((t) => t.id);
  });
  term.after.push(() => {
    draw(term.w, true);
    syncCam(term.w);
  });
  if (term.w.state.frame && term.w.state.windows.includes('frame')) {
    windows.open('frame');
    draw(term.w, false);
  }
  syncCam(term.w);
  // hover a thing's token anywhere: its pixels light in the frame
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest('.tok') as (HTMLElement & { tok?: Token }) | null;
    const id = el?.tok?.kind === 'thing' ? el.tok.nodeId ?? null : null;
    if (id === lit) return;
    lit = id;
    paint();
  });
}
