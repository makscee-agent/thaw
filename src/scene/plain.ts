// The plain and its objects (DESIGN 8, 9, 12). Units are metres: x east, z = -north, y up.
// Places sit at their km positions times 1000; each place's things stand a few metres off it,
// along the bearing T drives in on, so a snap in that direction finds them.

import * as THREE from 'three';

export const KM = 1000;

/** km east/north of the wake point, as in src/content */
export const PLACES: Record<string, [number, number]> = {
  '@here': [0, 0],
  '@LDR': [-0.51, -1.41],
  '@T-2': [-1.73, 1.0],
  '@HAB': [1.93, 2.3],
  '@RLY': [4.0, 0],
};

/** metres east, north of a place by bearing and distance */
const off = (place: string, bearing: number, m: number): [number, number] => {
  const [x, y] = PLACES[place];
  const b = (bearing * Math.PI) / 180;
  return [x * KM + Math.sin(b) * m, y * KM + Math.cos(b) * m];
};

const CRATER = off('@T-2', 300, 22);
const CRATER_R = 18;
const RIDGE_E = PLACES['@RLY'][0] * KM;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** ground height at metres east, north */
export function height(e: number, n: number): number {
  let h = 0;
  h += 1.2 * Math.sin(e * 0.011 + 1.3) * Math.cos(n * 0.009 + 0.4);
  h += 0.35 * Math.sin(e * 0.047 + n * 0.031);
  h += 6 * Math.sin(e * 0.0011 + 2) * Math.sin(n * 0.0013 + 1);
  // the ridge: a long north-south rise that RLY stands on
  h += 45 * smooth(RIDGE_E - 900, RIDGE_E - 40, e) * (1 - 0.4 * smooth(RIDGE_E + 200, RIDGE_E + 900, e));
  // the crater T-2 drove into
  const d = Math.hypot(e - CRATER[0], n - CRATER[1]);
  if (d < CRATER_R * 1.6) {
    const t = d / CRATER_R;
    h += t < 1 ? -5 * (1 - t * t) + 1.2 * t * t : 1.2 * (1 - smooth(1, 1.6, t));
  }
  return h;
}

const v3 = (e: number, n: number, up = 0) => new THREE.Vector3(e, height(e, n) + up, -n);

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

const mat = (c: number, rough = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.05, flatShading: true });
const GROUND = mat(0xa08c74);
const METAL = mat(0xb8b4aa, 0.6);
const DARK = mat(0x3a3a3c, 0.7);
const PANEL = mat(0x23262e, 0.4);
const WHITE = mat(0xd8d6cf, 0.8);
const ROCK = mat(0x4b4136);
const SKIN = mat(0xc9c4b8, 0.9);

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

/** a unit like T: deck, panel, six wheels, a mast. Faces -z. */
export function rover(mast = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.35, 2.4), METAL, 0, 0.75, 0));
  const panel = mesh(new THREE.BoxGeometry(1.5, 0.05, 2.5), PANEL, 0, 1.0, -0.1);
  g.add(panel);
  g.add(mesh(new THREE.BoxGeometry(1.52, 0.07, 0.08), WHITE, 0, 1.03, -1.35));
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14);
  wheel.rotateZ(Math.PI / 2);
  for (const z of [-1.15, 0, 1.15]) for (const x of [-0.98, 0.98]) g.add(mesh(wheel, DARK, x, 0.42, z));
  if (mast) {
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), METAL, -0.42, 1.45, 0.75));
    g.add(mesh(new THREE.BoxGeometry(0.35, 0.18, 0.2), WHITE, -0.42, 1.95, 0.75));
  }
  return g;
}

/** a person: a capsule, an arm raised if waving */
export function figure(wave = false): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CapsuleGeometry(0.28, 1.0, 4, 8), SKIN, 0, 0.78, 0));
  if (wave) {
    const arm = mesh(new THREE.CapsuleGeometry(0.08, 0.6, 3, 6), SKIN, 0.36, 1.55, 0);
    arm.rotation.z = -0.5;
    g.add(arm);
  }
  return g;
}

function tag(o: THREE.Object3D, thing: string): THREE.Object3D {
  o.userData.thing = thing;
  return o;
}

