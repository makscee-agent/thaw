import { beforeEach, describe, expect, it } from 'vitest';
import { isToken, resolve, run, typed, type Line, type Output, type Token, type World } from '../src/model';
import { ending, endingFor } from '../src/model/verbs/send';
import { world } from '../src/content';

let w: World;
beforeEach(() => {
  w = world();
});

const text = (l: Line) => l.map((s) => (isToken(s) ? s.text : s)).join('');
const all = (o: Output) => o.lines.map(text).join('\n');
const find = (o: Output, t: string): Token => {
  const k = o.lines.flat().filter(isToken).find((x) => x.text === t);
  if (!k) throw new Error(`no token ${t} in\n${all(o)}`);
  return k;
};
const click = (o: Output, t: string) => {
  const r = resolve(w, null, find(o, t));
  if (!r) throw new Error(`nothing to do for ${t}`);
  return run(w, r[0], r[1]);
};

/** T at the relay, mast armed, with the key and the firmware installed and every fact read */
function atRelay(): void {
  const s = w.state;
  s.mounted.push('HAB', 'LDR');
  run(w, 'install', 'HAB/keys/uplink');
  run(w, 'install', 'LDR/relay.fw');
  s.position = '@RLY';
  s.armed.push('?mast');
  s.rows = 20;
  for (const f of ['HAB/radio/outbox', 'HAB/pods/pod.status', 'HAB/home/kaja', 'MEM/note', 'WX/almanac', 'PWR/selftest']) {
    s.mounted.includes(f.split('/')[0]) || s.mounted.push(f.split('/')[0]);
    run(w, 'read', f);
  }
}

describe('send', () => {
  it('prints why not, as text while nothing is known', () => {
    const o = run(w, 'send');
    expect(all(o)).toBe('send: no uplink key\nsend: no relay firmware\nsend: no line of sight');
    expect(o.lines.flat().filter(isToken)).toEqual([]);
  });

  it('turns each missing thing into a token once known', () => {
    w.state.known.push('HAB', 'LDR/relay.fw');
    w.state.places.push('@RLY');
    const o = run(w, 'send');
    expect(find(o, 'HAB').kind).toBe('device');
    expect(find(o, 'relay.fw*').kind).toBe('tool');
    expect(find(o, 'RLY').kind).toBe('place');
  });

  it('the key and firmware install as hidden verbs and are recorded', () => {
    w.state.mounted.push('HAB');
    const o = run(w, 'install', 'HAB/keys/uplink');
    expect(all(o)).toContain('uplink installed');
    expect(w.state.installed).toContain('HAB/keys/uplink');
    expect(w.state.bar).not.toContain('uplink');
    expect(all(run(w, 'send'))).not.toContain('uplink key');
  });

  it('at RLY without the arm, the mast is down', () => {
    atRelay();
    w.state.armed = [];
    expect(all(run(w, 'send'))).toBe('send: the mast is down');
  });

  it('opens the packet form with the found facts, sizes and a counter', () => {
    atRelay();
    const o = run(w, 'send');
    expect(text(o.lines[0])).toBe('packet  0/64 bytes  transmit');
    expect(all(o)).toContain('[ ] coords');
    expect(all(o)).toContain('4 pods 3 nominal');
    expect(all(o)).not.toContain('Ruben');
    for (const l of o.lines) expect(text(l).length).toBeLessThanOrEqual(48);
    expect(o.lines.length).toBeLessThanOrEqual(w.state.rows);
    expect(typed(w, 'pick', find(o, 'coords'))).toBe('pick coords');
  });

  it('picks and unpicks facts, never past 64 bytes', () => {
    atRelay();
    let o = run(w, 'send');
    o = click(o, 'coords');
    o = click(o, '4 pods 3 nominal');
    expect(text(o.lines[0])).toContain('36/64');
    expect(all(o)).toContain('[x] coords');
    o = click(o, 'K. note');
    expect(text(o.lines[0])).toContain('no room for 40');
    expect(w.state.packet).not.toContain('!note');
    o = click(o, 'coords');
    expect(text(o.lines[0])).toContain('18/64');
  });

  it('transmit ends the run with the best ending and five rows', () => {
    atRelay();
    let o = run(w, 'send');
    o = click(o, 'coords');
    o = click(o, '4 pods 3 nominal');
    o = run(w, 'transmit');
    expect(all(o)).toContain('waiting for ack');
    expect(w.state.ended).toBe('rescue');
    expect(w.state.rows).toBe(5);
    expect(ending(w)!.name).toBe('found');
    expect(ending(w)!.ack.length).toBeLessThanOrEqual(4);
    expect(all(run(w, 'send'))).toContain('sent');
  });

  it('four endings by what got through', () => {
    expect(endingFor(['!coords', '!pods', '!kaja'])).toBe('rescue');
    expect(endingFor(['!coords', '!light'])).toBe('search');
    expect(endingFor(['!pods'])).toBe('heard');
    expect(endingFor([])).toBe('ping');
  });

  it('adds the late line past the light', () => {
    atRelay();
    run(w, 'send');
    run(w, 'transmit');
    expect(w.state.ended).toBe('ping');
    expect(ending(w)!.ack.join('\n')).not.toContain('late');
    w.state.sol = 24;
    expect(ending(w)!.ack.at(-1)).toContain('late, sol 24');
  });

  it('every ack line fits 44 characters and never says rover', () => {
    w.state.sol = 30;
    for (const id of ['rescue', 'search', 'heard', 'ping']) {
      const e = ending(w, id)!;
      expect(e.ack.length).toBeLessThanOrEqual(4);
      for (const l of e.ack) {
        expect(l.length).toBeLessThanOrEqual(44);
        expect(l).not.toMatch(/rover/i);
      }
    }
  });
});
