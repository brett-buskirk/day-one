// Generate the 1200x630 Open Graph / social-preview image so a shared link
// (LinkedIn, etc.) renders with a branded card instead of a bare, imageless
// one. Drawn procedurally with no native image tooling — the same sunrise
// motif, palette, and pure-Node PNG encoder as scripts/make-icons.mjs, extended
// to a landscape banner. `npm run og` regenerates it into public/og-image.png.
//
// og:image must be an absolute URL and the crawler fetches the file directly,
// so it lives at the site root (public/ → dist/). index.html references it as
// https://dayone-sim.app/og-image.png.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
const WIDTH = 1200; // LinkedIn/OG card is 1.91:1
const HEIGHT = 630;

/* ---- PNG encoding (truecolour RGB) — identical scheme to make-icons.mjs ---- */

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
function encodePng(width, height, rgbAt) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbAt(x, y);
      const p = row + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---- The sunrise motif (landscape) — palette shared with make-icons.mjs ---- */

const SKY_TOP = [12, 47, 48]; // #0c2f30
const SKY_HORIZON = [26, 108, 100]; // #1a6c64 — dawn glow near the horizon
const GROUND = [8, 33, 34]; // #082122
const GROUND_DEEP = [5, 24, 25]; // ground deepens toward the bottom edge
const SUN = [243, 205, 135]; // #f3cd87
const SUN_LIGHT = [248, 219, 160]; // #f8dba0
const HORIZON = [240, 201, 135]; // #f0c987 — the lit horizon line

// A full fan of rays across the sky (up = -90 degrees).
const RAY_DIRS = [-170, -150, -130, -110, -90, -70, -50, -30, -10];
const RAY_HALF = 2.3; // half-width of each ray, degrees

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

function sunrise(width, height) {
  const horizonY = height * 0.7;
  const cx = width * 0.5;
  const cy = horizonY; // sun sits on the horizon, so only its top dome shows
  const sunR = height * 0.19;
  const halo = sunR * 2.1;
  const rayInner = sunR + height * 0.04;
  const rayOuter = sunR + height * 0.26;
  const lineW = Math.max(1, height * 0.004);

  return (x, y) => {
    // Ground: below the horizon, deepening toward the bottom edge.
    if (y >= horizonY) {
      const t = clamp01((y - horizonY) / (height - horizonY));
      return lerp(GROUND, GROUND_DEEP, t);
    }

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    // Sun disc.
    if (dist <= sunR) {
      const topT = clamp01((cy - y) / sunR);
      return lerp(SUN, SUN_LIGHT, topT * 0.5);
    }

    // Sky base (top → horizon glow); rays and halo blend over it.
    const sky = lerp(SKY_TOP, SKY_HORIZON, y / horizonY);

    // Rays, fading out toward their tips.
    if (dist >= rayInner && dist <= rayOuter) {
      const theta = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (const dir of RAY_DIRS) {
        let d = Math.abs(theta - dir);
        if (d > 180) d = 360 - d;
        if (d <= RAY_HALF) {
          const fade = 1 - clamp01((dist - rayInner) / (rayOuter - rayInner));
          return lerp(sky, SUN_LIGHT, 0.2 + 0.55 * fade);
        }
      }
    }

    // Lit horizon line.
    if (Math.abs(y - horizonY) <= lineW) return HORIZON;

    // Soft halo hugging the sun, easing into the sky.
    if (dist < halo) {
      const g = 1 - clamp01((dist - sunR) / (halo - sunR));
      return lerp(sky, SUN_LIGHT, 0.32 * g * g);
    }

    return sky;
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const png = encodePng(WIDTH, HEIGHT, sunrise(WIDTH, HEIGHT));
writeFileSync(join(OUT_DIR, "og-image.png"), png);
console.log(`✓ og-image.png (${WIDTH}x${HEIGHT}, ${png.length} bytes)`);
