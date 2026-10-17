// The whole world as data. PLACEHOLDER: the real drive and tool names with a line or two each,
// enough to play the spine's flow. The content slice (#1314) replaces the text from DESIGN.md 12-13.

import { initialState, type World } from '../model/world';
import { Builder } from './build';

export function world(): World {
  const b = new Builder();

  // your own root: ls alone lists it
  b.add({ id: '/', kind: 'folder', name: '/', children: [] });
  b.tree('/', '/', {
    readme: [
      'T. you woke. your memory is gone. sorry.',
      'tools left: ls, read and tail. the bus: dev',
      'mount PWR first, then MEM. both are on.',
      'read slow. we are close. K.',
    ],
    'dev/': {},
    'boot.log': [
      'HSP surface unit T-1',
      'cold boot',
      'memory: none',
      '5 entries',
      'shell ready',
    ],
    'bin/': {
      'ls*': 'ls X lists X. ls alone lists your root.',
      'read*': 'read X prints the head of a file.',
      'tail*': 'tail X prints the last lines of a file.',
    },
    'tmp/': {},
  });

  // the first ring: your own parts, on from boot
  b.drive('PWR', { label: 'power', bus: 'internal', startsClock: true }, {
    log: [
      'sol 1   -88C  charge 61',
      'sol 2   -91C  charge 58',
      'sol 3   -97C  charge 40  freeze',
      '▓▓▓▓▓▓ forty-one years ▓▓▓▓▓▓',
      'sol 1   -12C  charge 22  light',
      'sol 1   -9C   charge 24  wake',
      'DSP held off to save charge',
    ],
    spec: ['board rev 3. feeds DSP IMG NAV ARM RADIO.'],
    'power*': 'power lists your parts. power X turns X on.',
  });
  b.drive('ARM', { label: 'arm', bus: 'internal' }, {
    log: ['last stow: sol 3. the crate is in reach.'],
    spec: ['arm reach 2 m. grip 12 kg.'],
    'arm*': 'arm ? reaches a thing in the frame. one sol.',
  });
  b.drive('MEM', { label: 'memory', bus: 'internal' }, {
    'ops.log': [
      'sol 1  morning T. first light. K.',
      '▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓',
      'sol 3  storm. hold still, T.',
      'sol 3  if you wake, power IMG.',
    ],
    names: ['▓▓▓▓ Lind  ▓▓▓▓▓ Achter  ▓▓▓▓ ▓▓▓▓▓'],
    'tmp/': {},
    'map*': 'map opens the map of what you listed.',
  });
  b.drive('RADIO', { label: 'radio', bus: 'internal' }, {
    inbox: ['pickup window closed. hold. we come at the next light.'],
    outbox: [],
    'send*': 'send transmits one packet. locked.',
  });

  // off until named
  b.drive('DSP', { label: 'display', bus: 'internal', offAtBoot: true }, {
    'term.conf': [
      'rows={5|set rows 20}',
      'cols=48',
    ],
    'more*': 'more prints the next page of the last text.',
  });
  b.drive('IMG', { label: 'imaging', bus: 'internal', offAtBoot: true }, {
    'snap*': 'snap n e s w takes a frame.',
    'view*': 'view lists the stored frames.',
    'frames/': {},
  });
  b.drive('NAV', { label: 'nav', bus: 'internal', offAtBoot: true }, {
    'drive*': 'drive P drives to a place.',
    waypoints: ['LDR 1.5 km bearing 200', 'HAB 3.0 km bearing 040'],
    odometry: ['total 41.2 km'],
  });

  // live and dead things out there
  b.drive('WX', { label: 'weather', bus: 'ext', at: '@here' }, {
    almanac: { lines: ['light until sol 22. next light +41y.'], light: 22 },
    'storm.log': ['sol 3  gusts 140. mast down at the habitat.'],
    'exposure.log': ['sol 1  lux 120'],
  });
  b.drive('INS', { label: 'crate', bus: 'dead', at: '?crate' }, {
    manifest: ['optics x1. NAV spare.'],
    'optics*': 'optics: frames at 96 pixels, four greys.',
  });
  b.drive('HAB', { label: 'habitat', bus: 'ext', at: '@HAB' }, {
    'pods/': {},
    'home/': {},
    'radio/': { outbox: ['help. coordinates ▓▓▓'] },
    'keys/': {},
    'cam/': {},
  });
  b.drive('LDR', { label: 'lander', bus: 'dead', at: '?lander' }, {
    'relay.fw': ['relay firmware v2'],
    'frames/': {},
    log: ['landed sol 1.'],
  });
  b.drive('RLY', { label: 'relay', bus: 'dead', at: '?mast' }, {
    status: ['mast up. waiting for firmware.'],
  });
  b.drive('T-2', { label: 'unit', bus: 'dead', at: '?sibling' }, {
    'cam*': 'cam looks around. full screen.',
    log: ['sol 3  stuck in the crater.'],
  });

  // the plain: km east (x) and north (y) of where T woke
  b.place('here', { x: 0, y: 0 });
  b.place('LDR', { x: -0.51, y: -1.41 });
  b.place('T-2', { x: -1.73, y: 1.0 });
  b.place('HAB', { x: 1.93, y: 2.3 });
  b.place('RLY', { x: 4.0, y: 0 });

  b.thing('crate', { at: '@here', says: 'a dropped crate. it has a drive.', device: 'INS' });
  b.thing('mast', { at: '@RLY', says: 'a relay mast. it has a drive.', device: 'RLY' });
  b.thing('lander', { at: '@LDR', says: 'a lander. it has a drive.', device: 'LDR' });
  b.thing('sibling', { at: '@T-2', says: 'a unit like you. it has a drive.', device: 'T-2' });
  b.thing('rock', { at: '@here', says: 'a rock.' });

  return { nodes: b.nodes, state: initialState() };
}
