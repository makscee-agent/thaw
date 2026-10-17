// The 3D world and the camera (DESIGN 8, 12). STUB until the scene slice (#1312):
// render returns noise and no things, so the terminal flow runs without the scene.

export interface Thing {
  /** thing node id, "?crate" */
  id: string;
  /** res*res, 1 where the thing covers the pixel */
  mask: Uint8Array;
}

export interface Shot {
  /** res*res grey levels 0..255 (one-bit frames use 0 and 255) */
  pixels: Uint8Array;
  /** things in view, left to right */
  things: Thing[];
}

export interface View {
  /** place node id, "@here" */
  place: string;
  /** degrees, 0 = north */
  heading: number;
  res: 32 | 96;
  /** mid-road smear */
  blur?: boolean;
}

export function render(v: View): Shot {
  const pixels = new Uint8Array(v.res * v.res);
  for (let i = 0; i < pixels.length; i++) pixels[i] = Math.random() < 0.5 ? 0 : 255;
  return { pixels, things: [] };
}

/** open the full-screen camera at a place and heading; resolves when it is showing */
export async function cam(_place: string, _heading: number): Promise<void> {}
