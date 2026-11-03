import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src');

let foundErrors = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__pycache__' && entry.name !== 'node_modules') {
        scanDir(fullPath);
      }
    } else if (/\.(css|scss|less)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/backdrop-blur|backdrop-filter/i.test(line)) {
          console.error(`Glassmorphism CSS violation in ${fullPath}:${idx + 1}: ${line.trim()}`);
          foundErrors++;
        }
      });
    } else if (/\.(jsx?|tsx?|html)$/.test(entry.name)) {
      // Don't scan tests themselves for the assertion string 'backdrop-blur'
      if (fullPath.includes('test')) return;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Match className="..." or class="..." containing forbidden classes
        const classMatches = line.match(/(?:className|class)\s*=\s*["'`]([^"'`]+)["'`]/g);
        if (classMatches) {
          classMatches.forEach((cm) => {
            if (/backdrop-blur|backdrop-filter|\bbg-white\/(?:10|20|30|40|50|60|70|80)\b|\bbg-opacity-\b|\bglass\b/i.test(cm)) {
              console.error(`Glassmorphism class violation in ${fullPath}:${idx + 1}: ${cm}`);
              foundErrors++;
            }
          });
        }
      });
    }
  }
}

scanDir(srcDir);

if (foundErrors > 0) {
  console.error(`UI-02 violation: Found ${foundErrors} glassmorphism instances. Glassmorphism is strictly forbidden.`);
  process.exit(1);
} else {
  console.log('Glassmorphism check passed: Zero matches found in CSS and component classes.');
  process.exit(0);
}

