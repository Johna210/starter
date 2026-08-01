// Materializer tests for shape 4 (Go-microservices, issue #15).
//
// The Go-microservices composition: Go backend + microservices topology
// + Next.js web (blessed default per decision 24b) + no mobile + no AI.
// This is the example split (decision 10) on the CAPABILITY axis
// (auth/IAM):
//
//   - apps/api         — the MAIN Go api: /items behind a JWKS-verified
//     Bearer gate. Holds NO signing key (sole-minter invariant,
//     decision 11): it fetches apps/api-auth's JWKS, caches on a TTL,
//     and verifies every request locally (local-verify principle — no
//     /verify introspection).
//   - apps/api-auth    — a separate Go deployable: the SOLE MINTER
//     (decision 11). Owns the four auth endpoints (/auth/*) and serves
//     its public key material at /.well-known/jwks.json.
//   - apps/web         — Next.js (App Router, RSC) consuming the
//     codegen'd TS client (decision 15/19), decision-16 web-auth flow.
//   - packages/contract — the ONLY package (decision 9): two Go-generated
//     partial specs (openapi.api.yaml, openapi.auth.yaml) merged into
//     the committed openapi.yaml, plus generated TS + Dart clients.
//   - No packages/{db,auth,shared,api-client} — each backend owns its
//     own (the contract is the only seam).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Composition,
  GO_MICROSERVICES_NEXT,
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

