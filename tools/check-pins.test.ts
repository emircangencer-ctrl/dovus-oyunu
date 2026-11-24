import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = globSync('**/package.json', { exclude: (p) => p.includes('node_modules') });

describe('bağımlılık sürümleri', () => {
  it.each(files)('%s içindeki her sürüm tam sabit', (file) => {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(all)) {
      expect(version, `${file} → ${name}`).toMatch(/^(\d+\.\d+\.\d+(-[\w.]+)?|workspace:\*)$/);
    }
  });
});
