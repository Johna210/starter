// Materializer tests for shape 4 + AI on (issue #16).
//
// The Go-microservices + AI-on composition: everything shape 4 ships
// (apps/api + apps/api-auth + apps/web + packages/contract) plus:
//
//   - apps/ai          — a Python/FastAPI service exposing the
//     composable AI primitives (decision 20): chat completion (with
//     streaming), embeddings, a VectorStore interface, tool/function
//     calling. Tooled with ruff (decision 29). NO example composition.
//   - packages/contract — gains the AI service's Python-generated spec
//     (openapi.ai.yaml) + a generated Go client (clients/go) that
//     apps/api consumes via a local go.mod replace.
//   - apps/api         — mounts /ai JSON proxy routes that call
//     apps/ai ONLY through that Go client (decision 5: the AI service
//     is called by the Go api, never by the web app directly, never
//     by raw HTTP).
//
// This is an UNBLESSED combination (decisions 24/29): generatable,
// but AI is not in the CI-tested matrix.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GO_MICROSERVICES_NEXT,
  GO_MICROSERVICES_NEXT_AI,
  isImplemented,
  TS_MONOLITH_VITE,
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

describe('Go-microservices + Next + AI on (shape 4 + AI, issue #16)', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-go-ms-ai-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it('is a materializable (but UNBLESSED, decision 24/29) composition', () => {
    expect(isImplemented(GO_MICROSERVICES_NEXT_AI)).toBe(true);
    // AI is not a blessed-combo axis: the TS-monolith + AI combination
    // is also generatable (issue #17), but other shapes + AI remain
    // unimplemented.
    expect(isImplemented({ ...TS_MONOLITH_VITE, ai: 'on' })).toBe(true);
  });

  it('writes the AI service with the four composable primitives (decision 20)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const aiDir = join(targetDir, 'apps/ai');
    for (const file of [
      'pyproject.toml',
      '.env.example',
      'app/main.py',
      'app/config.py',
      'app/primitives/models.py',
      'app/primitives/provider.py',
      'app/primitives/vector_store.py',
      'app/primitives/tools.py',
      'scripts/export_openapi.py',
      'tests/test_chat.py',
      'tests/test_embeddings.py',
      'tests/test_vector_store.py',
      'tests/test_tools.py',
      'tests/test_contract.py',
    ]) {
      expect((await stat(join(aiDir, file))).isFile(), `apps/ai/${file} should exist`).toBe(true);
    }
    // The four primitives (decision 20): chat (with streaming),
    // embeddings, VectorStore interface, tool/function calling.
    const main = await readFile(join(aiDir, 'app/main.py'), 'utf8');
    for (const route of [
      '/ai/chat/completions',
      '/ai/embeddings',
      '/ai/vector-store/upsert',
      '/ai/vector-store/search',
    ]) {
      expect(main, `apps/ai should expose ${route}`).toContain(route);
    }
    expect(main).toContain('StreamingResponse');
    expect(main).toContain('text/event-stream');
    const vs = await readFile(join(aiDir, 'app/primitives/vector_store.py'), 'utf8');
    expect(vs).toMatch(/class VectorStore\(Protocol\)/);
    expect(vs).toMatch(/cosine_similarity/);
    const tools = await readFile(join(aiDir, 'app/primitives/tools.py'), 'utf8');
    expect(tools).toMatch(/class ToolRegistry/);
    // The real provider wraps a vetted SDK (decision 20: not a stub).
    const provider = await readFile(join(aiDir, 'app/primitives/provider.py'), 'utf8');
    expect(provider).toContain('AsyncOpenAI');
    // Decision 29: ruff is the one Python tool.
    const pyproject = await readFile(join(aiDir, 'pyproject.toml'), 'utf8');
    expect(pyproject).toContain('[tool.ruff]');
    expect(pyproject).toContain('ruff');
    expect(pyproject).toContain('fastapi');
    expect(pyproject).toContain('openai');
  });

  it('NO example composition is shipped (decision 20)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const main = await readFile(join(targetDir, 'apps/ai/app/main.py'), 'utf8');
    // The surface is exactly the four primitives — nothing composed
    // from them (no RAG endpoint, no assistant product, no demo
    // composition route). Chat completion IS a primitive, so only
    // assembled-product paths are forbidden.
    for (const forbidden of ['/rag', '/assistant', '/recommend']) {
      expect(main, `apps/ai must not compose a product at ${forbidden}`).not.toContain(forbidden);
    }
    const spec = await readFile(join(targetDir, 'packages/contract/openapi.ai.yaml'), 'utf8');
    for (const p of ['/ai/chat/completions', '/ai/embeddings', '/ai/vector-store/upsert', '/ai/vector-store/search']) {
      expect(spec).toContain(p);
    }
    for (const forbidden of ['/rag', '/assistant']) {
      expect(spec, `openapi.ai.yaml must not document ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('packages/contract gains the AI spec + a generated Go client (consumed by apps/api)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const contractDir = join(targetDir, 'packages/contract');
    for (const file of [
      'openapi.ai.yaml',
      'scripts/generate-go-client.mjs',
      'clients/go/go.mod',
      'clients/go/client.go',
      'clients/go/README.md',
      'test/generated-go.test.ts',
    ]) {
      expect((await stat(join(contractDir, file))).isFile(), `packages/contract/${file} should exist`).toBe(true);
    }
    // The Go client exposes the four primitives (the seam apps/api
    // consumes).
    const client = await readFile(join(contractDir, 'clients/go/client.go'), 'utf8');
    for (const m of ['ChatCompletions', 'Embeddings', 'VectorStoreUpsert', 'VectorStoreSearch']) {
      expect(client, `client.go should expose ${m}`).toContain(`func (c *Client) ${m}(`);
    }
    // The client module is stdlib-only + locally replaced (no network
    // fetch; the monorepo stays self-contained).
    const goMod = await readFile(join(contractDir, 'clients/go/go.mod'), 'utf8');
    expect(goMod).toContain('module starter/contract/ai-client');
    // The web-facing merged spec is overridden to include the /ai
    // proxy surface, and the tripwire covers it.
    const merged = await readFile(join(contractDir, 'openapi.yaml'), 'utf8');
    expect(merged).toContain('/ai/chat/completions');
    const genTest = await readFile(join(contractDir, 'test/generated.test.ts'), 'utf8');
    expect(genTest).toContain('/ai/chat/completions');
    const genGoTest = await readFile(join(contractDir, 'test/generated-go.test.ts'), 'utf8');
    expect(genGoTest).toContain('generate-go-client');
  });

  it('apps/api calls apps/ai via the generated Go client — never raw HTTP (decision 5)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const apiDir = join(targetDir, 'apps/api');
    // The AI module mounts the /ai proxies.
    expect((await stat(join(apiDir, 'internal/ai/module.go'))).isFile()).toBe(true);
    expect((await stat(join(apiDir, 'internal/ai/module_test.go'))).isFile()).toBe(true);
    const module = await readFile(join(apiDir, 'internal/ai/module.go'), 'utf8');
    for (const route of ['/chat/completions', '/embeddings', '/vector-store/upsert', '/vector-store/search']) {
      expect(module, `internal/ai should mount ${route}`).toContain(route);
    }
    // The module's only relationship to the service is the client.
    expect(module).toContain('starter/contract/ai-client');
    expect(module).toContain('aiclient.Client');
    // go.mod replaces the local client; no raw HTTP client for AI.
    const goMod = await readFile(join(apiDir, 'go.mod'), 'utf8');
    expect(goMod).toContain('starter/contract/ai-client v0.0.0');
    expect(goMod).toContain('replace starter/contract/ai-client => ../../packages/contract/clients/go');
    const mainGo = await readFile(join(apiDir, 'cmd/api/main.go'), 'utf8');
    expect(mainGo).toContain('aiclient.NewClient');
    const cfg = await readFile(join(apiDir, 'internal/config/config.go'), 'utf8');
    expect(cfg).toContain('AIServiceURL');
    const env = await readFile(join(apiDir, '.env.example'), 'utf8');
    expect(env).toContain('AI_SERVICE_URL');
    // Streaming is served by the AI service directly; the api's JSON
    // proxy rejects it with a documented 422.
    expect(module).toContain('422');
    expect(module).toContain('text/event-stream');
  });

  it('the AI service is absent when AI is off (decision 21: absent, not unused)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    await expectMissing(join(targetDir, 'apps/ai'));
  });

  it('task dev brings up the AI service alongside the stack; test/lint/install tasks exist', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    const devBlock = tf.match(/^  dev:\n(?:    .+\n)+/m);
    expect(devBlock![0]).toMatch(/dev:ai/);
    expect(devBlock![0]).toMatch(/dev:api/);
    expect(devBlock![0]).toMatch(/dev:api-auth/);
    expect(devBlock![0]).toMatch(/dev:web/);
    expect(tf).toMatch(/^  dev:ai:/m);
    expect(tf).toMatch(/uvicorn/);
    expect(tf).toMatch(/^  ai:install:/m);
    expect(tf).toMatch(/^  ai:test:/m);
    expect(tf).toMatch(/^  ai:lint:/m);
    expect(tf).toMatch(/ruff/);
    // test includes the AI suite; contract:generate regenerates the AI
    // spec + Go client.
    expect(tf).toMatch(/- task ai:test/);
    expect(tf).toMatch(/- task ai:lint/);
    const cgBlock = tf.match(/^  contract:generate:\n(?:    .+\n)+/m);
    expect(cgBlock![0]).toMatch(/export_openapi/);
    expect(cgBlock![0]).toMatch(/generate-go-client/);
  });

  it('the README documents the AI service, its seam, and the not-CI-tested warning', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_AI);
    const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/apps\/ai/i);
    expect(readme).toMatch(/FastAPI/i);
    expect(readme).toMatch(/task ai:install/);
    expect(readme).toMatch(/composable AI primitives/i);
    expect(readme).toMatch(/NOT CI-tested/i);
    expect(readme).toMatch(/openapi\.ai\.yaml/i);
    expect(readme).toMatch(/no example composition/i);
  });
});

describe('runCli — Go-microservices + AI on (issue #16)', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-fs-cli-go-ms-ai-test-'));
    originalCwd = process.cwd();
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  it('materializes the AI-on composition and emits the documented not-CI-tested warning (decision 24)', async () => {
    const { runCli } = await import('../src/cli.js');
    const result = await runCli(['go-ms-ai-app'], {
      noExit: true,
      answers: { backend: 'go', topology: 'microservices', web: 'next', mobile: 'none', ai: 'on' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition).toEqual(GO_MICROSERVICES_NEXT_AI);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.join(' ')).toMatch(/NOT CI-tested/i);
    const targetDir = join(workDir, 'go-ms-ai-app');
    expect((await stat(join(targetDir, 'apps/ai/pyproject.toml'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'packages/contract/openapi.ai.yaml'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'packages/contract/clients/go/client.go'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'apps/api/internal/ai/module.go'))).isFile()).toBe(true);
  });
});
