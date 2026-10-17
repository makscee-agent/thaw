// send, pick, transmit: the message and the end (DESIGN 11).
// send prints why not until T is at RLY with the mast armed and the key and firmware installed;
// then it opens the packet form: the found facts as toggles, a byte counter, transmit.
// transmit sets state.ended; src/end plays the end sequence from there.

import { say, tok, verb } from '../commands';
import type { Line, Output, Seg, Token, World } from '../world';

export const PACKET = 64;
export const KEY = 'HAB/keys/uplink';
export const FIRMWARE = 'LDR/relay.fw';
export const MAST = '?mast';
export const RELAY = '@RLY';

export interface Ending {
  id: 'rescue' | 'search' | 'heard' | 'ping';
  /** the end card's title */
  name: string;
  /** the acknowledgment, typed in on five rows: at most four lines */
  ack: string[];
}

const ENDINGS: Record<Ending['id'], Omit<Ending, 'id'>> = {
  rescue: {
    name: 'found',
    ack: ['ack from home. packet whole.', 'coordinates fixed. four pods located.', 'rescue launched. hold on, T.'],
  },
  search: {
    name: 'a slow search',
    ack: ['ack from home. packet whole.', 'coordinates fixed. no word of the crew.', 'a search will sweep the site. hold, T.'],
  },
  heard: {
    name: 'origin unknown',
    ack: ['ack from home. signal heard.', 'origin unknown. we will look.', 'keep calling, T.'],
  },
  ping: {
    name: 'something is alive',
    ack: ['ack from home. a ping, no packet.', 'something is alive out there.', 'we are listening.'],
  },
};

/** the ending for what got through, plus the late line past the light */
export function ending(w: World, id = w.state.ended): Ending | null {
  if (!id || !(id in ENDINGS)) return null;
  const e = ENDINGS[id as Ending['id']];
  const s = w.state;
  const ack = [...e.ack];
  if (s.sol > (s.light || 22)) ack.push(`sent late, sol ${s.sol}. we heard it anyway.`);
  return { id: id as Ending['id'], name: e.name, ack };
}

/** which ending a packet earns: coords and pods, coords alone, anything, nothing */
export function endingFor(picked: string[]): Ending['id'] {
  const coords = picked.includes('!coords');
  if (coords && picked.includes('!pods')) return 'rescue';
  if (coords) return 'search';
  return picked.length ? 'heard' : 'ping';
}

const used = (w: World, picked: string[]) => picked.reduce((a, id) => a + (w.nodes[id]?.fact?.size ?? 0), 0);

/** a node as a token when the player knows it, else its name as text */
const known = (w: World, id: string): Seg | null => (w.state.known.includes(id) && w.nodes[id] ? tok(w, w.nodes[id]) : null);

/** why send can't work yet, one line each; empty when it can */
export function missing(w: World): Line[] {
  const s = w.state;
  const out: Line[] = [];
  if (!s.installed.includes(KEY)) {
    const where = known(w, KEY) ?? known(w, 'HAB/keys') ?? known(w, 'HAB');
    out.push(where ? ['send: no uplink key  ', where] : ['send: no uplink key']);
  }
  if (!s.installed.includes(FIRMWARE)) {
    const where = known(w, FIRMWARE) ?? known(w, 'LDR');
    out.push(where ? ['send: no relay firmware  ', where] : ['send: no relay firmware']);
  }
  if (s.position !== RELAY) {
    const where = s.places.includes(RELAY) ? tok(w, w.nodes[RELAY]) : known(w, RELAY);
    out.push(where ? ['send: no line of sight  ', where] : ['send: no line of sight']);
  } else if (!s.armed.includes(MAST)) {
    const where = known(w, MAST);
    out.push(where ? ['send: the mast is down  ', where] : ['send: the mast is down']);
  }
  return out;
}

const CELL = 24;

/** the packet form: header with the counter and transmit, then the found facts two to a line */
export function form(w: World): Output {
  const s = w.state;
  const picked = s.packet ?? [];
  const n = used(w, picked);
  const head: Line = [`packet  ${n}/${PACKET} bytes  `, { text: 'transmit', kind: 'verb', arg: 'transmit' }];
  const cells: Seg[][] = s.facts
    .map((id) => w.nodes[id])
    .filter((f) => f?.fact)
    .map((f) => {
      const t: Token = { text: f.fact!.label, kind: 'fact', nodeId: f.id };
      const size = String(f.fact!.size);
      const mark = picked.includes(f.id) ? '[x] ' : '[ ] ';
      return [mark, t, ' '.repeat(Math.max(1, CELL - 2 - mark.length - t.text.length - size.length)) + size];
    });
  const two = cells.every((c) => c.reduce((a, x) => a + (typeof x === 'string' ? x : x.text).length, 0) <= CELL - 2);
  const body: Line[] = [];
  if (!cells.length) body.push(['no facts found. transmit sends a ping.']);
  for (let i = 0; i < cells.length; i += two ? 2 : 1)
    body.push(two && cells[i + 1] ? [...cells[i], '  ', ...cells[i + 1]] : cells[i]);
  return { lines: [head, ...body], header: true };
}

verb('send', {
  takes: 'none',
  run(w) {
    const s = w.state;
    if (s.ended) return say('send: sent. the line is quiet.');
    const why = missing(w);
    if (why.length) return { lines: why };
    s.packet ??= [];
    return form(w);
  },
});

verb('pick', {
  takes: 'noun',
  hidden: true,
  fits: (w, t) => t.kind === 'fact' && w.state.packet !== null,
  run(w, id) {
    const s = w.state;
    const f = id ? w.nodes[id] : undefined;
    if (!f?.fact || !s.facts.includes(f.id)) return say(`pick: no fact ${id}`);
    if (!s.packet || s.ended) return say('pick: the packet form is closed');
    if (s.packet.includes(f.id)) s.packet = s.packet.filter((x) => x !== f.id);
    else if (used(w, s.packet) + f.fact.size > PACKET) {
      const out = form(w);
      out.lines[0] = [...out.lines[0], `  no room for ${f.fact.size}`];
      return out;
    } else s.packet.push(f.id);
    return form(w);
  },
});

verb('transmit', {
  takes: 'none',
  hidden: true,
  run(w) {
    const s = w.state;
    if (s.ended) return say('transmit: sent. the line is quiet.');
    const why = missing(w);
    if (why.length) return { lines: why };
    const picked = s.packet ?? [];
    s.ended = endingFor(picked);
    s.packet = null;
    s.rows = 5;
    return { lines: [[`transmit  ${used(w, picked)}/${PACKET} bytes`], ['RLY up. line of sight.'], ['waiting for ack']], header: true, cues: ['beep'] };
  },
});

// the key and the firmware: installing them is all they do
verb('uplink', { takes: 'none', hidden: true, run: (w) => say(w.state.installed.includes(KEY) ? 'uplink: key loaded' : 'uplink: no key') });
verb('relay', { takes: 'none', hidden: true, run: (w) => say(w.state.installed.includes(FIRMWARE) ? 'relay: firmware ready' : 'relay: no firmware') });
