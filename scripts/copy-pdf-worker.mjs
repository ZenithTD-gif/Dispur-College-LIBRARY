import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const sourceWorker = resolve(rootDir, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetDir = resolve(rootDir, 'public');
const targetWorker = resolve(targetDir, 'pdf.worker.min.mjs');

if (existsSync(sourceWorker)) {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(sourceWorker, targetWorker);
  console.log('Copied pdf.worker.min.mjs to public/pdf.worker.min.mjs');
} else {
  console.log('pdf.worker.min.mjs not found yet; skipping copy.');
}

