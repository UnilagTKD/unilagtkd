import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const secrets = Object.entries(process.env).filter(([name, value]) =>
  !name.startsWith('NEXT_PUBLIC_') && /(?:SECRET|DATABASE_URL|API_KEY|PASSWORD|TOKEN)/.test(name) && value && value.length >= 12
);
let filesChecked = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspect(file);
    else if (/\.(?:js|map)$/.test(entry.name)) {
      assert.ok(!file.endsWith('.map'), 'A browser source map was emitted: ' + file);
      const content = await readFile(file, 'utf8');
      for (const [, secret] of secrets) {
        assert.ok(!content.includes(secret) && !content.includes(encodeURIComponent(secret)), 'A private environment value appears in browser output: ' + file);
      }
      filesChecked++;
    }
  }
}
await inspect('.next/static');
console.log(`Browser output checked: ${filesChecked} files, ${secrets.length} private environment values; no matches or public source maps.`);
