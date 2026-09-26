// extension/scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard Precomputed CRC32 Lookup Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: 13-byte standard header
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // 8 bits per channel
  ihdrData[9] = 6;  // RGBA color type
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Filter method 0
  ihdrData[12] = 0; // Non-interlaced
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT: Scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    const rawOffset = y * scanlineLength;
    rawData[rawOffset] = 0; // Filter byte 0 (None)
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(rawData, rawOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND: Stream terminator
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function inHexagon(x, y, r) {
  const q2x = Math.abs(x);
  const q2y = Math.abs(y);
  if (q2x > r || q2y > r * 0.866025) return false;
  return 2 * 0.866025 * r - 0.866025 * q2x - q2y >= 0;
}

function distToHexagonEdge(x, y, r) {
  const q2x = Math.abs(x);
  const q2y = Math.abs(y);
  const d1 = r - q2x;
  const d2 = r * 0.866025 - q2y;
  const d3 = (2 * 0.866025 * r - 0.866025 * q2x - q2y) / Math.sqrt(0.866025 * 0.866025 + 1);
  return Math.min(d1, d2, d3);
}

export function renderLocusIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cornerRadius = size * 0.22;
  const half = size / 2;
  const ringWidth = Math.max(1, size * 0.028);
  const tickWidth = Math.max(0.7, size * 0.03);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = x - half + 0.5;
      const cy = y - half + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const angle = Math.atan2(cy, cx);

      // Squircle boundary check
      const ax = Math.abs(cx);
      const ay = Math.abs(cy);
      const edgeDist = half - Math.max(ax, ay);
      
      let inside = false;
      const innerHalf = half - cornerRadius;
      if (ax <= innerHalf || ay <= innerHalf) {
        inside = (ax <= half && ay <= half);
      } else {
        const cdx = ax - innerHalf;
        const cdy = ay - innerHalf;
        inside = (cdx * cdx + cdy * cdy <= cornerRadius * cornerRadius);
      }

      if (!inside) {
        buf[idx] = 0; buf[idx + 1] = 0; buf[idx + 2] = 0; buf[idx + 3] = 0;
        continue;
      }

      // Default Canvas Fill: #0b0f17
      let r = 11, g = 15, b = 23, a = 255;

      // Outer Border Stroke: #1e293b
      if (edgeDist < Math.max(1.2, size * 0.025)) {
        r = 30; g = 41; b = 59;
      }

      // Outer Dashed Coordinate Radar Ring: #312e81
      const rOuter = size * 0.35;
      if (Math.abs(dist - rOuter) < ringWidth * 0.8) {
        const dashSeg = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 24);
        if (size >= 32 ? (dashSeg % 2 === 0) : true) {
          r = 49; g = 46; b = 129;
        }
      }

      // Primary Target Gradient Ring (Cyan -> Indigo -> Emerald)
      const rTarget = size * 0.24;
      if (Math.abs(dist - rTarget) < ringWidth * 1.1) {
        const normAngle = (angle + Math.PI) / (2 * Math.PI);
        if (normAngle < 0.5) {
          const t = normAngle * 2;
          r = Math.round(6 + (99 - 6) * t);
          g = Math.round(182 + (102 - 182) * t);
          b = Math.round(212 + (241 - 212) * t);
        } else {
          const t = (normAngle - 0.5) * 2;
          r = Math.round(99 + (16 - 99) * t);
          g = Math.round(102 + (185 - 102) * t);
          b = Math.round(241 + (129 - 241) * t);
        }
      }

      // Reticle Cardinal Crosshair Ticks (Cyan #06b6d4)
      const isVerticalCross = Math.abs(cx) <= tickWidth && (
        (cy >= -size * 0.44 && cy <= -size * 0.32) ||
        (cy >= size * 0.32 && cy <= size * 0.44)
      );
      const isHorizontalCross = Math.abs(cy) <= tickWidth && (
        (cx >= -size * 0.44 && cx <= -size * 0.32) ||
        (cx >= size * 0.32 && cx <= size * 0.44)
      );

      if (isVerticalCross || isHorizontalCross) {
        r = 6; g = 182; b = 212;
      }

      // Hexagonal Tactical Nexus
      const hexRadius = size * 0.16;
      if (inHexagon(cx, cy, hexRadius)) {
        r = 15; g = 23; b = 42; // #0f172a
        const dEdge = distToHexagonEdge(cx, cy, hexRadius);
        if (dEdge < ringWidth * 1.0) {
          r = 6; g = 182; b = 212; // Cyan border
        }
      }

      // Central Pulse Point
      const coreRadius = Math.max(1.5, size * 0.065);
      if (dist <= coreRadius) {
        if (dist <= coreRadius * 0.5) {
          r = 224; g = 242; b = 254; // Bright white-blue core
        } else {
          r = 56; g = 189; b = 248;  // Sky blue glow #38bdf8
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

export function generateAllIcons(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sizes = [16, 32, 48, 128];
  const results = [];

  for (const size of sizes) {
    const buf = renderLocusIcon(size);
    const png = encodePNG(size, size, buf);
    const targetFile = path.join(outputDir, `icon-${size}.png`);
    fs.writeFileSync(targetFile, png);
    results.push({ size, path: targetFile, bytes: png.length });
  }

  return results;
}

// Standalone execution support
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectExecution) {
  const targetDir = path.resolve(__dirname, '../public/icons');
  const generated = generateAllIcons(targetDir);
  console.log('✅ Generated Locus Extension icons:');
  generated.forEach(g => console.log(`   - ${g.size}x${g.size} -> ${g.path} (${g.bytes} bytes)`));
}
