// The model's entry: import this, not ./commands, so every verb is registered.
import './verbs';
import { world } from '../content';
import type { State, World } from './world';

export * from './commands';
export * from './world';

const KEY = 'thaw.v1';

/** a fresh world, or the saved run when there is one */
export function load(): World {
  const w = world();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) w.state = { ...w.state, ...(JSON.parse(raw) as State) };
  } catch {
    /* no storage: a fresh run */
  }
  return w;
}

export function save(w: World): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(w.state));
  } catch {
    /* no storage: the run lives until the tab closes */
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing saved */
  }
}