function place(o: THREE.Object3D, [e, n]: [number, number], yaw = 0, sink = 0): THREE.Object3D {
  o.position.copy(v3(e, n, -sink));
  o.rotation.y = (-yaw * Math.PI) / 180;
  return o;
}

function wxMast(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.24, 5.5, 6), DARK, 0, 2.75, 0));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), WHITE, 0, 1.6, 0.12));
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), METAL, 0, 5.4, 0));
  for (const x of [-0.6, 0.6]) g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), WHITE, x, 5.45, 0));
  return g;
}

function crate(): THREE.Group {
  const g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(1.3, 0.8, 0.9), WHITE, 0, 0.32, 0);
  b.rotation.z = 0.12;
  b.rotation.x = -0.08;
  g.add(b);
  g.add(mesh(new THREE.BoxGeometry(1.34, 0.12, 0.94), DARK, 0, 0.5, 0));
  return g;
}

function habitat(mastUp: boolean): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.CylinderGeometry(2.2, 2.2, 9, 16);
  body.rotateZ(Math.PI / 2);
  g.add(mesh(body, WHITE, 0, 2.1, 0));
  g.add(mesh(new THREE.SphereGeometry(2.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), WHITE, 6.2, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(1.2, 1.9, 1.2), METAL, -5.2, 0.95, 0.8));
  const mast = new THREE.Group();
  mast.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 12, 6), METAL, 0, 6, 0));
  mast.add(mesh(new THREE.CylinderGeometry(0.9, 0.2, 0.3, 10), WHITE, 0, 11.8, 0));
  mast.position.set(-2, 0, 3);
  // fallen: lying on the ground towards the viewer's left
  if (!mastUp) {
    mast.rotation.z = Math.PI / 2 - 0.04;
    mast.position.set(-2.4, 0.2, 3.4);
  }
  g.add(mast);
  return g;
}

function lander(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.4, 1.8, 2.2, 8), METAL, 0, 2.6, 0));
  g.add(mesh(new THREE.ConeGeometry(1.4, 1.6, 8), WHITE, 0, 4.5, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 5), DARK, Math.cos(a) * 2.1, 0.9, Math.sin(a) * 2.1);
    leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(leg);
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 8), DARK, Math.cos(a) * 2.6, 0.04, Math.sin(a) * 2.6));
  }
  return g;
}

function relayMast(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.25, 11, 6), METAL, 0, 5.5, 0));
  for (const y of [3, 6, 9]) g.add(mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), METAL, 0, y, 0));
  const dish = mesh(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3), WHITE, 0, 9.5, 0.4);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  g.add(mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), DARK, 0.4, 0.5, 0.4));
  return g;
}

function rockGeo(r: () => number, s: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(s, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.7 + r() * 0.6), p.getY(i) * (0.4 + r() * 0.4), p.getZ(i) * (0.7 + r() * 0.6));
  g.computeVertexNormals();
  return g;
}

export interface Plain {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  /** sun direction, towards the sun */
  sunDir: THREE.Vector3;
  /** T itself, moved under the camera for every view */
  self: THREE.Group;
  /** the habitat's mast: up in the stored frames, down now */
  habMast: (up: boolean) => void;
  /** capsule figures for the stored frames */
  figures: THREE.Group;
  ground: (e: number, n: number) => void;
}

/** ground: a polar mesh around a point, fine near and coarse far, rebuilt when the point moves */
function groundMesh(e0: number, n0: number): THREE.Mesh {
  const rings = 90;
  const segs = 160;
  const pos: number[] = [];
  const idx: number[] = [];
  pos.push(e0, height(e0, n0), -n0);
  for (let i = 1; i <= rings; i++) {
    const r = 0.6 * Math.pow(1.105, i) - 0.5;
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const e = e0 + Math.cos(a) * r;
      const n = n0 + Math.sin(a) * r;
      pos.push(e, height(e, n), -n);
    }
  }
  const at = (i: number, j: number) => (i === 0 ? 0 : 1 + (i - 1) * segs + (j % segs));
  // wound so the faces look up
  for (let j = 0; j < segs; j++) idx.push(0, at(1, j), at(1, j + 1));
  for (let i = 1; i < rings; i++)
    for (let j = 0; j < segs; j++) {
      idx.push(at(i, j), at(i + 1, j), at(i, j + 1));
      idx.push(at(i, j + 1), at(i + 1, j), at(i + 1, j + 1));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, GROUND);
  m.receiveShadow = true;
  return m;
}

