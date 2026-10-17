// The content rules of DESIGN 13, checked over the whole world.
import { describe, expect, it } from 'vitest';
import { driveOf } from '../src/model';
import { world } from '../src/content';

const w = world();
const nodes = Object.values(w.nodes);
const shown = (l: string) => l.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
const texts = nodes.flatMap((n) => [
  ...(n.lines?.lines ?? []).map((l) => [n.id, shown(l)]),
  ...(n.tool ? [[n.id, n.tool.help]] : []),
  ...(n.thing ? [[n.id, n.thing.says]] : []),
]);
const FIRST_RING = ['PWR', 'ARM', 'MEM', 'RADIO', 'WX'];

describe('content rules', () => {
  it('keeps every line within 44 characters', () => {
    expect(texts.filter(([, l]) => l.length > 44)).toEqual([]);
  });

  it('never says the word and names no years', () => {
    expect(texts.filter(([, l]) => /rover|\byears?\b/i.test(l))).toEqual([]);
  });

  it('reads the first ring at five rows: four lines, or a log with keys in head and tail', () => {
    for (const n of nodes) {
      const d = n.kind === 'file' ? driveOf(w, n.id) : undefined;
      if (!d || !FIRST_RING.includes(d.id)) continue;
      const lines = n.lines!.lines;
      if (/log/.test(n.name)) continue;
      expect([n.id, lines.length <= 4]).toEqual([n.id, true]);
    }
  });

  it('puts every packet fact in exactly one file', () => {
    for (const f of nodes.filter((n) => n.kind === 'fact')) {
      const holders = nodes.filter((n) => n.lines?.facts?.includes(f.id));
      expect([f.id, holders.length]).toEqual([f.id, 1]);
    }
    for (const n of nodes) for (const id of n.lines?.facts ?? []) expect(w.nodes[id]?.kind).toBe('fact');
  });

  it('names DSP and IMG in tails of different first-ring drives, NAV in the manifest', () => {
    const tail = (id: string) => w.nodes[id].lines!.lines.slice(-4).join('\n');
    expect(tail('ARM/log')).toMatch(/\bDSP\b/);
    expect(tail('WX/exposure.log')).toMatch(/\bIMG\b/);
    expect(w.nodes['INS/manifest'].lines!.lines.join('\n')).toMatch(/\bNAV\b/);
    for (const first of ['/readme', 'PWR/log', 'MEM/ops.log'])
      expect(w.nodes[first].lines!.lines.join('\n')).not.toMatch(/\b(DSP|IMG|NAV)\b/);
  });

  it('names every place with distance and bearing before it is needed', () => {
    const all = (prefix: string) =>
      nodes.filter((n) => n.id.startsWith(prefix) && n.lines).flatMap((n) => n.lines!.lines).join('\n');
    expect(all('NAV/')).toMatch(/LDR \d\.\d km bearing \d{3}/);
    expect(all('NAV/')).toMatch(/HAB \d\.\d km bearing \d{3}/);
    expect(all('HAB/')).toMatch(/RLY \d\.\d km bearing \d{3}/);
    expect(all('HAB/')).toMatch(/T-2 \d\.\d km bearing \d{3}/);
  });

  it('keeps the ids the other slices code against', () => {
    for (const id of ['@here', '@LDR', '@T-2', '@HAB', '@RLY', '?crate', '?mast', '?lander', '?sibling', '?rock'])
      expect(w.nodes[id], id).toBeTruthy();
    expect(w.nodes['HAB/keys/uplink'].tool?.verb).toBe('uplink');
    expect(w.nodes['LDR/relay.fw'].tool?.verb).toBe('relay');
    expect(w.nodes['WX/almanac'].lines?.light).toBe(22);
    const sizes = Object.fromEntries(nodes.filter((n) => n.fact).map((n) => [n.id, n.fact!.size]));
    expect(sizes).toEqual({ '!coords': 18, '!pods': 18, '!kaja': 8, '!ruben': 8, '!noor': 8, '!ilya': 8, '!note': 40, '!alive': 12, '!light': 16 });
  });
});
