// Greys to the frame's bits (DESIGN 8): a 4 by 4 Bayer ordered dither, to one bit or to four greys.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** dither res*res greys (0..255) to `levels` grey levels, spread back over 0..255 */
export function dither(grey: Uint8Array, res: number, levels: 2 | 4): Uint8Array {
  const out = new Uint8Array(grey.length);
  const steps = levels - 1;
  for (let y = 0; y < res; y++)
    for (let x = 0; x < res; x++) {
      const i = y * res + x;
      const t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const v = (grey[i] / 255) * steps;
      const q = Math.min(steps, Math.floor(v) + (v - Math.floor(v) > t ? 1 : 0));
      out[i] = Math.round((q / steps) * 255);
    }
  return out;
}

/** average a square of src*src greys down to res*res */
export function shrink(src: Uint8Array, size: number, res: number): Uint8Array {
  const k = size / res;
  const out = new Uint8Array(res * res);
  for (let y = 0; y < res; y++)
    for (let x = 0; x < res; x++) {
      let s = 0;
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) s += src[(y * k + j) * size + x * k + i];
      out[y * res + x] = Math.round(s / (k * k));
    }
  return out;
}

/** the mid-road smear: a horizontal box blur, `r` pixels each way */
export function smear(grey: Uint8Array, res: number, r: number): Uint8Array {
  const out = new Uint8Array(grey.length);
  for (let y = 0; y < res; y++)
    for (let x = 0; x < res; x++) {
      let s = 0;
      let n = 0;
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(res - 1, Math.max(0, x + d));
        s += grey[y * res + xx];
        n++;
      }
      out[y * res + x] = Math.round(s / n);
    }
  return out;
}
