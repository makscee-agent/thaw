// The end (DESIGN 11): after transmit the terminal is down to five rows over the landscape,
// the acknowledgment types in, the landscape fades, then the rows, then the end card with the
// ending's name and `again`, which clears the save and boots a fresh run.

import { cue } from '../audio';
import { reset, type World } from '../model';
import { ending } from '../model/verbs/send';
import { cam } from '../scene';
import { SPEED, type Term } from '../term';
import { renderLine } from '../term/render';

const fast = new URLSearchParams(location.search).has('fast');
const wait = (ms: number) => new Promise((r) => setTimeout(r, fast ? 0 : ms));

/** play the end once transmit sets state.ended; a run that loads already ended shows the card */
export function hook(term: Term): void {
  const w = term.w;
  if (w.state.ended) return card(w, false);
  term.after.push(() => {
    if (w.state.ended && !document.body.dataset.end) void play(term);
  });
}

async function play(term: Term): Promise<void> {
  const w = term.w;
  const e = ending(w);
  if (!e) return;
  document.body.dataset.end = 'ack';
  await wait(0); // let transmit's exec finish, then hold the terminal
  term.setBusy(true);
  if (!w.state.windows.includes('cam')) await cam(w.state.position, w.state.heading);
  await wait(1500);
  term.rowsEl.replaceChildren();
  for (const text of e.ack) {
    const el = renderLine(['']);
    term.rowsEl.append(el);
    cue('beep');
    for (let i = 1; i <= text.length; i++) {
      el.textContent = text.slice(0, i);
      await wait(SPEED.char * 2);
    }
    await wait(400);
  }
  await wait(3000);
  document.body.dataset.end = 'scene';
  await wait(3000);
  document.body.dataset.end = 'rows';
  await wait(2500);
  card(w, true);
  term.setBusy(false);
}

/** the end card: the ending's name and `again` */
function card(w: World, animate: boolean): void {
  const e = ending(w);
  document.body.dataset.end = 'card';
  const el = document.createElement('div');
  el.className = 'end-card' + (animate ? ' fade-in' : '');
  const name = document.createElement('div');
  name.className = 'end-name';
  name.textContent = e?.name ?? 'the end';
  const again = document.createElement('span');
  again.className = 'end-again';
  again.textContent = 'again';
  again.addEventListener('click', () => {
    reset();
    location.reload();
  });
  el.append(name, again);
  document.body.append(el);
}
