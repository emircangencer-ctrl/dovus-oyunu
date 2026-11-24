/**
 * Derlemeden önce apps/server/src/version.generated.ts dosyasını yazar: commit kodu, dal adı, derleme zamanı.
 * Kaynak sırası:
 *  1. Cloudflare Workers Builds varsayılan değişkenleri: WORKERS_CI_COMMIT_SHA, WORKERS_CI_BRANCH
 *     (https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ — "Default variables").
 *  2. GitHub Actions: GITHUB_SHA, GITHUB_HEAD_REF (PR'da kaynak dal) ya da GITHUB_REF_NAME.
 *  3. Yerel git deposu (git rev-parse).
 *  4. Hiçbiri yoksa: sürüm "dev", dal "yerel".
 * Çalıştırma: node tools/write-version.ts (Node 22 TypeScript türlerini kendisi ayıklar).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type BuildInfo = { version: string; branch: string; builtAt: string };
export type GitRunner = (args: string) => string | null;

const SHA = /^[0-9a-f]{7,40}$/;
const OUTPUT = resolve(import.meta.dirname, '../apps/server/src/version.generated.ts');

export function resolveBuildInfo(env: Record<string, string | undefined>, git: GitRunner): BuildInfo {
  const sha = pickSha(env.WORKERS_CI_COMMIT_SHA, env.GITHUB_SHA, git('rev-parse --short=7 HEAD'));
  const branch = pickBranch(
    env.WORKERS_CI_BRANCH,
    env.GITHUB_HEAD_REF,
    env.GITHUB_REF_NAME,
    git('rev-parse --abbrev-ref HEAD'),
  );
  return { version: sha ? sha.slice(0, 7) : 'dev', branch, builtAt: new Date().toISOString() };
}

function pickSha(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    const normalized = value?.trim().toLowerCase();
    if (normalized && SHA.test(normalized)) return normalized;
  }
  return null;
}

function pickBranch(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    const name = value?.trim();
    if (name && name !== 'HEAD') return name;
  }
  return 'yerel';
}

function runGit(args: string): string | null {
  try {
    return execFileSync('git', args.split(' '), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function writeVersionFile(info: BuildInfo, path: string = OUTPUT): void {
  const lines = [
    '// Bu dosya tools/write-version.ts tarafından üretilir; elle düzenlenmez ve depoya girmez.',
    `export const VERSION: string = ${JSON.stringify(info.version)};`,
    `export const BRANCH: string = ${JSON.stringify(info.branch)};`,
    `export const BUILT_AT: string = ${JSON.stringify(info.builtAt)};`,
    '',
  ];
  writeFileSync(path, lines.join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const info = resolveBuildInfo(process.env, runGit);
  writeVersionFile(info);
  console.log(`Sürüm: ${info.version} (${info.branch}) — ${info.builtAt}`);
}
