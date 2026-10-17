// The drive under way (DESIGN 9): slides the dot on the terrain layer for TRIP.ms, then runs the
// hidden `arrive` and prints it once the terminal is free. A reload mid-drive picks the trip up.

import { run, save, TRIP, where } from '../model';
import type { Term } from '../term';
import * as windows from '../windows';
import type { TerrainEl } from '.';

const fast = new URLSearchParams(location.search).has('fast');
if (fast) TRIP.ms = 300;

export function follow(term: Term): void {
  const w = term.w;
  let running = false;

  const arrive = () => {
    if (term.busy || term.waiting) return void setTimeout(arrive, 100);
    running = false;
    term.setBusy(true);
    const out = run(w, 'arrive');
    save(w);
    void term.print(out).then(() => {
      term.drawInput('');
      term.drawBar();
      term.setBusy(false);
    });
  };

  const step = () => {
    const t = w.state.trip;
    if (!t) return void (running = false);
    const el = windows.isOpen('map') ? (windows.body('map').querySelector('.terrain') as TerrainEl | null) : null;
    el?.track?.([...w.state.path, where(w)]);
    if (Date.now() - t.at < t.ms) requestAnimationFrame(step);
    else arrive();
  };

  const go = () => {
    if (running || !w.state.trip) return;
    running = true;
    requestAnimationFrame(step);
  };
  term.after.push(go);
  go();
}
