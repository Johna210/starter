// Materializer tests for shape 1 + AI on (issue #17).
//
// The TS-monolith + AI-on composition: everything shape 1 ships
// (apps/web + apps/api + packages/{shared,db,auth,api-client}) plus:
//
//   - packages/ai      — a TS library workspace exposing the composable
//     AI primitives (decision 20): chat completion (with streaming),
//     embeddings, a VectorStore interface (pgvector default, reusing
//     decision 14's Postgres), and tool/function calling. Each
//     primitive is a real typed layer over a vetted SDK (the `openai`
//     package) — not a stub. NO example composition.
//   - packages/db      — gains the embeddings schema + a pgvector
//     migration (0003_embeddings.sql, CREATE EXTENSION vector) so the
//     default VectorStore has a real table to live in.
//   - docs/wire-it-in/ — the AI fences (decision 20) land only when AI
//     is on; a non-AI project carries zero AI dependency surface
//     (decision 21: absent, not unused).
//
// This is an UNBLESSED combination (decisions 24/29): generatable,
// but AI is not in the CI-tested matrix.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GO_MONOLITH_NEXT,
  isImplemented,
  TS_MONOLITH_VITE,
  TS_MONOLITH_VITE_AI,
} from '../src/composition.js';
import { materialize } from '../src/materialize.js';

async function expectMissing(p: string): Promise<void> {
  try {
    await stat(p);
    expect.fail(`${p} should NOT exist`);
  } catch (err) {
    expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
  }
}

