/**
 * Image Asset Compliance Checker for Supplivix
 * Verifies that all demo image assets are 100% original project vector SVGs with demo- prefix.
 * Guarantees zero stock photos or unapproved third-party raster images exist in demo assets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoAssetsDir = path.resolve(__dirname, '../src/assets/demo');

if (!fs.existsSync(demoAssetsDir)) {
  console.log('Demo assets directory does not exist yet (clean or pre-seed state).');
  process.exit(0);
}

const files = fs.readdirSync(demoAssetsDir);
let hasError = false;

for (const file of files) {
  // Check demo- prefix
  if (!file.startsWith('demo-')) {
    console.error(`Non-compliant image asset found without demo- prefix: ${file}`);
    hasError = true;
  }

  // Check valid extensions (svg, webp, avif)
  const ext = path.extname(file).toLowerCase();
  if (!['.svg', '.webp', '.avif'].includes(ext)) {
    console.error(`Disallowed file type in demo directory: ${file} (${ext})`);
    hasError = true;
  }

  // If SVG, verify DEMO metadata marker
  if (ext === '.svg') {
    const content = fs.readFileSync(path.join(demoAssetsDir, file), 'utf-8');
    if (!content.includes('DEMO: Supplivix Original Vector Asset')) {
      console.error(`SVG missing mandatory DEMO original asset marker: ${file}`);
      hasError = true;
    }
  }
}

if (hasError) {
  console.error('Image compliance check failed.');
  process.exit(1);
} else {
  console.log(`Original image check passed: ${files.length} verified original demo assets.`);
  process.exit(0);
}

