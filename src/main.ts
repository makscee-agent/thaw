import './style.css';
import { load, reset, save, tokenize } from './model';
import { Term } from './term';
import { hook as end } from './end';

const params = new URLSearchParams(location.search);
if (params.has('new')) reset();

const w = load();
const term = new Term(w);
(window as unknown as { thaw: unknown }).thaw = { w, term };
end(term);

if (w.state.lastOutput) {
  void term.print(w.state.lastOutput, false);
} else {
  // boot prints boot.log; the bar shows ls
  const boot = w.nodes['/boot.log'].lines!.lines.map((l) => tokenize(w, l));
  w.state.lastOutput = { lines: boot };
  save(w);
  term.setBusy(true);
  void term.print({ lines: boot }).then(() => term.setBusy(false));
}
