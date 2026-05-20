import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'build/logo.svg'), 'utf8');

mkdirSync(join(root, 'build/icons'), { recursive: true });

const sizes = [
  { name: 'StoreLogo-1080',     size: 1080 },
  { name: 'StoreLogo-2160',     size: 2160 },
  { name: 'StoreLogo',          size: 300 },
  { name: 'Square150x150Logo',  size: 150 },
  { name: 'Square71x71Logo',    size: 71  },
  { name: 'Square44x44Logo',    size: 44  },
  { name: 'icon-256',           size: 256 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  const out = join(root, `build/icons/${name}.png`);
  writeFileSync(out, png);
  console.log(`✓ ${name}.png  (${size}×${size})`);
}
