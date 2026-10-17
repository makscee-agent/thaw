// dev, mount, power: the bus and your parts (DESIGN 7).

import { bus, isOn, say, tok, verb } from '../commands';
import type { Line, Node, Seg, World } from '../world';
import { listing, lsBody, markListed } from './files';

const dev = (w: World, id?: string) => (id ? w.nodes[id] : undefined);

function stateOf(w: World, n: Node): string {
  if (w.state.mounted.includes(n.id)) return 'mounted';
  if (n.device!.bus === 'ext') return 'ext';
  return isOn(w, n) ? 'on' : 'off';
}

/** flow pairs of [token, text] like flow does single segments */
function flow2(items: (Seg | Seg[])[]): Line[] {
  const width = (i: Seg | Seg[]) => (Array.isArray(i) ? i : [i]).reduce((a, s) => a + (typeof s === 'string' ? s : s.text).length, 0);
  const lines: Line[] = [];
  let line: Seg[] = [];
  let len = 0;
  for (const it of items) {
    const n = width(it);
    if (len && len + 2 + n > 48) {
      lines.push(line);
      line = [];
      len = 0;
    }
    if (len) {
      line.push('  ');
      len += 2;
    }
    line.push(...(Array.isArray(it) ? it : [it]));
    len += n;
  }
  if (line.length) lines.push(line);
  return lines;
}

verb('dev', {
  takes: 'none',
  run(w) {
    const list = bus(w);
    const lines: Line[] = [];
    for (let i = 0; i < list.length; i += 2) {
      const line: Seg[] = [];
      for (const n of list.slice(i, i + 2)) {
        if (line.length) line.push('  ');
        line.push(tok(w, n), ' '.repeat(Math.max(1, 6 - n.name.length)) + n.device!.label.padEnd(9) + stateOf(w, n).padEnd(7));
      }
      lines.push(line);
    }
    return { lines: [[`bus  ${list.length} devices`], ...lines], header: true };
  },
});

verb('mount', {
  takes: 'noun',
  fits: (w, t) => {
    const n = dev(w, t.nodeId);
    return !!n?.device && bus(w).includes(n);
  },
  run(w, id) {
    const n = dev(w, id);
    if (!n?.device) return say(`mount: no device ${id}`);
    if (!isOn(w, n)) return say(`mount: ${n.name} is off`);
    if (!bus(w).includes(n)) return say(`mount: ${n.name} not on the bus`);
    const s = w.state;
    const fresh = !s.mounted.includes(n.id);
    if (fresh) s.mounted.push(n.id);
    if (n.device.startsClock && !s.sol) s.sol = 1;
    markListed(w, n);
    const out = listing(w, n, lsBody(w, n));
    if (fresh) out.cues = ['mount'];
    return out;
  },
});

verb('power', {
  takes: 'optional',
  fits: (w, t) => {
    const n = dev(w, t.nodeId);
    return !!n?.device && n.device.bus === 'internal' && !isOn(w, n);
  },
  run(w, id) {
    const s = w.state;
    const parts = Object.values(w.nodes).filter((n) => n.device?.bus === 'internal');
    if (!id) {
      const items: (Seg | Seg[])[] = parts.map((n): Seg | Seg[] => {
        if (!isOn(w, n) && !s.known.includes(n.id)) return '? off';
        return [tok(w, n), isOn(w, n) ? ' on' : ' off'];
      });
      return { lines: [['power  parts'], ...flow2(items)], header: true };
    }
    const n = dev(w, id);
    if (!n?.device || n.device.bus !== 'internal') return say(`power: no part ${id}`);
    if (isOn(w, n)) return say(`power: ${n.name} is on`);
    s.powered.push(n.id);
    return { lines: [[`${n.name} on · ${n.device.label}`], ['on the bus: ', tok(w, n)]], cues: ['power'] };
  },
});
