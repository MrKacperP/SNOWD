/**
 * The SNOWD penguin code: a round code where the penguin sits in the middle and rings of dark arcs
 * around it spell out a person's id. An orange ring (the penguin's feet colour) frames it, with a
 * notch at the top so a scanner knows which way is up. Only SNOWD's own scanner reads it; the
 * invite screen flips to a plain QR for everyone else.
 *
 * Layout, in units of the white disc's radius (1):
 * - the penguin inside 0.38
 * - data rings centred at RINGS[k].r, RINGS[k].n segments each, a dark arc for 1 and nothing for 0
 * - the orange ring centred at ORANGE_R, with a NOTCH_DEG gap centred straight up
 * Segment s of a ring is centred at (s + 0.5) * 360 / n degrees clockwise from straight up.
 *
 * Data: 28 id characters × 6 bits + a 24-bit check = 192 bits, mixed with a fixed pattern so the
 * arcs look varied for every id. Ids that aren't 28 characters of A–Z, a–z, 0–9, - or _ have no
 * penguin code (encode returns null) and fall back to the QR.
 */

export const RINGS = [
  { r: 0.47, n: 36 },
  { r: 0.58, n: 44 },
  { r: 0.69, n: 52 },
  { r: 0.8, n: 60 },
] as const;
export const RING_WIDTH = 0.075;
export const ORANGE_R = 0.92;
export const ORANGE_WIDTH = 0.07;
export const NOTCH_DEG = 16;
export const ORANGE = "#fa9f4b";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ID_LENGTH = 28;
const DATA_BITS = ID_LENGTH * 6;
const TOTAL_BITS = RINGS.reduce((a, r) => a + r.n, 0); // 192

/** A fixed, repeatable pattern mixed into the bits so ids don't draw as long solid runs. */
const MASK = (() => {
  let s = 0x5eed1234;
  return Array.from({ length: TOTAL_BITS }, () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return (s >>> 16) & 1;
  });
})();

/** A 24-bit check over the data bits (FNV-1a folded), so a misread never opens the wrong person. */
function check(bits: number[]) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    h = Math.imul(h ^ byte, 16777619) >>> 0;
  }
  return ((h >>> 24) ^ h) & 0xffffff;
}

/** A person's id as the 192 bits drawn on the rings (ring by ring, segment by segment), or null. */
export function encode(id: string): number[] | null {
  if (id.length !== ID_LENGTH) return null;
  const bits: number[] = [];
  for (const ch of id) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    for (let b = 5; b >= 0; b--) bits.push((v >> b) & 1);
  }
  const c = check(bits);
  for (let b = 23; b >= 0; b--) bits.push((c >> b) & 1);
  return bits.map((b, i) => b ^ MASK[i]);
}

/** The id back from 192 read bits, or "" when the check doesn't match. */
export function decodeBits(read: number[]): string {
  if (read.length !== TOTAL_BITS) return "";
  const bits = read.map((b, i) => b ^ MASK[i]);
  const data = bits.slice(0, DATA_BITS);
  let c = 0;
  for (let i = DATA_BITS; i < TOTAL_BITS; i++) c = (c << 1) | bits[i];
  if (c >>> 0 !== check(data)) return "";
  let id = "";
  for (let i = 0; i < DATA_BITS; i += 6) id += ALPHABET[data.slice(i, i + 6).reduce((a, b) => (a << 1) | b, 0)];
  return id;
}

/** True for pixels in the penguin-orange family (works on photos of a screen, not just exact colour). */
function isOrange(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 140 || max - min < 0.38 * max || max !== r) return false;
  const hue = (60 * (g - b)) / (max - min); // red is max, so hue is in -60…60
  return hue >= 14 && hue <= 50;
}

/** Least-squares circle through points (x, y pairs). */
function fitCircle(xs: number[], ys: number[]) {
  const n = xs.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (let i = 0; i < n; i++) {
    const u = xs[i] - mx, v = ys[i] - my;
    suu += u * u; svv += v * v; suv += u * v;
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u;
  }
  const a = (suuu + suvv) / 2, b = (svvv + svuu) / 2;
  const det = suu * svv - suv * suv;
  if (!det) return null;
  const uc = (a * svv - b * suv) / det, vc = (b * suu - a * suv) / det;
  return { cx: uc + mx, cy: vc + my, r: Math.sqrt(uc * uc + vc * vc + (suu + svv) / n) };
}

/**
 * Least-squares ellipse through points: the code seen at an angle. Returns its centre and the 2×2
 * matrix that maps the unit circle onto it, or null if the points don't make an ellipse.
 */
