// snap, arm, view, optics, cam: looking (DESIGN 8). STUBS until the scene slice (#1312).

import { say, verb } from '../commands';

verb('snap', { takes: 'noun', args: ['n', 'e', 's', 'w'], fits: (_w, t) => t.kind === 'dir', run: () => say('snap: no camera yet') });
verb('arm', { takes: 'noun', fits: (_w, t) => t.kind === 'thing', run: () => say('arm: nothing in reach') });
verb('view', { takes: 'none', run: () => say('view: no frames yet') });
verb('optics', { takes: 'none', run: () => say('optics: not fitted') });
verb('cam', { takes: 'none', run: () => say('cam: no camera') });