describe('TS-monolith + Vite + AI on (shape 1 + AI, issue #17)', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-ts-ai-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it('is a materializable (but UNBLESSED, decision 24/29) composition', () => {
    expect(isImplemented(TS_MONOLITH_VITE_AI)).toBe(true);
    // Other non-AI shapes + AI remain unimplemented (only TS-monolith +
    // Go-microservices are AI-capable today).
    expect(isImplemented({ ...GO_MONOLITH_NEXT, ai: 'on' })).toBe(false);
  });

  it('writes the packages/ai workspace with the four composable primitives (decision 20)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const aiDir = join(targetDir, 'packages/ai');
    for (const file of [
      'package.json',
      'tsconfig.json',
      '.env.example',
      'src/index.ts',
      'src/types.ts',
      'src/config.ts',
      'src/provider.ts',
      'src/chat.ts',
      'src/embeddings.ts',
      'src/vector-store.ts',
      'src/tool-call.ts',
      'src/fakes.ts',
      'src/chat.test.ts',
      'src/embeddings.test.ts',
      'src/vector-store.test.ts',
      'src/tool-call.test.ts',
    ]) {
      expect((await stat(join(aiDir, file))).isFile(), `packages/ai/${file} should exist`).toBe(true);
    }
    // The four primitives (decision 20): chat (with streaming),
    // embeddings, VectorStore interface, tool/function calling.
    const chat = await readFile(join(aiDir, 'src/chat.ts'), 'utf8');
    expect(chat).toContain('chatComplete');
    expect(chat).toMatch(/stream/i);
    expect(chat).toMatch(/AsyncIterable/);
    const emb = await readFile(join(aiDir, 'src/embeddings.ts'), 'utf8');
    expect(emb).toMatch(/export\s+(async\s+)?function\s+embed\b/);
    const vs = await readFile(join(aiDir, 'src/vector-store.ts'), 'utf8');
    expect(vs).toMatch(/interface\s+VectorStore/);
    expect(vs).toContain('PgVectorStore');
    expect(vs).toContain('cosineSimilarity');
    expect(vs).toMatch(/pgvector/i);
    expect(vs).toContain('@starter/db');
    expect(vs).toContain('drizzle-orm/node-postgres');
    const tools = await readFile(join(aiDir, 'src/tool-call.ts'), 'utf8');
    expect(tools).toMatch(/export\s+(async\s+)?function\s+toolCall\b/);
    expect(tools).toContain('ToolRegistry');
    // The real provider wraps a vetted SDK (decision 20: not a stub).
    const provider = await readFile(join(aiDir, 'src/provider.ts'), 'utf8');
    expect(provider).toMatch(/from\s+['"]openai['"]/);
    expect(provider).toContain('OpenAI');
    // zod-validated config (decision 28) reading the LLM API key.
    const cfg = await readFile(join(aiDir, 'src/config.ts'), 'utf8');
    expect(cfg).toContain('zod');
    expect(cfg).toMatch(/OPENAI_API_KEY/);
    expect(cfg).toMatch(/readAiConfig/);
    // The workspace declares the vetted SDK + the db seam as deps.
    const pkg = JSON.parse(await readFile(join(aiDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('@starter/ai');
    expect(pkg.dependencies['openai']).toEqual(expect.any(String));
    expect(pkg.dependencies['zod']).toEqual(expect.any(String));
    expect(pkg.dependencies['@starter/db']).toBe('workspace:*');
    expect(pkg.dependencies['drizzle-orm']).toEqual(expect.any(String));
  });

  it('packages/ai ships unit tests for the primitives (decision 22)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const aiDir = join(targetDir, 'packages/ai');
    // The tests exercise the primitives against a FakeProvider — a
    // mocked-LLM round-trip is a unit test, not a CI integration
    // (decision 29). No vi.mock of the SDK: the fake is a real seam.
    for (const f of ['src/chat.test.ts', 'src/embeddings.test.ts', 'src/vector-store.test.ts', 'src/tool-call.test.ts']) {
      const t = await readFile(join(aiDir, f), 'utf8');
      expect(t).not.toMatch(/vi\.mock/);
    }
    const fakes = await readFile(join(aiDir, 'src/fakes.ts'), 'utf8');
    expect(fakes).toContain('FakeProvider');
  });

  it('NO example composition is shipped (decision 20)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    // No apps/api-rag or similar — apps stays {api, web}.
    const apps = await readdir(join(targetDir, 'apps'));
    expect(apps).toEqual(['api', 'web']);
    // The barrel is exactly the four primitives + config/types — nothing
    // composed from them (no RAG product, no assistant, no demo).
    const idx = await readFile(join(targetDir, 'packages/ai/src/index.ts'), 'utf8');
    for (const forbidden of ['rag', 'assistant', 'recommend']) {
      expect(idx, `packages/ai must not compose a product at ${forbidden}`).not.toMatch(
        new RegExp(forbidden, 'i'),
      );
    }
    // The api doesn't mount any AI surface (composing is the user's job).
    const apiIdx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
    expect(apiIdx).not.toMatch(/@starter\/ai/);
  });

  it('packages/db gains the embeddings schema + pgvector migration (0003, decision 14 reuse)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const dbDir = join(targetDir, 'packages/db');
    expect((await stat(join(dbDir, 'src/schema/embeddings.ts'))).isFile()).toBe(true);
    const sql = await readFile(join(dbDir, 'migrations/0003_embeddings.sql'), 'utf8');
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS "?vector"?/i);
    expect(sql).toMatch(/CREATE TABLE/i);
    expect(sql).toMatch(/embeddings/i);
    // The drizzle meta journal tracks the new migration in order.
    const journal = JSON.parse(
      await readFile(join(dbDir, 'migrations/meta/_journal.json'), 'utf8'),
    );
    const tags = journal.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toEqual(['0000_items', '0001_users', '0002_refresh_tokens', '0003_embeddings']);
    // The db barrel re-exports the embeddings table.
    const idx = await readFile(join(dbDir, 'src/index.ts'), 'utf8');
    expect(idx).toContain('embeddingsTable');
  });

  it('the AI wire-it-in fences land in docs/wire-it-in/ai.md and describe the real primitives (issue 08 + 17)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const md = await readFile(join(targetDir, 'docs/wire-it-in/ai.md'), 'utf8');
    // The four primitives + the config seam + the no-example-composition
    // stance (decision 20/28).
    expect(md).toMatch(/chat/);
    expect(md).toMatch(/embed/);
    expect(md).toMatch(/VectorStore/i);
    expect(md).toMatch(/tool/i);
    expect(md).toMatch(/OPENAI_API_KEY/);
    expect(md).toMatch(/no example composition/i);
  });

  it('root Taskfile declares a test:ai target wired into the `test` meta-task', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    expect(tf, 'Taskfile should declare test:ai').toMatch(/^  test:ai:/m);
    expect(tf).toContain('packages/ai');
    const testBlock = tf.match(/^  test:\n(?:    .+\n)+/m);
    expect(testBlock, '`test` task should exist').toBeTruthy();
    expect(testBlock![0]).toMatch(/test:ai/);
  });

  it('the README documents packages/ai, the primitives, and the not-CI-tested warning', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_AI);
    const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/packages\/ai/i);
    expect(readme).toMatch(/composable AI primitives|AI primitives/i);
    expect(readme).toMatch(/NOT CI-tested/i);
    expect(readme).toMatch(/no example composition/i);
    expect(readme).toMatch(/OPENAI_API_KEY/);
  });

  it('the AI workspace + fences are absent when AI is off (decision 21: absent, not unused)', async () => {
    await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
    await expectMissing(join(targetDir, 'packages/ai'));
    await expectMissing(join(targetDir, 'docs/wire-it-in/ai.md'));
    // Zero AI dependency surface: no workspace depends on @starter/ai.
    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
    expect(JSON.stringify(pkg)).not.toContain('@starter/ai');
  });
});

describe('runCli — TS-monolith + AI on (issue #17)', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-fs-cli-ts-ai-test-'));
    originalCwd = process.cwd();
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  it('materializes the AI-on composition and emits the documented not-CI-tested warning (decision 24)', async () => {
    const { runCli } = await import('../src/cli.js');
    const result = await runCli(['ts-ai-app'], {
      noExit: true,
      answers: { backend: 'ts', topology: 'monolith', web: 'vite', mobile: 'none', ai: 'on' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition).toEqual(TS_MONOLITH_VITE_AI);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(' ')).toMatch(/NOT CI-tested/i);
    const targetDir = join(workDir, 'ts-ai-app');
    expect((await stat(join(targetDir, 'packages/ai/package.json'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'packages/ai/src/chat.ts'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'docs/wire-it-in/ai.md'))).isFile()).toBe(true);
  });
});
