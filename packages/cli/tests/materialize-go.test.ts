// Materializer tests for shape 3 (Go-monolith, issue #13 + web ticket 12).
//
// The Go-monolith composition: Go backend + monolith topology + Next.js
// web variant (blessed default per decision 24b) + no mobile + no AI.
// Issue #13 materialized the api + contract mechanism; ticket 12 added
// the Next.js web variant (apps/web) and the one E2E:
//
//   - apps/api         — Go module: Gin + Huma, internal/{auth,items}
//     modules (modular monolith, decision 27), env-based config.go
//     (decision 28), migration runner, GET/POST /items + /auth/*.
//   - packages/contract — the ONLY package (decision 9): committed
//     openapi.yaml generated from the Go structs (decision 19,
//     Go-as-canonical-side), a generated TS client, a Dart client.
//   - apps/web         — Next.js (App Router, RSC) consuming the
//     generated TS client (decision 15/19), decision-16 web-auth flow
//     for the SSR variant (access token forwarded from the incoming
//     cookie into the server-side api-client; refresh bridge).
//   - No packages/{db,auth,shared,api-client} (decision 9: each
//     backend owns its own).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Composition,
  GO_MONOLITH_NEXT,
  isImplemented,
  TS_MONOLITH_VITE,
} from '../src/composition.js';
import { materialize, UnimplementedCompositionError } from '../src/materialize.js';

async function expectMissing(p: string): Promise<void> {
  try {
    await stat(p);
    expect.fail(`${p} should NOT exist`);
  } catch (err) {
    expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
  }
}

