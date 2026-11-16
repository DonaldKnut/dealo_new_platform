/**
 * Build dist/ then zip it for sharing / sideload (Chrome → Load unpacked still preferred for MV3).
 * Output: apps/apply-extension/dealo-apply-copilot.zip
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const zipPath = join(root, 'dealo-apply-copilot.zip');

execSync('node ./scripts/build.mjs', { cwd: root, stdio: 'inherit' });
if (!existsSync(dist)) {
  console.error('dist/ missing after build');
  process.exit(1);
}

if (existsSync(zipPath)) rmSync(zipPath);

// Prefer system tar (Windows 10+, macOS, Linux) so we avoid extra deps.
try {
  execSync(`tar -a -c -f "${zipPath}" -C "${dist}" .`, { stdio: 'inherit' });
  console.log(`Packaged ${zipPath}`);
} catch {
  // Fallback: copy instruction only
  console.warn('tar zip failed — use apps/apply-extension/dist as Load unpacked folder.');
  process.exit(0);
}
