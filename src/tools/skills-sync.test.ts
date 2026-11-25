import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

// O Codex lê .agents/skills e o Claude lê .claude/skills: a fonte é .claude, a outra é cópia (npm run skills).
function files(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    out.set(full.slice(dir.length), readFileSync(full, 'utf8').replace(/\r\n/g, '\n'));
  }
  return out;
}

test('.agents/skills é igual a .claude/skills (corre npm run skills)', () => {
  expect(files('.agents/skills')).toEqual(files('.claude/skills'));
});
