// send, pick, transmit: the message and the end (DESIGN 11). STUB until the send slice (#1315).

import { say, verb } from '../commands';

verb('send', { takes: 'none', run: () => say('send: no uplink key', 'send: no relay firmware', 'send: no line of sight') });
