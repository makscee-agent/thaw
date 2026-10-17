// ls, read, tail, more, install, set, map: the filesystem and the screen (DESIGN 4-6).

import { addVerb, flow, page, reachable, run, say, tok, tokenize, verb, verbs } from '../commands';
import type { Line, Node, Output, Seg, World } from '../world';

const isFolder = (w: World, id?: string) => !!id && ['folder', 'device'].includes(w.nodes[id]?.kind);
const isFile = (w: World, id?: string) => !!id && w.nodes[id]?.kind === 'file';

/** the entries of a folder or a drive root as tokens; tools last with `*` */
export function entries(w: World, n: Node, tools = true): Seg[] {
  return (n.children ?? []).map((id) => w.nodes[id]).filter((c) => tools || c.kind !== 'tool').map((c) => tok(w, c));
}

export function markListed(w: World, n: Node): void {
  const s = w.state;
  for (const id of [n.id, ...(n.children ?? [])]) if (!s.listed.includes(id)) s.listed.push(id);
}

export function listing(w: World, n: Node, body: Line[], from = 0): Output {
  const { out, shown } = page(w, [tok(w, n)], body, from, body.length);
  w.state.more = from + shown < body.length ? { id: n.id, from: from + shown, mode: 'ls' } : null;
  return out;
}

export function lsBody(w: World, n: Node): Line[] {
  if (n.kind === 'device') {
    const body = flow(entries(w, n, false));
    const tools = entries(w, n).filter((t) => typeof t !== 'string' && t.kind === 'tool');
    if (tools.length) body.push(...flow(['tools:', ...tools]));
    return body.length ? body : [['(empty)']];
  }
  const body = flow(entries(w, n));
  return body.length ? body : [['(empty)']];
}

verb('ls', {
  takes: 'optional',
  fits: (w, t) => isFolder(w, t.nodeId),
  run(w, id = '/') {
    if (id === '/dev') return run(w, 'dev');
    const n = w.nodes[id];
    if (!n || !isFolder(w, id)) return say(`ls: no folder ${id}`);
    if (n.kind === 'device' && !w.state.mounted.includes(n.id)) return say(`${n.name} not mounted`);
    const why = reachable(w, id);
    if (why) return say(why);
    markListed(w, n);
    return listing(w, n, lsBody(w, n));
  },
});

function fileBody(w: World, n: Node): Line[] {
  const lines = n.lines?.lines ?? [];
  return lines.length ? lines.map((l) => tokenize(w, l)) : [['(empty)']];
}

function collect(w: World, n: Node): void {
  const s = w.state;
  for (const f of n.lines?.facts ?? []) if (!s.facts.includes(f)) s.facts.push(f);
  if (n.lines?.light) s.light = n.lines.light;
}

function readable(w: World, id?: string): string | null {
  if (!isFile(w, id)) return `no file ${id}`;
  return reachable(w, id!);
}

verb('read', {
  takes: 'noun',
  fits: (w, t) => isFile(w, t.nodeId),
  run(w, id) {
    const why = readable(w, id);
    if (why) return say(`read: ${why}`);
    const n = w.nodes[id!];
    collect(w, n);
    const body = fileBody(w, n);
    const { out, shown } = page(w, [tok(w, n)], body, 0, body.length);
    w.state.more = shown < body.length ? { id: n.id, from: shown, mode: 'read' } : null;
    return out;
  },
});

verb('tail', {
  takes: 'noun',
  fits: (w, t) => isFile(w, t.nodeId),
  run(w, id) {
    const why = readable(w, id);
    if (why) return say(`tail: ${why}`);
    const n = w.nodes[id!];
    collect(w, n);
    const body = fileBody(w, n);
    const room = w.state.rows - 1;
    const from = Math.max(0, body.length - room);
    w.state.more = null;
    const head: Line = [tok(w, n), from ? `  tail, ${from} lines above` : '  tail'];
    return { lines: [head, ...body.slice(from)], header: true };
  },
});

verb('more', {
  takes: 'none',
  run(w) {
    const m = w.state.more;
    if (!m) return say('more: nothing left');
    const n = w.nodes[m.id];
    if (m.mode === 'ls') return listing(w, n, lsBody(w, n), m.from);
    const body = fileBody(w, n);
    const { out, shown } = page(w, [tok(w, n)], body, m.from, body.length);
    w.state.more = m.from + shown < body.length ? { id: n.id, from: m.from + shown, mode: 'read' } : null;
    return out;
  },
});

verb('install', {
  takes: 'noun',
  hidden: true,
  fits: (w, t) => w.nodes[t.nodeId!]?.kind === 'tool',
  run(w, id) {
    const n = id ? w.nodes[id] : undefined;
    if (!n?.tool) return say(`install: no tool ${id}`);
    const why = reachable(w, n.id);
    if (why) return say(`install: ${why}`);
    const v = n.tool.verb;
    const fresh = !w.state.installed.includes(n.id) && !!w.state.installed.push(n.id);
    const added = addVerb(w, v) || (fresh && !!verbs[v]?.hidden);
    return { lines: [[{ text: v, kind: 'verb', arg: v }, added ? ' installed' : ' is in the bar'], tokenize(w, n.tool.help)], cues: ['install'] };
  },
});

verb('set', {
  takes: 'noun',
  hidden: true,
  run(w, arg = '') {
    const [key, val] = arg.replace(/^set\s+/, '').split(/\s+/);
    if (key === 'rows') {
      w.state.rows = Number(val);
      return { lines: [[`rows=${val}`], ['display ok']], cues: ['grow'] };
    }
    return say(`set: no key ${key}`);
  },
});

verb('map', {
  takes: 'none',
  run(w) {
    if (!w.state.windows.includes('map')) w.state.windows.push('map');
    return { lines: [['map open']], open: ['map'] };
  },
});

