// MAP (DESIGN 3, 5, 9): the filesystem forest, and from `drive` on the terrain layer.

import { tok } from '../model';
import type { Line, World } from '../model';
import { renderLine } from '../term/render';

/** the forest: one tree per machine (your root, then every mounted drive), drawn from what was listed */
export function forest(w: World): HTMLElement {
  const el = document.createElement('div');
  el.className = 'forest';
  const s = w.state;
  const roots = ['/', ...s.mounted];
  for (const r of roots) {
    const lines: Line[] = [];
    const walk = (id: string, pre: string, last: boolean, top: boolean) => {
      const n = w.nodes[id];
      lines.push(top ? [r === '/' ? 'T  /' : '', ...(r === '/' ? [] : [tok(w, n)])] : [pre + (last ? '└ ' : '├ '), tok(w, n)]);
      const kids = (n.children ?? []).filter((c) => s.listed.includes(c));
      if (!s.listed.includes(id)) return;
      kids.forEach((c, i) => walk(c, top ? '' : pre + (last ? '  ' : '│ '), i === kids.length - 1, false));
    };
    walk(r, '', true, true);
    const tree = document.createElement('div');
    tree.className = 'tree';
    for (const l of lines) tree.append(renderLine(l));
    el.append(tree);
  }
  return el;
}

/** the terrain layer. STUB until the terrain slice (#1313). */
export function terrain(_w: World, _places: string[], _path: [number, number][]): HTMLElement {
  const el = document.createElement('div');
  el.className = 'terrain';
  el.textContent = 'terrain';
  return el;
}
