import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex matching unicode emojis
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25B6}\u{25C0}]/gu;

const srcDir = path.resolve(__dirname, '../src');

let foundErrors = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(jsx?|tsx?|html|css|json)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const match = line.match(emojiRegex);
        if (match) {
          console.error(`Emoji violation in ${fullPath}:${idx + 1}: ${match.join(' ')}`);
          foundErrors++;
        }
      });
    }
  }
}

scanDir(srcDir);

if (foundErrors > 0) {
  console.error(`Rule 1 violation: Found ${foundErrors} emoji instances. Emojis are strictly forbidden.`);
  process.exit(1);
} else {
  console.log('Emoji check passed: Zero emojis found in src/.');
  process.exit(0);
}
