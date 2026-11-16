import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const watch = process.argv.includes('--watch');

mkdirSync(dist, { recursive: true });
mkdirSync(join(dist, 'icons'), { recursive: true });

const entries = {
  background: join(root, 'src/background.ts'),
  'content/bridge': join(root, 'src/content/bridge.ts'),
  'content/fill': join(root, 'src/content/fill.ts'),
  'popup/popup': join(root, 'src/popup/popup.ts'),
};

const ctx = await esbuild.context({
  entryPoints: entries,
  bundle: true,
  outdir: dist,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  logLevel: 'info',
});

async function copyStatic() {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));
  cpSync(join(root, 'src/popup/popup.html'), join(dist, 'popup/popup.html'));
  cpSync(join(root, 'src/popup/popup.css'), join(dist, 'popup/popup.css'));
  cpSync(join(root, 'icons'), join(dist, 'icons'), { recursive: true });
}

if (watch) {
  await ctx.watch();
  await copyStatic();
  console.log('Watching apply-extension… load dist/ as unpacked in chrome://extensions');
} else {
  await ctx.rebuild();
  await copyStatic();
  await ctx.dispose();
  console.log('Built apps/apply-extension/dist — load that folder as an unpacked extension');
}
