import { beforeEach, describe, expect, it } from 'vitest';
import { isToken, resolve, run, type Output, type World } from '../src/model';
import { world } from '../src/content';
import { dither, shrink, smear } from '../src/scene/dither';

let w: World;
beforeEach(() => {
  w = world();
  w.state.sol = 1;
});

const all = (o: Output) => o.lines.map((l) => l.map((s) => (isToken(s) ? s.text : s)).join('')).join('\n');
const things = (o: Output) => o.lines.flat().filter(isToken).filter((t) => t.kind === 'thing');

describe('looking', () => {
  it('snap n frames the things at the place as ? tokens, opens FRAME, keeps the heading', () => {
    const o = run(w, 'snap', 'e');
    expect(w.state.heading).toBe(90);
    expect(o.open).toContain('frame');
    expect(w.state.windows).toContain('frame');
    expect(w.state.frame?.res).toBe(32);
    const t = things(o);
    expect(t.map((x) => x.text)).toEqual(['?', '?']);
    expect(t.map((x) => x.nodeId).sort()).toEqual(['?crate', '?rock']);
  });

  it('arm names a thing in the frame, costs one sol once, puts its drive on the bus', () => {
    const snap = run(w, 'snap', 'n');
    const crate = things(snap).find((t) => t.nodeId === '?crate')!;
    expect(resolve(w, null, crate)).toEqual(['arm', '?crate']);
    expect(resolve(w, 'arm', crate)).toEqual(['arm', '?crate']);
    const o = run(w, 'arm', '?crate');
    expect(all(o)).toContain('crate');
    expect(all(o)).toContain('INS');
    expect(w.state.sol).toBe(2);
    expect(all(run(w, 'dev'))).toContain('INS');
    run(w, 'arm', '?crate');
    expect(w.state.sol).toBe(2);
    expect(all(run(w, 'snap', 'n'))).toContain('crate');
  });

  it('arm reaches only what is in the current frame', () => {
    expect(all(run(w, 'arm', '?crate'))).toContain('not in the frame');
    expect(w.state.armed).toEqual([]);
    expect(resolve(w, 'arm', { text: '?', kind: 'thing', nodeId: '?lander' })).toBeNull();
  });

  it('frames are 96 px once optics are installed', () => {
    w.state.bar.push('optics');
    run(w, 'snap', 's');
    expect(w.state.frame?.res).toBe(96);
  });

  it('view lists the stored frames, a frame file click views it', () => {
    expect(all(run(w, 'view'))).toContain('IMG not mounted');
    w.state.powered.push('IMG');
    run(w, 'mount', 'IMG');
    const list = run(w, 'view');
    const names = list.lines.flat().filter(isToken).map((t) => t.text);
    expect(names).toEqual(['land.img', 'crew.img', 'wave.img']);
    const crew = list.lines.flat().filter(isToken)[1];
    expect(resolve(w, null, crew)).toEqual(['view', 'IMG/frames/crew.img']);
    const o = run(w, 'view', 'IMG/frames/crew.img');
    expect(o.open).toContain('frame');
    expect(w.state.frame?.still).toBe('crew');
  });

  it('cam opens and closes the full screen camera', () => {
    run(w, 'cam');
    expect(w.state.windows).toContain('cam');
    run(w, 'cam');
    expect(w.state.windows).not.toContain('cam');
  });
});

describe('the frame bits', () => {
  it('dithers to one bit with the share of white following the grey', () => {
    const res = 32;
    for (const g of [0, 64, 128, 192, 255]) {
      const d = dither(new Uint8Array(res * res).fill(g), res, 2);
      expect(new Set(d).size).toBeLessThanOrEqual(2);
      const white = d.filter((v) => v === 255).length / d.length;
      expect(Math.abs(white - g / 255)).toBeLessThan(0.07);
    }
  });

  it('dithers to four greys at 96', () => {
    const res = 96;
    const grad = new Uint8Array(res * res).map((_, i) => Math.round(((i % res) / (res - 1)) * 255));
    expect([...new Set(dither(grad, res, 4))].sort((a, b) => a - b)).toEqual([0, 85, 170, 255]);
  });

  it('shrinks by averaging and smears only sideways', () => {
    const big = new Uint8Array(16).map((_, i) => (i % 4 < 2 ? 0 : 255));
    expect([...shrink(big, 4, 2)]).toEqual([0, 255, 0, 255]);
    const col = new Uint8Array(9).map((_, i) => (i % 3 === 1 ? 255 : 0));
    expect([...smear(col, 3, 1)]).toEqual([85, 85, 85, 85, 85, 85, 85, 85, 85]);
  });
});
