import { describe, expect, it } from 'vitest';
import { resolveBuildInfo } from './write-version';

const noGit = () => null;

describe('resolveBuildInfo', () => {
  it('Workers Builds değişkenlerini önce kullanır, kodu 7 karaktere kısaltır', () => {
    const info = resolveBuildInfo(
      { WORKERS_CI_COMMIT_SHA: 'ABCDEF1234567890', WORKERS_CI_BRANCH: 'asama-0', GITHUB_SHA: '1111111' },
      noGit,
    );
    expect(info).toMatchObject({ version: 'abcdef1', branch: 'asama-0' });
  });
  it("GitHub Actions'ta PR dalının adını kullanır", () => {
    const info = resolveBuildInfo(
      { GITHUB_SHA: '0123456789abcdef', GITHUB_HEAD_REF: 'asama-0', GITHUB_REF_NAME: '1/merge' },
      noGit,
    );
    expect(info).toMatchObject({ version: '0123456', branch: 'asama-0' });
  });
  it('ortam değişkeni yoksa git bilgisine düşer', () => {
    const git = (args: string) => (args.includes('--short') ? 'fedcba9' : 'main');
    expect(resolveBuildInfo({}, git)).toMatchObject({ version: 'fedcba9', branch: 'main' });
  });
  it('hiçbiri yoksa dev ve yerel döner', () => {
    expect(resolveBuildInfo({}, noGit)).toMatchObject({ version: 'dev', branch: 'yerel' });
  });
  it('kopuk HEAD durumunda dal adı yerel olur', () => {
    const git = (args: string) => (args.includes('--short') ? 'fedcba9' : 'HEAD');
    expect(resolveBuildInfo({}, git).branch).toBe('yerel');
  });
  it('geçersiz commit kodunu kabul etmez', () => {
    expect(resolveBuildInfo({ WORKERS_CI_COMMIT_SHA: 'bozuk!' }, noGit).version).toBe('dev');
  });
  it('derleme zamanını ISO biçiminde verir', () => {
    expect(resolveBuildInfo({}, noGit).builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  });
});
