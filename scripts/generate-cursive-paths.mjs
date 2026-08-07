// One-off dev script: converts "Solace" into cursive SVG path data using the
// Alex Brush font (SIL OFL), so the browser bundle never needs the font file
// or opentype.js itself. Re-run this manually if the source text ever changes:
//   node scripts/generate-cursive-paths.mjs
//
// Two opentype.js 2.0.0 quirks are worked around here, both only visible once
// glyphs are combined into one multi-letter path (never on a single glyph):
//  1. glyph.getPath(nonZeroX, ...) can emit NaN control points for some
//     glyph/offset combinations in this font, so every glyph is rendered at
//     (0,0) and the resulting commands are translated by hand instead.
//  2. Path.prototype.toPathData's roundDecimal() builds an exponent by string
//     concatenation ("decimalPart" + "e+" + places). Once translation leaves
//     a coordinate's fractional part as a tiny float (e.g. 5.68e-14) instead
//     of a clean 0, decimalPart already stringifies in exponential notation
//     and the concatenation produces a malformed literal ("...e-14e+2"), so
//     Math.round() on it returns NaN. A custom serializer that rounds with
//     plain arithmetic sidesteps it.
import opentype from 'opentype.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontBuffer = readFileSync(path.join(__dirname, 'fonts/AlexBrush-Regular.ttf'));
const font = opentype.parse(
  fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
);

const FONT_SIZE = 200;
const PADDING = FONT_SIZE * 0.15;

function translateCommand(cmd, dx, dy) {
  const shifted = { ...cmd };
  for (const key of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) {
    if (typeof shifted[key] === 'number') {
      shifted[key] += key.startsWith('x') ? dx : dy;
    }
  }
  return shifted;
}

function buildWordCommands(text) {
  const commands = [];
  font.forEachGlyph(text, 0, 0, FONT_SIZE, {}, (glyph, gX, gY) => {
    const glyphPath = glyph.getPath(0, 0, FONT_SIZE);
    for (const cmd of glyphPath.commands) {
      commands.push(translateCommand(cmd, gX, gY));
    }
  });
  return commands;
}

function boundingBox(commands) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const cmd of commands) {
    for (const key of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) {
      const v = cmd[key];
      if (typeof v !== 'number') continue;
      if (key[0] === 'x') {
        x1 = Math.min(x1, v);
        x2 = Math.max(x2, v);
      } else {
        y1 = Math.min(y1, v);
        y2 = Math.max(y2, v);
      }
    }
  }
  return { x1, y1, x2, y2 };
}

function num(n) {
  return (Math.round(n * 100) / 100).toString();
}

function serialize(commands) {
  let d = '';
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        d += `M${num(cmd.x)} ${num(cmd.y)}`;
        break;
      case 'L':
        d += `L${num(cmd.x)} ${num(cmd.y)}`;
        break;
      case 'C':
        d += `C${num(cmd.x1)} ${num(cmd.y1)} ${num(cmd.x2)} ${num(cmd.y2)} ${num(cmd.x)} ${num(cmd.y)}`;
        break;
      case 'Q':
        d += `Q${num(cmd.x1)} ${num(cmd.y1)} ${num(cmd.x)} ${num(cmd.y)}`;
        break;
      case 'Z':
        d += 'Z';
        break;
      default:
        throw new Error(`Unhandled path command type: ${cmd.type}`);
    }
  }
  return d;
}

function toEntry(key, text) {
  const raw = buildWordCommands(text);
  const box = boundingBox(raw);
  const width = box.x2 - box.x1 + PADDING * 2;
  const height = box.y2 - box.y1 + PADDING * 2;
  const shifted = raw.map((cmd) => translateCommand(cmd, PADDING - box.x1, PADDING - box.y1));
  const d = serialize(shifted);
  if (d.includes('NaN')) {
    throw new Error(`Generated NaN path data for ${JSON.stringify(text)} — investigate before shipping.`);
  }
  return {
    key,
    text,
    d,
    viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`,
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
  };
}

const entries = [toEntry('solace', 'Solace')];

const banner = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/generate-cursive-paths.mjs from Alex Brush (SIL OFL 1.1).
// Re-run that script if the source text ever changes.
`;

const body = `export interface CursivePath {
  text: string;
  d: string;
  viewBox: string;
  width: number;
  height: number;
}

export const CURSIVE_PATHS: Record<'solace', CursivePath> = {
${entries
  .map(
    (e) => `  ${e.key}: {
    text: ${JSON.stringify(e.text)},
    d: ${JSON.stringify(e.d)},
    viewBox: ${JSON.stringify(e.viewBox)},
    width: ${e.width},
    height: ${e.height},
  },`
  )
  .join('\n')}
};
`;

const outPath = path.join(__dirname, '../src/lib/cursivePaths.generated.ts');
writeFileSync(outPath, banner + body);
console.log(`Wrote ${outPath}`);
