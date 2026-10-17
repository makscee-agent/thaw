// drive, arrive: places and moving (DESIGN 9, 10). `map P` puts a place on the terrain layer.
//
// `drive P` starts a trip and prints the driving line; the trip runs in real time (src/map/trip.ts
// slides the dot) and then runs the hidden `arrive`, which moves T, refreshes the bus by place
// and advances the sol.

import { bus, say, tok, tokenize, verb } from '../commands';
import type { Line, Output, Seg, Token, World } from '../world';

/** how long a drive takes in real time; the seat tunes it by feel */
export const TRIP = { ms: 10_000 };

/** a drive costs one sol per 1.5 km along the straight line, on the distance shown (to 0.1 km) */
export const cost = (km: number): number => Math.ceil(Math.round(km * 10) / 10 / 1.5 - 1e-9);

const xy = (w: World, id: string): [number, number] => {
  const p = w.nodes[id]?.place;
  return p ? [p.x, p.y] : [0, 0];
};

export function km(w: World, a: string, b: string): number {
  const [ax, ay] = xy(w, a);
  const [bx, by] = xy(w, b);
  return Math.hypot(bx - ax, by - ay);
}

/** degrees from a to b, 0 = north, clockwise */
export function bearing(w: World, a: string, b: string): number {
  const [ax, ay] = xy(w, a);
  const [bx, by] = xy(w, b);
  return Math.round(((Math.atan2(bx - ax, by - ay) * 180) / Math.PI + 360) % 360);
}

/** where T is right now, km east/north of the wake point, mid-road while a drive is under way */
export function where(w: World, now = Date.now()): [number, number] {
  const t = w.state.trip;
  if (!t) return xy(w, w.state.position);
  const f = t.ms ? Math.min(1, Math.max(0, (now - t.at) / t.ms)) : 1;
  const [ax, ay] = xy(w, t.from);
  const [bx, by] = xy(w, t.to);
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}

const isPlace = (w: World, id?: string) => !!id && w.nodes[id]?.kind === 'place';
const placeTok = (w: World, id: string): Token => ({ ...tok(w, w.nodes[id]), kind: 'place' });
const fmt = (n: number) => n.toFixed(1);

/** a place becomes a dot on the terrain layer */
export function know(w: World, id: string): boolean {
  if (w.state.places.includes(id)) return false;
  w.state.places.push(id);
  return true;
}

/** `map P`: a clicked place line puts the place on the terrain layer */
export function mark(w: World, id: string): Output {
  if (!isPlace(w, id)) return say(`map: no place ${id}`);
  know(w, id);
  w.state.layer = 'terrain';
  const d = km(w, w.state.position, id);
  return { lines: [[placeTok(w, id), `  on the map  ${fmt(d)} km`]], open: ['map'] };
}

/** the places in the NAV waypoints, once NAV is mounted */
function waypoints(w: World): string[] {
  if (!w.state.mounted.includes('NAV')) return [];
  const lines = w.nodes['NAV/waypoints']?.lines?.lines ?? [];
  return lines.flatMap((l) => tokenize(w, l)).flatMap((s) => (typeof s !== 'string' && s.kind === 'place' ? [s.nodeId!] : []));
}

verb('drive', {
  takes: 'optional',
  fits: (_w, t) => t.kind === 'place',
  run(w, id) {
    const s = w.state;
    if (!id) {
      for (const p of waypoints(w)) know(w, p);
      const lines: Line[] = s.places.map((p) => {
        if (p === s.position) return [placeTok(w, p), '  you are here'];
        return [placeTok(w, p), `  ${fmt(km(w, s.position, p))} km  bearing ${String(bearing(w, s.position, p)).padStart(3, '0')}`];
      });
      return { lines: [[`drive  ${s.places.length} places`], ...lines], header: true };
    }
    if (!isPlace(w, id)) return say(`drive: no place ${id}`);
    if (s.trip) return { lines: [['drive: on the road to ', placeTok(w, s.trip.to)]] };
    know(w, id);
    if (id === s.position) return { lines: [['drive: you are at ', placeTok(w, id)]] };
    const d = km(w, s.position, id);
    const c = cost(d);
    s.trip = { from: s.position, to: id, at: Date.now(), ms: TRIP.ms };
    s.layer = 'terrain';
    if (!s.windows.includes('map')) s.windows.push('map');
    const snap: Seg = s.bar.includes('snap') ? { text: 'snap', kind: 'verb', arg: 'snap' } : '';
    return {
      lines: [['driving  ', placeTok(w, id), `  ${fmt(d)} km  `, snap], [`${c} ${c === 1 ? 'sol' : 'sols'} on the road`]],
      open: ['map'],
      cues: ['motor'],
    };
  },
});

verb('arrive', {
  takes: 'none',
  hidden: true,
  run(w) {
    const s = w.state;
    const t = s.trip;
    if (!t) return say('arrive: not driving');
    const c = cost(km(w, t.from, t.to));
    s.heading = (Math.round(bearing(w, t.from, t.to) / 90) * 90) % 360;
    s.position = t.to;
    s.trip = null;
    s.sol += c;
    s.path.push(xy(w, t.to));
    if (!s.visited.includes(t.to)) s.visited.push(t.to);
    const live = bus(w).filter((n) => n.device?.bus === 'ext' && n.device.at === t.to);
    const on: Line = live.length ? ['on the bus: ', ...live.flatMap((n, i) => (i ? ['  ', tok(w, n)] : [tok(w, n)]))] : ['nothing on the bus here'];
    return { lines: [['arrived  ', placeTok(w, t.to), `  sol ${s.sol}`], on], header: true };
  },
});
