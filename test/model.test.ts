import { beforeEach, describe, expect, it } from 'vitest';
import { isToken, prompt, resolve, run, tokenize, type Line, type Output, type Token, type World } from '../src/model';
import { world } from '../src/content';

let w: World;
beforeEach(() => {
  w = world();
});

const text = (l: Line) => l.map((s) => (isToken(s) ? s.text : s)).join('');
const all = (o: Output) => o.lines.map(text).join('\n');
const toks = (o: Output) => o.lines.flat().filter(isToken);
const find = (o: Output, t: string): Token => {
  const k = toks(o).find((x) => x.text === t);
  if (!k) throw new Error(`no token ${t} in\n${all(o)}`);
  return k;
};
/** click a token with no verb waiting, the way the terminal does */
const click = (o: Output, t: string) => {
  const r = resolve(w, null, find(o, t));
  if (!r) throw new Error(`nothing to do for ${t}`);
  return run(w, r[0], r[1]);
};

describe('the spine flow', () => {
  it('boots to ls only and lists root', () => {
    expect(w.state.bar).toEqual(['ls']);
    const o = run(w, 'ls');
    expect(all(o)).toContain('readme');
    expect(o.lines.length).toBeLessThanOrEqual(5);
  });

  it('reads the readme, learns verbs from it, mounts PWR, starts the clock', () => {
    const ls = run(w, 'ls');
    const readme = click(ls, 'readme');
    expect(w.state.bar).toEqual(expect.arrayContaining(['ls', 'read', 'tail', 'mount', 'dev']));
    expect(prompt(w)).toBe('>');
    const pwr = click(readme, 'PWR');
    expect(w.state.mounted).toContain('PWR');
    expect(prompt(w)).toBe('sol 1 >');
    expect(all(pwr)).toContain('tools:');
    const inst = click(pwr, 'power*');
    expect(w.state.bar).toContain('power');
    expect(all(inst)).toContain('installed');
  });

  it('powers a part named in a tail, mounts it and grows the screen', () => {
    run(w, 'mount', 'PWR');
    run(w, 'install', 'PWR/power');
    const parts = run(w, 'power');
    expect(all(parts)).toContain('? off');
    const tail = run(w, 'tail', 'PWR/log');
    expect(tail.lines.length).toBeLessThanOrEqual(5);
    const on = click(tail, 'DSP');
    expect(all(on)).toContain('DSP on');
    expect(all(run(w, 'dev'))).toContain('DSP');
    const dsp = click(on, 'DSP');
    expect(w.state.mounted).toContain('DSP');
    const conf = click(dsp, 'term.conf');
    click(conf, '5');
    expect(w.state.rows).toBe(20);
  });

  it('never prints more rows than the screen has', () => {
    run(w, 'mount', 'MEM');
    for (const o of [run(w, 'ls'), run(w, 'dev'), run(w, 'read', 'MEM/ops.log'), run(w, 'tail', 'PWR/log')])
      expect(o.lines.length).toBeLessThanOrEqual(w.state.rows);
  });

  it('truncates with +N more and continues with more', () => {
    const o = run(w, 'read', 'PWR/log');
    expect(all(o)).toBe(all(o)); // PWR not mounted yet
    run(w, 'mount', 'PWR');
    const r = run(w, 'read', 'PWR/log');
    expect(text(r.lines[0])).toMatch(/\+3 more/);
    w.state.bar.push('more');
    const m = run(w, 'more');
    expect(all(m)).toContain('DSP held off');
  });

  it('a verb that waits takes only the nouns that fit', () => {
    const ls = run(w, 'ls');
    expect(resolve(w, 'read', find(ls, 'readme'))).toEqual(['read', '/readme']);
    expect(resolve(w, 'read', find(ls, 'bin/'))).toBeNull();
  });

  it('opens the map', () => {
    const o = run(w, 'map');
    expect(o.open).toContain('map');
  });

  it('turns unique names into tokens and leaves shared ones as text', () => {
    const l = tokenize(w, 'mount PWR and read log');
    expect(l.filter(isToken).map((t) => t.text)).toEqual(['mount', 'PWR', 'read']);
  });

  it('almanac sets the light and the cold prompt', () => {
    run(w, 'mount', 'PWR');
    run(w, 'mount', 'WX');
    run(w, 'read', 'WX/almanac');
    expect(prompt(w)).toBe('sol 1/22 >');
    w.state.sol = 18;
    expect(prompt(w)).toBe('sol 18/22 · cold >');
  });
});
