// Generate the PWA icons as valid PNGs with no native image tooling — a
// "Day One" sunrise: a warm sun rising over a horizon in the app's teal, for
// the new-day / fresh-start theme. `npm run icons` regenerates them.
//
// Drawn procedurally pixel-by-pixel (sky gradient, ground, sun dome clipped at
// the horizon, a fan of rays). Matches public/favicon.svg.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/* ---- PNG encoding (truecolour RGB) ---- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgbAt) {
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (stride + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = rgbAt(x, y);
      const p = row + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---- The sunrise motif ---- */

const SKY_TOP = [12, 47, 48]; // #0c2f30
const SKY_HORIZON = [26, 108, 100]; // #1a6c64 — dawn glow near the horizon
const GROUND = [8, 33, 34]; // #082122
const SUN = [243, 205, 135]; // #f3cd87
const SUN_LIGHT = [248, 219, 160]; // #f8dba0
const HORIZON = [240, 201, 135]; // #f0c987

const RAY_DIRS = [-160, -140, -120, -100, -80, -60, -40, -20]; // degrees; up = -90
const RAY_HALF = 3; // half-width of each ray, degrees

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

// scale shrinks the sun+rays toward the centre for the maskable safe zone.
function sunrise(size, scale) {
  const horizonY = size * 0.66;
  const cx = size * 0.5;
  const cy = horizonY;
  const sunR = size * 0.2 * scale;
  const rayInner = sunR + size * 0.035;
  const rayOuter = sunR + size * 0.11 * scale;
  const lineW = Math.max(1, size * 0.006);

  return (x, y) => {
    if (y >= horizonY) return GROUND;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist <= sunR) {
      const topT = clamp01((cy - y) / sunR);
      return lerp(SUN, SUN_LIGHT, topT * 0.5);
    }
    if (dist >= rayInner && dist <= rayOuter) {
      const theta = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (const dir of RAY_DIRS) {
        let d = Math.abs(theta - dir);
        if (d > 180) d = 360 - d;
        if (d <= RAY_HALF) return SUN_LIGHT;
      }
    }
    if (Math.abs(y - horizonY) <= lineW) return HORIZON;

    return lerp(SKY_TOP, SKY_HORIZON, y / horizonY);
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  // Maskable: keep the motif inside the safe zone (smaller scale).
  ["icon-maskable-512.png", 512, 0.82],
];
for (const [name, size, scale] of targets) {
  const png = encodePng(size, sunrise(size, scale));
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`✓ ${name} (${png.length} bytes)`);
}
