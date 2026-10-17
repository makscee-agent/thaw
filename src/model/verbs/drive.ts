// drive: places and moving (DESIGN 9). STUB until the terrain slice (#1313).

import { say, verb } from '../commands';

verb('drive', { takes: 'noun', fits: (_w, t) => t.kind === 'place', run: () => say('drive: no nav') });