function sky(sunDir: THREE.Vector3): THREE.Mesh {
  const g = new THREE.SphereGeometry(8000, 32, 16);
  const p = g.attributes.position;
  const cols: number[] = [];
  const v = new THREE.Vector3();
  const low = new THREE.Color(0xe8b27a);
  const high = new THREE.Color(0x4a4e5c);
  const glow = new THREE.Color(0xffd9a0);
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const c = low.clone().lerp(high, Math.pow(Math.max(0, v.y), 0.45));
    c.lerp(glow, Math.pow(Math.max(0, v.dot(sunDir)), 12) * 0.9);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
}

export function plain(): Plain {
  const scene = new THREE.Scene();
  // a low amber sun in the west-southwest: long shadows towards the east
  const az = (250 * Math.PI) / 180;
  const el = (7 * Math.PI) / 180;
  const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const sun = new THREE.DirectionalLight(0xffb870, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  const c = sun.shadow.camera;
  c.left = c.bottom = -60;
  c.right = c.top = 60;
  c.near = 1;
  c.far = 600;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x9aa0b0, 0x4a3e34, 1.1));
  scene.fog = new THREE.Fog(0xd8a878, 300, 5200);
  const skyMesh = sky(sunDir);
  skyMesh.userData.sky = true;
  scene.add(skyMesh);

  let groundAt = '';
  let ground: THREE.Mesh | null = null;
  const setGround = (e: number, n: number) => {
    const key = `${Math.round(e)},${Math.round(n)}`;
    if (key === groundAt) return;
    if (ground) {
      scene.remove(ground);
      ground.geometry.dispose();
    }
    ground = groundMesh(e, n);
    scene.add(ground);
    groundAt = key;
    skyMesh.position.set(e, 0, -n);
    sun.target.position.set(e, height(e, n), -n);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 300);
  };

  // at the wake point: the weather mast, the crate, a rock, all north of T
  scene.add(place(wxMast(), [-3.5, 11]));
  scene.add(tag(place(crate(), [2.6, 6.5], 20), '?crate'));
  scene.add(tag(place(mesh(rockGeo(rng(7), 0.55), ROCK), [-1.8, 5]), '?rock'));
  // the habitat with its fallen mast, the lander, the relay mast on the ridge, the sibling in the crater
  const hab = habitat(false);
  scene.add(place(hab, off('@HAB', 20, 26), 90));
  scene.add(tag(place(lander(), off('@LDR', 200, 22), 10), '?lander'));
  scene.add(tag(place(relayMast(), off('@RLY', 90, 14)), '?mast'));
  const sib = rover();
  place(sib, off('@T-2', 300, 16), 120, 0.3);
  sib.rotation.x = 0.35;
  sib.rotation.z = 0.25;
  scene.add(tag(sib, '?sibling'));

  // loose rocks around every place, never under T
  const r = rng(41);
  for (const p of Object.keys(PLACES)) {
    const [px, py] = PLACES[p];
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = 4 + Math.pow(r(), 1.5) * 120;
      const s = 0.12 + Math.pow(r(), 3) * 0.9;
      const o = mesh(rockGeo(r, s), ROCK);
      place(o, [px * KM + Math.cos(a) * d, py * KM + Math.sin(a) * d], r() * 360, s * 0.3);
      scene.add(o);
    }
  }

  const self = rover();
  scene.add(self);
  const habMast = (up: boolean) => {
    const m = hab.children[hab.children.length - 1];
    m.rotation.z = up ? 0 : Math.PI / 2 - 0.04;
    m.position.set(up ? -2 : -2.4, up ? 0 : 0.2, up ? 3 : 3.4);
  };
  const figures = new THREE.Group();
  scene.add(figures);
  return { scene, sun, sunDir, self, habMast, figures, ground: setGround };
}

export { v3, off };