function fitEllipse(xs: number[], ys: number[]) {
  const n = xs.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sc = 0;
  for (let i = 0; i < n; i++) sc += Math.hypot(xs[i] - mx, ys[i] - my);
  sc = sc / n || 1;
  // A x² + B xy + C y² + D x + E y = 1, in centred, scaled coordinates.
  const N = Array.from({ length: 5 }, () => new Array(6).fill(0));
  for (let i = 0; i < n; i++) {
    const x = (xs[i] - mx) / sc, y = (ys[i] - my) / sc;
    const row = [x * x, x * y, y * y, x, y];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) N[r][c] += row[r] * row[c];
      N[r][5] += row[r];
    }
  }
  for (let c = 0; c < 5; c++) {
    let piv = c;
    for (let r = c + 1; r < 5; r++) if (Math.abs(N[r][c]) > Math.abs(N[piv][c])) piv = r;
    [N[c], N[piv]] = [N[piv], N[c]];
    if (Math.abs(N[c][c]) < 1e-12) return null;
    for (let r = 0; r < 5; r++) {
      if (r === c) continue;
      const f = N[r][c] / N[c][c];
      for (let k = c; k < 6; k++) N[r][k] -= f * N[c][k];
    }
  }
  const [A, B, C, D, E] = N.map((row, i) => row[5] / row[i]);
  const det = 4 * A * C - B * B;
  if (det <= 0) return null;
  const cx = (B * E - 2 * C * D) / det, cy = (B * D - 2 * A * E) / det;
  const g = 1 - (A * cx * cx + B * cx * cy + C * cy * cy + D * cx + E * cy);
  if (g <= 0) return null;
  // (q)ᵀ S q = 1 with S = K / g; the unit circle maps on through S^(-1/2).
  const a = A / g, b = B / 2 / g, c = C / g;
  const tr = a + c, dt = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - dt));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  if (l2 <= 0) return null;
  let vx = b, vy = l1 - a;
  if (Math.abs(vx) + Math.abs(vy) < 1e-12) { vx = 1; vy = 0; }
  const vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
  const s1 = sc / Math.sqrt(l1), s2 = sc / Math.sqrt(l2);
  // M = V diag(s1, s2) Vᵀ, with V's columns (vx, vy) and (-vy, vx).
  const m = [vx * vx * s1 + vy * vy * s2, vx * vy * (s1 - s2), vx * vy * (s1 - s2), vy * vy * s1 + vx * vx * s2] as const;
  return { cx: cx * sc + mx, cy: cy * sc + my, m, inv: { a, b, c, sc } };
}

/**
 * Finds and reads a penguin code in an RGBA image. Returns the person's id, or "" if there isn't a
 * readable code. Works at any rotation and a fair tilt; the code should fill a fair part of the picture.
 */
export function readImage(px: ArrayLike<number>, w: number, h: number): string {
  // 1. The orange ring: collect orange pixels, fit a circle to drop the penguin's feet, then an ellipse.
  const step = Math.max(1, Math.round(Math.min(w, h) / 360));
  let xs: number[] = [], ys: number[] = [];
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      if (isOrange(px[i], px[i + 1], px[i + 2])) { xs.push(x); ys.push(y); }
    }
  if (xs.length < 60) return "";
  for (const keep of [0.35, 0.25]) {
    const c = fitCircle(xs, ys);
    if (!c) return "";
    const nx: number[] = [], ny: number[] = [];
    for (let i = 0; i < xs.length; i++) if (Math.abs(Math.hypot(xs[i] - c.cx, ys[i] - c.cy) - c.r) < keep * c.r) { nx.push(xs[i]); ny.push(ys[i]); }
    if (nx.length < 40) return "";
    xs = nx; ys = ny;
  }
  let e = fitEllipse(xs, ys);
  for (const keep of [0.15, 0.08]) {
    if (!e) return "";
    const { a, b, c, sc } = e.inv;
    const nx: number[] = [], ny: number[] = [];
    for (let i = 0; i < xs.length; i++) {
      const qx = (xs[i] - e.cx) / sc, qy = (ys[i] - e.cy) / sc;
      if (Math.abs(Math.sqrt(a * qx * qx + 2 * b * qx * qy + c * qy * qy) - 1) < keep) { nx.push(xs[i]); ny.push(ys[i]); }
    }
    if (nx.length < 40) return "";
    xs = nx; ys = ny;
    e = fitEllipse(xs, ys);
  }
  if (!e) return "";
  const { cx, cy, m } = e;
  if (Math.hypot(m[0], m[1]) < 30 || Math.hypot(m[2], m[3]) < 30) return "";

  const at = (r: number, deg: number) => {
    const t = (deg * Math.PI) / 180;
    const ux = (r / ORANGE_R) * Math.sin(t), uy = (-r / ORANGE_R) * Math.cos(t);
    return [cx + m[0] * ux + m[1] * uy, cy + m[2] * ux + m[3] * uy] as const;
  };
  const lum = (x: number, y: number) => {
    // A small average around the point, so one noisy pixel doesn't flip a bit.
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xi = Math.round(x) + dx, yi = Math.round(y) + dy;
        if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue;
        const i = (yi * w + xi) * 4;
        s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; k++;
      }
    return k ? s / k : 0;
  };
  // 2. Which way is up: the longest gap in the orange ring.
  const ring: boolean[] = [];
  for (let d = 0; d < 360; d++) {
    const [x, y] = at(ORANGE_R, d);
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return "";
    const i = (yi * w + xi) * 4;
    ring.push(isOrange(px[i], px[i + 1], px[i + 2]));
  }
  let best = -1, bestLen = 0;
  for (let d = 0; d < 360; d++) {
    if (ring[d] || !ring[(d + 359) % 360]) continue;
    let len = 0;
    while (len < 360 && !ring[(d + len) % 360]) len++;
    if (len > bestLen) { bestLen = len; best = d; }
  }
  if (best < 0 || bestLen < NOTCH_DEG * 0.4 || bestLen > NOTCH_DEG * 2.5) return "";
  const up = best + bestLen / 2;

  // 3. Read every segment, splitting dark from light at the middle of the two groups.
  const samples: number[] = [];
  // A few points across the middle of each segment; the darkest wins, so a slightly off-centre arc still counts.
  for (const { r, n } of RINGS)
    for (let s = 0; s < n; s++) {
      const mid = up + ((s + 0.5) * 360) / n;
      const spread = Math.min(1.6, 120 / n / 3);
      let v = Infinity;
      for (const da of [-spread, 0, spread]) for (const dr of [-0.012, 0.012]) v = Math.min(v, lum(...at(r + dr, mid + da)));
      samples.push(v);
    }
  const sorted = [...samples].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.15)], hi = sorted[Math.floor(sorted.length * 0.85)];
  if (hi - lo < 40) return "";
  const cut = (lo + hi) / 2;
  return decodeBits(samples.map((v) => (v < cut ? 1 : 0)));
}
