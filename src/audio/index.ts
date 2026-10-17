// Sound (DESIGN 14). STUB until the sound slice (#1316): every cue is a no-op.

export type Cue =
  | 'click' // a click
  | 'key' // a typed character
  | 'mount' // two-stage relay clack
  | 'power' // a part comes on
  | 'install' // a tool joins the bar
  | 'grow' // the screen grows
  | 'hum' // the fan hum, from boot
  | 'wind' // from the first snap on
  | 'motor' // during a drive
  | 'chord' // cam opens
  | 'beep'; // the acknowledgment arrives

export function cue(_name: Cue | string): void {}

/** called on the first click: browsers start audio only after a gesture */
export function start(): void {}