describe('Go-microservices + Next + no-mobile + no-AI (shape 4, issue #15)', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-go-ms-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it('is a blessed, implemented composition (decision 7/24)', () => {
    expect(isImplemented(GO_MICROSERVICES_NEXT)).toBe(true);
  });

  it('writes the four workspaces and nothing shared (decision 9: contract-only seam)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    for (const ws of ['apps/api', 'apps/api-auth', 'apps/web', 'packages/contract']) {
      expect((await stat(join(targetDir, ws))).isDirectory(), `${ws} should exist`).toBe(true);
    }
    // No packages/auth shared across languages — the whole point of
    // shape 4's contract-only seam.
    for (const ws of ['packages/db', 'packages/auth', 'packages/shared', 'packages/api-client']) {
      await expectMissing(join(targetDir, ws));
    }
  });

  it('writes the root scaffold files with a three-process Taskfile (web + api + api-auth)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml', '.gitignore', 'README.md']) {
      const s = await stat(join(targetDir, file));
      expect(s.isFile(), `${file} should be a file`).toBe(true);
    }
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    const devBlock = tf.match(/^  dev:\n(?:    .+\n)+/m);
    expect(devBlock![0]).toMatch(/dev:api-auth/);
    expect(devBlock![0]).toMatch(/dev:api/);
    expect(devBlock![0]).toMatch(/dev:web/);
    // migrate covers BOTH services' runners.
    expect(tf).toMatch(/migrate:api-auth:/);
    expect(tf).toMatch(/migrate:api:/);
    // contract:generate runs both specgens, then the merge.
    const cgBlock = tf.match(/^  contract:generate:\n(?:    .+\n)+/m);
    expect(cgBlock![0]).toMatch(/go run \.\/cmd\/specgen/);
    expect(cgBlock![0]).toMatch(/merge-openapi/);
    expect(cgBlock![0]).toMatch(/@starter\/contract generate/);
  });

  it('apps/api-auth is the SOLE MINTER: owns the auth shim + RS256 signing key (decision 11)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const authDir = join(targetDir, 'apps/api-auth');
    for (const file of [
      'internal/auth/passwords.go',
      'internal/auth/tokens.go',
      'internal/auth/refresh.go',
      'internal/auth/auth.repo.go',
      'internal/auth/auth.repo.pg.go',
      'internal/auth/auth.routes.go',
      'internal/auth/index.go',
      'internal/jwks/jwks.go',
      'internal/router/router.go',
      'cmd/api/main.go',
      'cmd/specgen/main.go',
      'migrations/0000_users.sql',
      'migrations/0001_refresh_tokens.sql',
    ]) {
      expect((await stat(join(authDir, file))).isFile(), `apps/api-auth/${file} should exist`).toBe(true);
    }
    const tokens = await readFile(join(authDir, 'internal/auth/tokens.go'), 'utf8');
    expect(tokens).toMatch(/SigningMethodRS256/);
    expect(tokens).toMatch(/ParsePrivateKeyPEM/);
    expect(tokens).toMatch(/GeneratePrivateKey/);
    // The four auth endpoints (the capability axis: auth/IAM).
    const idx = await readFile(join(authDir, 'internal/auth/index.go'), 'utf8');
    for (const ep of ['register', 'login', 'refresh', 'logout']) {
      expect(idx, `api-auth should mount /${ep}`).toContain(`"/${ep}"`);
    }
    const mod = await readFile(join(authDir, 'go.mod'), 'utf8');
    expect(mod).toMatch(/^module starter\/apps\/api-auth/);
  });

  it('apps/api-auth serves its public key material at /.well-known/jwks.json (decision 11)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const jwks = await readFile(join(targetDir, 'apps/api-auth/internal/jwks/jwks.go'), 'utf8');
    expect(jwks).toMatch(/JWKSDocument/);
    expect(jwks).toMatch(/kty|Kty/);
    expect(jwks).toMatch(/kid|Kid/);
    const router = await readFile(join(targetDir, 'apps/api-auth/internal/router/router.go'), 'utf8');
    expect(router).toMatch(/RegisterJWKS/);
    expect(router).toMatch(/\.well-known/);
    // The signing key is optional-but-owned: env documents JWT_PRIVATE_KEY.
    const env = await readFile(join(targetDir, 'apps/api-auth/.env.example'), 'utf8');
    expect(env).toContain('JWT_PRIVATE_KEY');
    expect(env).toContain('DATABASE_URL');
  });

  it('apps/api holds NO signing key and verifies via fetched-and-cached JWKS (local-verify, decision 11)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const apiDir = join(targetDir, 'apps/api');
    // No embedded auth shim — the split took it (decision 10).
    await expectMissing(join(apiDir, 'internal/auth'));
    const cfg = await readFile(join(apiDir, 'internal/config/config.go'), 'utf8');
    expect(cfg).toMatch(/API_AUTH_URL/);
    expect(cfg).toMatch(/JWKSCacheTTL/);
    expect(cfg).not.toMatch(/JWT_SIGNING_KEY/);
    const env = await readFile(join(apiDir, '.env.example'), 'utf8');
    expect(env).toContain('API_AUTH_URL');
    expect(env).toContain('JWKS_CACHE_TTL');
    expect(env).not.toContain('JWT_SIGNING_KEY');
    // The verifier fetches, caches on a TTL, verifies locally.
    const jwks = await readFile(join(apiDir, 'internal/jwks/jwks.go'), 'utf8');
    expect(jwks).toMatch(/NewVerifier/);
    expect(jwks).toMatch(/VerifyAccessToken/);
    expect(jwks).toMatch(/ttl|TTL/);
    expect(jwks).toMatch(/cached/);
    expect(jwks).toMatch(/\.well-known\/jwks\.json/);
    // The api's own migrations: items only (users/refresh_tokens are
    // api-auth's — each service migrates its own tables).
    await expectMissing(join(apiDir, 'migrations/0001_users.sql'));
    await expectMissing(join(apiDir, 'migrations/0002_refresh_tokens.sql'));
    expect((await stat(join(apiDir, 'migrations/0000_items.sql'))).isFile()).toBe(true);
  });

  it('there is NO /verify introspection route anywhere (decision 11)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    // No route is REGISTERED at /verify — the word may appear in
    // explanatory comments, but never as a mounted path or operation.
    const router = await readFile(join(targetDir, 'apps/api/internal/router/router.go'), 'utf8');
    expect(router).not.toMatch(/["']\/verify["']/);
    const jwks = await readFile(join(targetDir, 'apps/api/internal/jwks/jwks.go'), 'utf8');
    expect(jwks).not.toMatch(/["']\/verify["']/);
    const authRouter = await readFile(join(targetDir, 'apps/api-auth/internal/router/router.go'), 'utf8');
    expect(authRouter).not.toMatch(/["']\/verify["']/);
  });

  it('packages/contract ships the two Go-generated partials + the merged openapi.yaml (decision 19)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const contractDir = join(targetDir, 'packages/contract');
    for (const file of [
      'openapi.api.yaml',
      'openapi.auth.yaml',
      'openapi.yaml',
      'README.md',
      'package.json',
      'tsconfig.json',
      'scripts/merge-openapi.mjs',
      'scripts/generate-ts-client.mjs',
      'src/types.ts',
      'src/client.ts',
      'src/index.ts',
      'test/generated.test.ts',
      'clients/dart/pubspec.yaml',
      'clients/dart/lib/openapi_client.dart',
    ]) {
      expect((await stat(join(contractDir, file))).isFile(), `${file} should exist`).toBe(true);
    }
    // The api partial documents ONLY the main api's routes.
    const apiYaml = await readFile(join(contractDir, 'openapi.api.yaml'), 'utf8');
    expect(apiYaml).toContain('  /items:');
    expect(apiYaml).not.toContain('/auth/register');
    expect(apiYaml).not.toContain('.well-known');
    // The auth partial documents ONLY the auth service's routes.
    const authYaml = await readFile(join(contractDir, 'openapi.auth.yaml'), 'utf8');
    for (const p of ['/auth/register', '/auth/login', '/auth/refresh', '/auth/logout', '/.well-known/jwks.json']) {
      expect(authYaml, `openapi.auth.yaml should document ${p}`).toContain(`  ${p}:`);
    }
    expect(authYaml).not.toContain('/items');
    // The merged spine documents both surfaces.
    const merged = await readFile(join(contractDir, 'openapi.yaml'), 'utf8');
    expect(merged).toContain('  /items:');
    expect(merged).toContain('  /auth/login:');
    expect(merged).toContain('  /.well-known/jwks.json:');
  });

  it('the merged TS client covers auth + items and skips well-known infra', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const client = await readFile(join(targetDir, 'packages/contract/src/client.ts'), 'utf8');
    for (const ep of ['/items', '/auth/register', '/auth/login', '/auth/refresh', '/auth/logout']) {
      expect(client, `client.ts should expose ${ep}`).toContain(`'${ep}'`);
    }
    expect(client).not.toContain('/.well-known');
    expect(client).toMatch(/GET \/items \(requires Bearer access token\)/);
  });

  it('the contract test suite tripwires both partials and the merge (regenerate from Go, commit)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const apiCt = await readFile(join(targetDir, 'apps/api/contract_test.go'), 'utf8');
    expect(apiCt).toMatch(/openapi\.api\.yaml/);
    expect(apiCt).toMatch(/httptest/);
    const authCt = await readFile(join(targetDir, 'apps/api-auth/contract_test.go'), 'utf8');
    expect(authCt).toMatch(/openapi\.auth\.yaml/);
    expect(authCt).toMatch(/\.well-known\/jwks\.json/);
    const genTest = await readFile(join(targetDir, 'packages/contract/test/generated.test.ts'), 'utf8');
    expect(genTest).toMatch(/merge-openapi/);
    expect(genTest).toMatch(/openapi\.api\.yaml/);
    expect(genTest).toMatch(/openapi\.auth\.yaml/);
    expect(genTest).toMatch(/generate-ts-client/);
  });

  it('apps/api-auth ships its unit tests: RS256 tokens, rotation, repo (decision 22)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const authDir = join(targetDir, 'apps/api-auth');
    for (const file of [
      'internal/auth/passwords_test.go',
      'internal/auth/tokens_test.go',
      'internal/auth/refresh_test.go',
      'internal/auth/auth.repo_test.go',
    ]) {
      expect((await stat(join(authDir, file))).isFile(), `apps/api-auth/${file} should exist`).toBe(true);
    }
    const tokensTest = await readFile(join(authDir, 'internal/auth/tokens_test.go'), 'utf8');
    expect(tokensTest).toMatch(/TestVerifyWrongKey/);
  });

  it('apps/api ships the JWKS unit tests (fetch/cache/verify) and the items repo tests', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const apiDir = join(targetDir, 'apps/api');
    for (const file of ['internal/jwks/jwks_test.go', 'internal/items/items.repo_test.go']) {
      expect((await stat(join(apiDir, file))).isFile(), `apps/api/${file} should exist`).toBe(true);
    }
    const jwksTest = await readFile(join(apiDir, 'internal/jwks/jwks_test.go'), 'utf8');
    expect(jwksTest).toMatch(/TestCacheAvoidsRefetchWithinTTL/);
    expect(jwksTest).toMatch(/TestVerifyRejectsRefreshToken/);
    expect(jwksTest).toMatch(/TestFetchFailureFailsClosed/);
  });

  it('writes apps/web as the Next.js workspace (reused from the Go-monolith, ticket 12)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const webDir = join(targetDir, 'apps/web');
    for (const file of [
      'package.json',
      'next.config.ts',
      'src/config.ts',
      'src/lib/server.ts',
      'src/lib/client.ts',
      'src/app/items/page.tsx',
      'src/app/login/page.tsx',
    ]) {
      expect((await stat(join(webDir, file))).isFile(), `apps/web/${file} should exist`).toBe(true);
    }
    const cfg = await readFile(join(webDir, 'next.config.ts'), 'utf8');
    expect(cfg).toMatch(/\/api\/auth\/:path\*/);
    expect(cfg).toMatch(/localhost:3001/);
    // The auth rewrite must PRESERVE the /auth prefix (the auth
    // service owns /auth/*): /api/auth/register -> :3001/auth/register.
    expect(cfg).toMatch(/API_AUTH_URL}\/auth\/:path\*/);
    const config = await readFile(join(webDir, 'src/config.ts'), 'utf8');
    expect(config).toMatch(/http:\/\/localhost:3001/);
  });

  it('ships the one E2E (decision 22) with shape-4-aware notes', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const spec = await readFile(join(targetDir, 'e2e/items-flow.spec.ts'), 'utf8');
    expect(spec).toMatch(/auth\/register/);
    expect(spec).toMatch(/DATABASE_URL/);
    const pw = await readFile(join(targetDir, 'playwright.config.ts'), 'utf8');
    expect(pw).toMatch(/task migrate/);
    expect(pw).toMatch(/task dev/);
  });

  it('README documents the JWKS-based split (sole minter + local verify + no packages/auth)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT);
    const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/sole minter/i);
    expect(readme).toMatch(/JWKS/i);
    expect(readme).toMatch(/local/i);
    expect(readme).toMatch(/\.well-known\/jwks\.json/);
    expect(readme).toMatch(/JWT_PRIVATE_KEY/);
  });
});

describe('runCli — Go-microservices composition (issue #15)', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-fs-cli-go-ms-test-'));
    originalCwd = process.cwd();
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  it('materializes the Go-microservices composition when answers are provided', async () => {
    const { runCli } = await import('../src/cli.js');
    const result = await runCli(['go-ms-app'], {
      noExit: true,
      answers: { backend: 'go', topology: 'microservices', web: 'next', mobile: 'none', ai: 'off' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition).toEqual(GO_MICROSERVICES_NEXT);
    const targetDir = join(workDir, 'go-ms-app');
    expect((await stat(join(targetDir, 'apps/api/go.mod'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'apps/api-auth/go.mod'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'packages/contract/openapi.yaml'))).isFile()).toBe(true);
  });
});
