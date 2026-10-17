// Windows on the black page (DESIGN 3): TERM in the middle, FRAME left of it, MAP right of it.
// CAM is not a window: it fills the viewport behind the others.

export type WinName = 'term' | 'map' | 'frame' | 'cam';

const ORDER: WinName[] = ['frame', 'term', 'map'];
const wins = new Map<WinName, HTMLElement>();

function desk(): HTMLElement {
  let d = document.getElementById('desk');
  if (!d) {
    d = document.createElement('div');
    d.id = 'desk';
    document.body.append(d);
  }
  return d;
}

/** the window's element (created hidden on first use); its body is `.body`, its title bar `.title` */
export function win(name: WinName): HTMLElement {
  let el = wins.get(name);
  if (el) return el;
  el = document.createElement('section');
  el.className = `win win-${name}`;
  el.dataset.win = name;
  el.hidden = true;
  const title = document.createElement('header');
  title.className = 'title';
  title.textContent = name.toUpperCase();
  const body = document.createElement('div');
  body.className = 'body';
  el.append(title, body);
  wins.set(name, el);
  const d = desk();
  const after = ORDER.slice(ORDER.indexOf(name) + 1).map((n) => wins.get(n)).find((e) => e?.parentElement === d);
  d.insertBefore(el, after ?? null);
  return el;
}

export function body(name: WinName): HTMLElement {
  return win(name).querySelector('.body') as HTMLElement;
}

export function open(name: WinName): void {
  win(name).hidden = false;
}

/** replace the window's body with `data` (an element or text) */
export function update(name: WinName, data: HTMLElement | string): void {
  const b = body(name);
  if (typeof data === 'string') b.textContent = data;
  else b.replaceChildren(data);
}

export function close(name: WinName): void {
  win(name).hidden = true;
}

export function isOpen(name: WinName): boolean {
  return wins.has(name) && !win(name).hidden;
}
