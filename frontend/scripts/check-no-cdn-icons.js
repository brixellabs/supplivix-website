import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '..');

let foundErrors = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__pycache__' && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.vite') {
        scanDir(fullPath);
      }
    } else if (/\.(html|jsx?|tsx?|css)$/.test(entry.name)) {
      if (fullPath.includes('test')) return;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net|fontawesome\.com\/cdn|fonts\.googleapis\.com\/icon/i.test(line)) {
          console.error(`CDN icon font violation in ${fullPath}:${idx + 1}: ${line.trim()}`);
          foundErrors++;
        }
      });
    }
  }
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/cdnjs\.cloudflare\.com|unpkg\.com|jsdelivr\.net|fontawesome\.com\/cdn|fonts\.googleapis\.com\/icon/i.test(line)) {
      console.error(`CDN icon font violation in ${filePath}:${idx + 1}: ${line.trim()}`);
      foundErrors++;
    }
  });
}

scanDir(path.join(frontendDir, 'src'));
scanFile(path.join(frontendDir, 'index.html'));

if (foundErrors > 0) {
  console.error(`UI-03 violation: Found ${foundErrors} CDN icon font references.`);
  process.exit(1);
} else {
  console.log('CDN icon check passed: Zero CDN icon fonts found. Only FontAwesome SVG icons from npm.');
  process.exit(0);
}
