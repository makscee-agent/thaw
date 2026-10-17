// TERM (DESIGN 3, 4): output rows, the animated input line, the bar of known verbs.
// No keyboard: every command is typed by the game when something is clicked.

import { cue, start } from '../audio';
import { forest } from '../map';
import { prompt, resolve, run, save, typed, verbs, type Output, type Token, type World } from '../model';
import * as windows from '../windows';
import { renderLine, setClickHandler, tokenEl, type TokenEl } from './render';

const fast = new URLSearchParams(location.search).has('fast');
/** ms per typed character, per printed line; the seat tunes these by feel */
export const SPEED = { char: fast ? 0 : 20, line: fast ? 0 : 30 };

const wait = (ms: number) => (ms ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export class Term {
  w: World;
  waiting: string | null = null;
  busy = false;
  rowsEl: HTMLElement;
  inputEl: HTMLElement;
  barEl: HTMLElement;
  /** listeners for every printed output: the slices hook windows here */
  after: ((out: Output) => void)[] = [];

  constructor(w: World) {
    this.w = w;
    windows.open('term');
    const body = windows.body('term');
    this.rowsEl = div('rows');
    this.inputEl = div('input');
    this.barEl = div('bar');
    body.append(this.rowsEl, this.inputEl, this.barEl);
    this.setRows(w.state.rows, false);
    setClickHandler((t) => void this.click(t));
    this.drawInput('');
    this.drawBar();
  }

  setBusy(b: boolean): void {
    this.busy = b;
    document.body.dataset.busy = b ? '1' : '0';
  }

  setRows(n: number, animate = true): void {
    this.rowsEl.style.transition = animate ? 'height 0.5s ease-out' : 'none';
    this.rowsEl.style.setProperty('--rows', String(n));
  }

  /** a click on a token anywhere */
  async click(t: Token): Promise<void> {
    if (this.busy) return;
    start();
    cue('click');
    if (t.kind === 'verb') return this.verbClick(t.arg ?? t.text);
    const r = resolve(this.w, this.waiting, t);
    if (!r) return;
    const [v, noun] = r;
    const text = typed(this.w, v, t);
    await this.exec(v, noun, text, this.waiting ? v.length + 1 : 0);
  }

  /** a click on a verb in the bar */
  async verbClick(v: string): Promise<void> {
    if (this.busy) return;
    start();
    const def = verbs[v];
    if (!def) return;
    if (def.takes === 'noun') {
      this.waiting = v;
      this.setBusy(true);
      await this.typeInto('', v + ' ');
      this.setBusy(false);
      this.drawInput(v + ' ', def.args);
      this.dim();
      this.drawBar();
      return;
    }
    this.waiting = null;
    await this.exec(v, undefined, v, 0);
  }

  /** type the rest of `text` (from char `from`), run it, print the output */
  async exec(v: string, noun: string | undefined, text: string, from: number): Promise<void> {
    this.setBusy(true);
    this.waiting = null;
    this.dim();
    await this.typeInto(text.slice(0, from), text.slice(from));
    await wait(SPEED.line * 2);
    const rowsBefore = this.w.state.rows;
    const out = run(this.w, v, noun);
    save(this.w);
    if (this.w.state.rows !== rowsBefore) {
      this.setRows(this.w.state.rows);
      await wait(fast ? 0 : 500);
    }
    for (const c of out.cues ?? []) cue(c);
    await this.print(out);
    this.drawInput('');
    this.drawBar();
    this.setBusy(false);
  }

  async typeInto(done: string, rest: string): Promise<void> {
    let t = done;
    for (const ch of rest) {
      t += ch;
      this.drawInput(t);
      cue('key');
      await wait(SPEED.char);
    }
    if (!rest) this.drawInput(t);
  }

  /** print an output as the new screen, a line at a time */
  async print(out: Output, animate = true): Promise<void> {
    this.rowsEl.replaceChildren();
    out.lines.forEach((l, i) => {
      if (i >= this.w.state.rows) return;
      const el = renderLine(l);
      if (i === 0 && out.header) el.classList.add('head');
      if (animate) el.style.visibility = 'hidden';
      this.rowsEl.append(el);
    });
    if (animate) for (const el of this.rowsEl.children) {
      await wait(SPEED.line);
      (el as HTMLElement).style.visibility = '';
    }
    for (const name of out.open ?? []) windows.open(name as windows.WinName);
    this.refresh();
    for (const fn of this.after) fn(out);
  }

  /** redraw the windows that show state */
  refresh(): void {
    if (this.w.state.windows.includes('map')) {
      windows.open('map');
      windows.update('map', forest(this.w));
    }
  }

  drawInput(text: string, args?: string[]): void {
    this.inputEl.replaceChildren();
    const p = document.createElement('span');
    p.className = 'prompt';
    p.textContent = prompt(this.w) + ' ';
    const t = document.createElement('span');
    t.className = 'typed';
    t.textContent = text;
    const cur = document.createElement('span');
    cur.className = 'cursor';
    cur.textContent = '█';
    this.inputEl.append(p, t, cur);
    for (const a of args ?? []) {
      this.inputEl.append(document.createTextNode(' '));
      this.inputEl.append(tokenEl({ text: a, kind: 'dir', arg: a }));
    }
  }

  drawBar(): void {
    this.barEl.replaceChildren();
    for (const v of this.w.state.bar) {
      const el = tokenEl({ text: v, kind: 'verb', arg: v });
      el.classList.add('btn');
      el.dataset.verb = v;
      if (v === this.waiting) el.classList.add('on');
      this.barEl.append(el);
    }
  }

  /** while a verb waits, only the tokens that fit it stay amber */
  dim(): void {
    const def = this.waiting ? verbs[this.waiting] : null;
    for (const el of document.querySelectorAll<TokenEl>('.tok')) {
      const t = el.tok;
      const fits = !def || !t || t.kind === 'verb' || !!def.fits?.(this.w, t);
      el.classList.toggle('dim', !fits);
    }
  }
}

function div(cls: string): HTMLElement {
  const el = document.createElement('div');
  el.className = cls;
  return el;
}