describe('Go-monolith + Next + no-mobile + no-AI (shape 3 base, issue #13)', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-go-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it('is a blessed, implemented composition (decision 7/24)', () => {
    expect(isImplemented(GO_MONOLITH_NEXT)).toBe(true);
  });

  it('go + monolith + vite stays unimplemented (only the blessed web default is wired)', async () => {
    const c: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
    expect(isImplemented(c)).toBe(false);
    await expect(materialize({ targetDir, name: 'test-app' }, c)).rejects.toBeInstanceOf(
      UnimplementedCompositionError,
    );
  });

  it('writes the root scaffold files', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml', '.gitignore', 'README.md']) {
      const s = await stat(join(targetDir, file));
      expect(s.isFile(), `${file} should be a file`).toBe(true);
    }
  });

  it('root package.json is a thin Taskfile shim with the one E2E (decision 22)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
    expect(pkg.scripts.dev).toBe('task dev');
    expect(pkg.scripts.test).toBe('task test');
    expect(pkg.scripts['test:e2e']).toMatch(/playwright/);
    expect(pkg.devDependencies?.['@playwright/test']).toEqual(expect.any(String));
  });

  it('stamps starterVersion into the Go scaffold — root package.json + Taskfile vars (decision 38)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const { VERSION } = await import('../src/version.js');
    // The lookup key for post-1.0 migration notes: package.json (all
    // shapes) and the root Taskfile.yml (Go shapes, per decision 38's
    // "go.mod / Taskfile.yml" — Taskfile is the tooling-safe choice,
    // go.mod gets rewritten by go mod tidy).
    const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
    expect(pkg.starterVersion).toBe(VERSION);
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    expect(tf).toContain(`starterVersion: "${VERSION}"`);
    // The vars block sits at the top, next to version: "3".
    const varsBlock = tf.match(/version: "3"\n\nvars:\n(?:  .+\n)+/);
    expect(varsBlock, 'vars block should follow version: "3"').toBeTruthy();
  });

  it('root Taskfile declares Go targets and boots web + api via `task dev` (ticket 12)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    expect(tf).toMatch(/^  go:test:/m);
    expect(tf).toMatch(/^  go:build:/m);
    const devBlock = tf.match(/^  dev:\n(?:    .+\n)+/m);
    expect(devBlock, 'dev: task should exist').toBeTruthy();
    expect(devBlock![0]).toMatch(/dev:api/);
    expect(devBlock![0]).toMatch(/dev:web/);
    expect(tf).toMatch(/go run \.\/cmd\/api/);
    // The test meta-task covers go + contract + web + the one E2E.
    const testBlock = tf.match(/^  test:\n(?:    .+\n)+/m);
    expect(testBlock![0]).toMatch(/go:test/);
    expect(testBlock![0]).toMatch(/test:contract/);
    expect(testBlock![0]).toMatch(/test:web/);
    expect(testBlock![0]).toMatch(/test:e2e/);
  });

  it('root Taskfile migrate runs the Go migration runner and contract:generate regenerates the spec from Go (decision 19)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
    expect(tf).toMatch(/^  migrate:/m);
    expect(tf).toMatch(/go run \.\/cmd\/migrate/);
    expect(tf).toMatch(/^  contract:generate:/m);
    expect(tf).toMatch(/go run \.\/cmd\/specgen/);
    expect(tf).toMatch(/@starter\/contract generate/);
  });

  it('writes apps/api as a Go module (go.mod names gin + huma) with a committed go.sum', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const mod = await readFile(join(targetDir, 'apps/api/go.mod'), 'utf8');
    expect(mod).toMatch(/^module /);
    expect(mod).toContain('github.com/danielgtaylor/huma/v2');
    expect(mod).toContain('github.com/gin-gonic/gin');
    const sum = await readFile(join(targetDir, 'apps/api/go.sum'), 'utf8');
    expect(sum).toContain('github.com/danielgtaylor/huma/v2');
  });

  it('writes the apps/api layout: cmd/, internal/{auth,items}, migrations, config', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const apiDir = join(targetDir, 'apps/api');
    for (const file of [
      'cmd/api/main.go',
      'cmd/migrate/main.go',
      'cmd/specgen/main.go',
      'internal/config/config.go',
      'internal/db/db.go',
      'internal/db/migrate.go',
      'internal/items/item.go',
      'internal/items/items.repo.go',
      'internal/items/items.repo.pg.go',
      'internal/items/items.routes.go',
      'internal/items/index.go',
      'internal/auth/passwords.go',
      'internal/auth/tokens.go',
      'internal/auth/refresh.go',
      'internal/auth/auth.repo.go',
      'internal/auth/auth.repo.pg.go',
      'internal/auth/auth.routes.go',
      'internal/auth/auth.middleware.go',
      'internal/auth/index.go',
      'internal/router/router.go',
      '.env.example',
      'migrations/0000_items.sql',
      'migrations/0001_users.sql',
      'migrations/0002_refresh_tokens.sql',
    ]) {
      expect((await stat(join(apiDir, file))).isFile(), `${file} should exist`).toBe(true);
    }
  });

  it('config.go is the zod-equivalent: env-based, reads DATABASE_URL + JWT_SIGNING_KEY (decision 28)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const cfg = await readFile(join(targetDir, 'apps/api/internal/config/config.go'), 'utf8');
    expect(cfg).toMatch(/DATABASE_URL/);
    expect(cfg).toMatch(/JWT_SIGNING_KEY/);
    expect(cfg).toMatch(/error|panic/i);
    expect(cfg).toMatch(/type\s+Config\s+struct/);
    expect(cfg).toMatch(/func\s+Load\(\)/);
  });

  it('.env.example documents DATABASE_URL, JWT_SIGNING_KEY and TTLs', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const env = await readFile(join(targetDir, 'apps/api/.env.example'), 'utf8');
    expect(env).toContain('DATABASE_URL');
    expect(env).toContain('JWT_SIGNING_KEY');
    expect(env).toMatch(/ACCESS_TOKEN_TTL|REFRESH_TOKEN_TTL/);
  });

  it('internal/items is a modular-monolith module: typed interface + PG impl + routes mounted at /items (decision 27)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const repo = await readFile(join(targetDir, 'apps/api/internal/items/items.repo.go'), 'utf8');
    expect(repo).toMatch(/ItemsRepo/);
    expect(repo).toMatch(/List\(/);
    expect(repo).toMatch(/Create\(/);
    const idx = await readFile(join(targetDir, 'apps/api/internal/items/index.go'), 'utf8');
    expect(idx).toMatch(/\/items/);
    const routes = await readFile(join(targetDir, 'apps/api/internal/items/items.routes.go'), 'utf8');
    expect(routes).toMatch(/GET|MethodGet/);
    expect(routes).toMatch(/POST|MethodPost/);
  });

  it('internal/auth is the embedded auth shim: four endpoints + argon2 + jwt + refresh rotation (decision 12)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const authIndex = await readFile(join(targetDir, 'apps/api/internal/auth/index.go'), 'utf8');
    for (const ep of ['register', 'login', 'refresh', 'logout']) {
      expect(authIndex, `auth module should mount /${ep}`).toContain(`"/${ep}"`);
    }
    const pw = await readFile(join(targetDir, 'apps/api/internal/auth/passwords.go'), 'utf8');
    expect(pw).toContain('argon2');
    const tk = await readFile(join(targetDir, 'apps/api/internal/auth/tokens.go'), 'utf8');
    expect(tk).toContain('jwt');
    const rf = await readFile(join(targetDir, 'apps/api/internal/auth/refresh.go'), 'utf8');
    expect(rf).toMatch(/issueTokenPair|IssueTokenPair/);
    expect(rf).toMatch(/rotateTokenPair|RotateTokenPair/);
  });

  it('auth.middleware.go exposes requireAuth (Bearer verify, 401)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const mw = await readFile(join(targetDir, 'apps/api/internal/auth/auth.middleware.go'), 'utf8');
    expect(mw).toMatch(/RequireAuth/);
    expect(mw).toMatch(/StatusUnauthorized|401/);
    expect(mw).toMatch(/Bearer/i);
  });

  it('router.go assembles the modular monolith: items behind requireAuth at /items, auth at /auth', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const router = await readFile(join(targetDir, 'apps/api/internal/router/router.go'), 'utf8');
    expect(router).toMatch(/NewAuthModule/);
    expect(router).toMatch(/NewItemsModule/);
    expect(router).toMatch(/\/items/);
    expect(router).toMatch(/\/auth/);
    const itemsIndex = await readFile(join(targetDir, 'apps/api/internal/items/index.go'), 'utf8');
    expect(itemsIndex).toMatch(/NewGroup/);
    expect(itemsIndex).toMatch(/UseMiddleware/);
  });

  it('migration runner applies migrations in order and ships the items/users/refresh_tokens SQL', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const mig = await readFile(join(targetDir, 'apps/api/internal/db/migrate.go'), 'utf8');
    expect(mig).toMatch(/migrations/);
    const items = await readFile(join(targetDir, 'apps/api/migrations/0000_items.sql'), 'utf8');
    expect(items).toMatch(/CREATE TABLE/i);
    expect(items).toMatch(/items/i);
  });

  it('no shared TS packages (decision 9: the contract is the only package)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    for (const ws of ['packages/db', 'packages/auth', 'packages/shared', 'packages/api-client']) {
      await expectMissing(join(targetDir, ws));
    }
  });

  it('packages/contract is the only package: committed openapi.yaml + generated TS client + Dart client (decision 9/19)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const contractDir = join(targetDir, 'packages/contract');
    for (const file of [
      'openapi.yaml',
      'README.md',
      'package.json',
      'tsconfig.json',
      'scripts/generate-ts-client.mjs',
      'scripts/generate-dart-client.mjs',
      'src/types.ts',
      'src/client.ts',
      'src/index.ts',
      'test/generated.test.ts',
      'clients/dart/pubspec.yaml',
      'clients/dart/lib/openapi_client.dart',
    ]) {
      expect((await stat(join(contractDir, file))).isFile(), `${file} should exist`).toBe(true);
    }
  });

  it('committed openapi.yaml documents /items + the four /auth endpoints (generated from the Go structs)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const yaml = await readFile(join(targetDir, 'packages/contract/openapi.yaml'), 'utf8');
    expect(yaml).toMatch(/^paths:/m);
    for (const p of ['/items', '/auth/register', '/auth/login', '/auth/refresh', '/auth/logout']) {
      expect(yaml, `openapi.yaml should document ${p}`).toContain(`  ${p}:`);
    }
    // Item schema is described (the schema the clients are generated from)
    expect(yaml).toMatch(/components:|schemas:/);
    expect(yaml).toMatch(/Item/);
    // The protected /items operations declare the bearer security requirement
    expect(yaml).toMatch(/bearerAuth/);
    expect(yaml).toMatch(/securitySchemes/);
  });

  it('generated TS client is downstream of the committed spec: types for Item + calls for every endpoint', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const types = await readFile(join(targetDir, 'packages/contract/src/types.ts'), 'utf8');
    expect(types).toMatch(/export\s+interface\s+Item\b/);
    const client = await readFile(join(targetDir, 'packages/contract/src/client.ts'), 'utf8');
    for (const ep of ['/items', '/auth/register', '/auth/login', '/auth/refresh', '/auth/logout']) {
      expect(client, `client.ts should expose ${ep}`).toContain(`'${ep}'`);
    }
    expect(client).toMatch(/list: async|create: async/);
  });

  it('TS client package declares @starter/contract and the generator script (regeneration = commit flow, decision 19)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const pkg = JSON.parse(
      await readFile(join(targetDir, 'packages/contract/package.json'), 'utf8'),
    );
    expect(pkg.name).toBe('@starter/contract');
    expect(pkg.scripts.generate).toMatch(/generate-ts-client/);
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
  });

  it('Dart client is generated (not hand-shaped) for the Flutter mobile ticket (17)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const dart = await readFile(join(targetDir, 'packages/contract/clients/dart/lib/openapi_client.dart'), 'utf8');
    // The committed client is byte-identical to the generator's output
    // (tripwired by test/generated.test.ts) — the header marks it.
    expect(dart).toMatch(/GENERATED by scripts\/generate-dart-client\.mjs/);
    expect(dart).toMatch(/class\s+Item\b/);
    expect(dart).toMatch(/\/items/);
    expect(dart).toMatch(/class OpenApiClient/);
    const pub = await readFile(join(targetDir, 'packages/contract/clients/dart/pubspec.yaml'), 'utf8');
    expect(pub).toMatch(/name\s*:/);
  });

  it('contract test validates the committed openapi.yaml against the running server (decision 22/19)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const ct = await readFile(join(targetDir, 'apps/api/contract_test.go'), 'utf8');
    expect(ct).toMatch(/openapi\.yaml/);
    expect(ct).toMatch(/httptest/);
    expect(ct).toMatch(/NewRecorder/);
  });

  it('writes apps/web as a Next.js (App Router) workspace consuming @starter/contract (ticket 12)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const webDir = join(targetDir, 'apps/web');
    for (const file of [
      'package.json',
      'tsconfig.json',
      'next-env.d.ts',
      'next.config.ts',
      '.env.example',
      'src/config.ts',
      'src/lib/token-cookie.ts',
      'src/lib/client.ts',
      'src/lib/server.ts',
      'src/lib/server.test.ts',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/app/login/page.tsx',
      'src/app/items/page.tsx',
      'src/app/refresh/route.ts',
      'src/components/sign-out-button.tsx',
      'src/components/create-item-form.tsx',
    ]) {
      expect((await stat(join(webDir, file))).isFile(), `${file} should exist`).toBe(true);
    }
    const pkg = JSON.parse(await readFile(join(webDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.next).toEqual(expect.any(String));
    expect(pkg.dependencies['@starter/contract']).toBe('workspace:*');
    expect(pkg.dependencies.zod).toEqual(expect.any(String));
    expect(pkg.scripts.dev).toMatch(/next dev/);
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
  });

  it('web next.config.ts rewrites /api to the Go api (same-origin cookies; the Vite proxy mirror)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const cfg = await readFile(join(targetDir, 'apps/web/next.config.ts'), 'utf8');
    expect(cfg).toMatch(/rewrites/);
    expect(cfg).toMatch(/\/api\/:path\*/);
    expect(cfg).toMatch(/localhost:3000/);
  });

  it('web config.ts is the zod-validated env surface (decision 28): API_URL + API_AUTH_URL, fail-fast', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const cfg = await readFile(join(targetDir, 'apps/web/src/config.ts'), 'utf8');
    expect(cfg).toMatch(/from 'zod'/);
    expect(cfg).toMatch(/apiUrl/);
    expect(cfg).toMatch(/apiAuthUrl/);
    expect(cfg).toMatch(/process\.env/);
    expect(cfg).toMatch(/throw new Error/);
  });

  it('web items page is a server component fetching through the server-side api-client (ticket 12)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const page = await readFile(join(targetDir, 'apps/web/src/app/items/page.tsx'), 'utf8');
    expect(page).toMatch(/createServerClients/);
    expect(page).toMatch(/api\.items\.list/);
    expect(page).toMatch(/CreateItemForm/);
    expect(page).toMatch(/<li/);
  });

  it("web login page signs in through the codegen'd client and stores the access token cookie (decision 16)", async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const login = await readFile(join(targetDir, 'apps/web/src/app/login/page.tsx'), 'utf8');
    expect(login).toMatch(/'use client'/);
    expect(login).toMatch(/client\.auth\.login/);
    expect(login).toMatch(/setAccessTokenCookie/);
  });

  it('the server-side api-client forwards the access token from the incoming cookie and routes 401s through /refresh (decision 16)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const server = await readFile(join(targetDir, 'apps/web/src/lib/server.ts'), 'utf8');
    expect(server).toMatch(/createServerClients/);
    expect(server).toMatch(/next\/headers/);
    expect(server).toMatch(/getAccessToken/);
    expect(server).toMatch(/ACCESS_TOKEN_COOKIE/);
    expect(server).toMatch(/redirect\('\/refresh'\)/);
    const route = await readFile(join(targetDir, 'apps/web/src/app/refresh/route.ts'), 'utf8');
    expect(route).toMatch(/auth\.refresh/);
    expect(route).toMatch(/httpOnly/);
  });

  it("the browser api-client uses the codegen'd client with refresh-on-401 (no hand-written endpoint URLs)", async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const clientSrc = await readFile(join(targetDir, 'apps/web/src/lib/client.ts'), 'utf8');
    expect(clientSrc).toMatch(/from '@starter\/contract'/);
    expect(clientSrc).toMatch(/createClient/);
    expect(clientSrc).toMatch(/credentials: 'include'/);
    expect(clientSrc).toMatch(/client\.auth\.refresh/);
    // The web app's own unit test proves the two decision-16 properties.
    const test = await readFile(join(targetDir, 'apps/web/src/lib/server.test.ts'), 'utf8');
    expect(test).toMatch(/Bearer/);
    expect(test).toMatch(/refresh/);
  });

  it('ships the Go test files: items repo unit tests, auth shim unit tests (decision 22)', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const apiDir = join(targetDir, 'apps/api');
    for (const file of [
      'internal/items/items.repo_test.go',
      'internal/auth/passwords_test.go',
      'internal/auth/tokens_test.go',
      'internal/auth/refresh_test.go',
      'internal/auth/auth.repo_test.go',
    ]) {
      expect((await stat(join(apiDir, file))).isFile(), `${file} should exist`).toBe(true);
    }
  });

  it('items repo test hits a real DB and skips cleanly without DATABASE_URL', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const repoTest = await readFile(join(targetDir, 'apps/api/internal/items/items.repo_test.go'), 'utf8');
    expect(repoTest).toMatch(/DATABASE_URL/);
    expect(repoTest).toMatch(/Skip/);
  });

  it('README documents the Go-as-canonical contract rule (decision 19): regenerate + commit before clients pick it up', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/canonical/i);
    expect(readme).toMatch(/openapi\.yaml/);
    expect(readme).toMatch(/regenerat/i);
  });

  it('README documents the items demo quickstart and the auth endpoints', async () => {
    await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT);
    const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
    expect(readme).toMatch(/items/i);
    expect(readme).toMatch(/auth\/register/);
    expect(readme).toMatch(/JWT_SIGNING_KEY/);
  });
});

describe('runCli — Go-monolith composition (issue #13)', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'create-fs-cli-go-test-'));
    originalCwd = process.cwd();
    process.chdir(workDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(workDir, { recursive: true, force: true });
  });

  it('materializes the Go-monolith composition when answers are provided', async () => {
    const { runCli } = await import('../src/cli.js');
    const result = await runCli(['go-app'], {
      noExit: true,
      answers: { backend: 'go', topology: 'monolith', web: 'next', mobile: 'none', ai: 'off' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition).toEqual(GO_MONOLITH_NEXT);
    const targetDir = join(workDir, 'go-app');
    expect((await stat(join(targetDir, 'apps/api/go.mod'))).isFile()).toBe(true);
    expect((await stat(join(targetDir, 'Taskfile.yml'))).isFile()).toBe(true);
  });
});
