import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Composition, TS_MONOLITH_VITE } from '../src/composition.js';
import { materialize, UnimplementedCompositionError } from '../src/materialize.js';

describe('materialize', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'create-fs-starter-test-'));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('TS-monolith + Vite+TanStack + no-mobile + no-AI', () => {
    it('writes the root scaffold files', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);

      for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml', '.gitignore', 'README.md']) {
        const s = await stat(join(targetDir, file));
        expect(s.isFile(), `${file} should be a file`).toBe(true);
      }
    });

    it('writes the apps/web workspace (Vite+TanStack shell)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const webDir = join(targetDir, 'apps/web');
      expect((await stat(webDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']) {
        expect((await stat(join(webDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      const src = await readdir(join(webDir, 'src'));
      expect(src).toContain('main.tsx');
    });

    it('apps/web landing page heading is "Starter — TS-monolith" (decision 15/24b)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/index.tsx'), 'utf8');
      expect(page).toContain('Starter');
      expect(page).toContain('TS-monolith');
      // The "Scaffolded app" placeholder from the prefactor shell is gone.
      expect(page).not.toMatch(/Scaffolded app/);
    });

    it('writes the apps/api workspace (Hono shell)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const apiDir = join(targetDir, 'apps/api');
      expect((await stat(apiDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(apiDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('writes the packages/shared workspace', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sharedDir = join(targetDir, 'packages/shared');
      expect((await stat(sharedDir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(sharedDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('root README documents the items demo, the db layer, and the migration command', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      expect(readme).toMatch(/items/);
      expect(readme).toMatch(/db|migrate/i);
    });

    it('root Taskfile declares db-related targets (migrate, test:db)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      expect(tf).toContain('migrate:');
      expect(tf).toContain('test:db');
      expect(tf).toContain('packages/db');
    });

    it('apps/web depends on @starter/api-client and uses it in a typed smoke import', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'apps/web/package.json'), 'utf8'),
      );
      expect(pkg.dependencies['@starter/api-client']).toBe('workspace:*');

      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      expect(api).toContain('@starter/api-client');
      expect(api).toContain('createApiClient');
    });

    it('apps/web ships a zod-validated config.ts that reads VITE_API_URL (decision 28)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const cfg = await readFile(join(targetDir, 'apps/web/src/config.ts'), 'utf8');
      // The config is a real zod schema, not a hand-rolled check
      expect(cfg).toContain('zod');
      // It declares the api URL field
      expect(cfg).toMatch(/VITE_API_URL|apiUrl/i);
      // It exports a typed `config` parsed from import.meta.env
      expect(cfg).toContain('import.meta.env');
      expect(cfg).toMatch(/export\s+const\s+config\b/);
    });

    it('apps/web/lib/api.ts reaches the api through the typed config (no direct env reads)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      // The lib imports the typed config
      expect(api).toMatch(/from\s+['"]\.\.\/config['"]|from\s+['"]\.\/config['"]/);
      // And uses config.apiUrl (not import.meta.env.VITE_API_URL directly)
      expect(api).toContain('config.apiUrl');
      expect(api).not.toMatch(/import\.meta\.env\.VITE_API_URL/);
    });

    it('apps/web ships a .env.example documenting VITE_API_URL', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const env = await readFile(join(targetDir, 'apps/web/.env.example'), 'utf8');
      expect(env).toContain('VITE_API_URL');
    });

    it('apps/web/package.json declares zod as a runtime dep (config.ts depends on it)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'apps/web/package.json'), 'utf8'),
      );
      expect(pkg.dependencies.zod).toEqual(expect.any(String));
    });

    it('apps/web main.tsx wires up TanStack Router + TanStack Query providers', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const main = await readFile(join(targetDir, 'apps/web/src/main.tsx'), 'utf8');
      // TanStack Router provider
      expect(main).toContain('RouterProvider');
      expect(main).toContain('@tanstack/react-router');
      // TanStack Query client + provider
      expect(main).toContain('QueryClient');
      expect(main).toContain('QueryClientProvider');
      expect(main).toContain('@tanstack/react-query');
    });

    it('apps/web has a / route registered (the landing page)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const router = await readFile(join(targetDir, 'apps/web/src/router.tsx'), 'utf8');
      expect(router).toContain("path: '/'");
      expect(router).toContain('IndexPage');
    });

    it('apps/web writes the items page file (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pagePath = join(targetDir, 'apps/web/src/pages/items.tsx');
      expect((await stat(pagePath)).isFile(), 'items.tsx should exist').toBe(true);
    });

    it('apps/web router registers /items pointing at the items page (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const router = await readFile(join(targetDir, 'apps/web/src/router.tsx'), 'utf8');
      // /items is registered
      expect(router).toContain("path: '/items'");
      // and points at the items page component
      expect(router).toContain('ItemsPage');
      // the items page is imported (so the router can reference it)
      expect(router).toMatch(/import\s*\{[^}]*ItemsPage[^}]*\}\s*from\s*['"]\.\/pages\/items['"]/);
    });

    it('apps/web items page lists items via TanStack Query against the api-client (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // TanStack Query primitives
      expect(page).toMatch(/useQuery/);
      expect(page).toMatch(/useMutation/);
      expect(page).toMatch(/useQueryClient/);
      // Reaches the api through the typed api-client (no hardcoded fetch URLs)
      expect(page).toMatch(/apiClient\.items\.\$get\(\)/);
      expect(page).toMatch(/apiClient\.items\.\$post\(/);
      // Discriminates ok vs not-ok response (Hono RPC client contract)
      expect(page).toMatch(/res\.ok/);
    });

    it('apps/web items page invalidates the items query after a successful create (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // onSuccess on the create mutation calls invalidateQueries on ['items']
      expect(page).toMatch(/onSuccess\s*:\s*[^}]*queryClient\.invalidateQueries/);
      expect(page).toMatch(/queryKey\s*:\s*\[\s*['"]items['"]\s*\]/);
    });

    it('apps/web items page renders a name form with a submit button (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // A real <form> with a name input
      expect(page).toMatch(/<form[\s>]/);
      expect(page).toMatch(/<input[^>]*type=["']text["']/);
      // A submit button
      expect(page).toMatch(/<button[^>]*type=["']submit["']/);
      // Form wires onSubmit to a handler (no <form onSubmit= omitted)
      expect(page).toMatch(/onSubmit=\{handleSubmit\}/);
    });

    it('apps/web items page uses inferred types end-to-end (no any, no manual Item interface) (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // No `any` (the type discipline bar from the AC)
      expect(page).not.toMatch(/:\s*any\b/);
      // No manually-declared Item interface (the api-client is the source
      // of truth). Look for the anti-pattern: `interface Item` or
      // `type Item = {` (a literal) — but `type Item = Awaited<...>`
      // is the inferred form, which is the right shape.
      expect(page).not.toMatch(/interface\s+Item\b/);
      expect(page).not.toMatch(/type\s+Item\s*=\s*\{/);
      // The inferred-from-api-client form is present
      expect(page).toMatch(/Awaited<ReturnType<typeof\s+fetchItems>>/);
    });

    it('apps/web items page is not auth-protected (issue 05; auth comes in 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // No auth check in the page body
      expect(page).not.toMatch(/apiClient\.auth\./);
      expect(page).not.toMatch(/useAuth/);
      expect(page).not.toMatch(/navigate\(\s*['"]\/login['"]/);
      // The router doesn't gate /items behind anything either
      const router = await readFile(join(targetDir, 'apps/web/src/router.tsx'), 'utf8');
      expect(router).not.toMatch(/beforeLoad.*auth/);
      expect(router).not.toMatch(/requireAuth/);
    });

    it('apps/web landing page links to /items (issue 05)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/index.tsx'), 'utf8');
      expect(page).toMatch(/to=["']\/items["']/);
    });

    it('root Taskfile `dev` brings up both web and api shells', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      // dev:web and dev:api both exist
      expect(tf).toMatch(/^  dev:web:/m);
      expect(tf).toMatch(/^  dev:api:/m);
      // The `dev` task references both
      const devBlock = tf.match(/^  dev:\n(?:    .+\n)+/m);
      expect(devBlock, 'dev: task should exist').toBeTruthy();
      expect(devBlock![0]).toMatch(/dev:web/);
      expect(devBlock![0]).toMatch(/dev:api/);
    });

    it('apps/web shell has no auth, no items integration (just the shell, issue #6)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // No actual auth calls wired into the web yet — that lives in issue 06
      // (web-auth integration). We assert on real imports, not comments.
      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      expect(api).not.toMatch(/apiClient\.auth\.(login|register|refresh|logout)/);
      // No items integration yet — that lives in issue 05.
      const page = await readFile(join(targetDir, 'apps/web/src/pages/index.tsx'), 'utf8');
      expect(page).not.toMatch(/apiClient\.items/);
      expect(page).not.toMatch(/apiClient\.auth/);
    });

    it('writes the packages/auth workspace (passwords + tokens + refresh)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const authDir = join(targetDir, 'packages/auth');
      expect((await stat(authDir)).isDirectory()).toBe(true);
      for (const file of [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'src/passwords.ts',
        'src/tokens.ts',
        'src/refresh.ts',
        'src/config.ts',
        'src/types.ts',
        'src/passwords.test.ts',
        'src/tokens.test.ts',
        'src/refresh.test.ts',
      ]) {
        expect((await stat(join(authDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/auth/package.json declares @starter/auth and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/auth/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/auth');
      expect(pkg.dependencies['argon2']).toEqual(expect.any(String));
      expect(pkg.dependencies['jose']).toEqual(expect.any(String));
      expect(pkg.dependencies['zod']).toEqual(expect.any(String));
    });

    it('packages/auth passwords.ts uses argon2id with vetted library', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pw = await readFile(
        join(targetDir, 'packages/auth/src/passwords.ts'),
        'utf8',
      );
      expect(pw).toContain('hashPassword');
      expect(pw).toContain('verifyPassword');
      expect(pw).toMatch(/argon2id/);
      expect(pw).toContain('argon2');
    });

    it('packages/auth tokens.ts uses jose and exposes signToken/verifyToken', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tk = await readFile(
        join(targetDir, 'packages/auth/src/tokens.ts'),
        'utf8',
      );
      expect(tk).toContain('signToken');
      expect(tk).toContain('verifyToken');
      expect(tk).toContain('jose');
    });

    it('packages/auth refresh.ts implements issueTokenPair + rotateTokenPair', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const rf = await readFile(
        join(targetDir, 'packages/auth/src/refresh.ts'),
        'utf8',
      );
      expect(rf).toContain('issueTokenPair');
      expect(rf).toContain('rotateTokenPair');
      expect(rf).toContain('TokenPair');
    });

    it('packages/auth exports the TokenPair type from the barrel', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(
        join(targetDir, 'packages/auth/src/index.ts'),
        'utf8',
      );
      expect(idx).toContain('TokenPair');
      expect(idx).toContain('hashPassword');
      expect(idx).toContain('verifyPassword');
      expect(idx).toContain('signToken');
      expect(idx).toContain('verifyToken');
      expect(idx).toContain('issueTokenPair');
      expect(idx).toContain('rotateTokenPair');
    });

    it('packages/db ships users and refresh_tokens schemas (auth tables)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dbDir = join(targetDir, 'packages/db');
      for (const file of [
        'src/schema/users.ts',
        'src/schema/refresh-tokens.ts',
        'migrations/0001_users.sql',
        'migrations/0002_refresh_tokens.sql',
      ]) {
        expect((await stat(join(dbDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      // and the existing items schema/migrations still in place
      expect((await stat(join(dbDir, 'src/schema/items.ts'))).isFile()).toBe(true);
      expect((await stat(join(dbDir, 'migrations/0000_items.sql'))).isFile()).toBe(true);
    });

    it('users table has id, email (unique), passwordHash, createdAt', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0001_users.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"email"');
      expect(sql).toMatch(/UNIQUE/i);
      expect(sql).toContain('"password_hash"');
      expect(sql).toContain('"created_at"');
    });

    it('refresh_tokens table has id, user_id (FK), jti (unique), expires_at, revoked_at', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0002_refresh_tokens.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"user_id"');
      expect(sql).toContain('"jti"');
      expect(sql).toMatch(/UNIQUE/i);
      expect(sql).toContain('"expires_at"');
      expect(sql).toContain('"revoked_at"');
    });

    it('writes the apps/api internal/auth module (repo + routes + middleware + index)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const authDir = join(targetDir, 'apps/api/src/internal/auth');
      expect((await stat(authDir)).isDirectory()).toBe(true);
      for (const file of [
        'auth.repo.ts',
        'auth.repo.drizzle.ts',
        'auth.routes.ts',
        'auth.middleware.ts',
        'index.ts',
        'auth.repo.test.ts',
      ]) {
        expect((await stat(join(authDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('auth.routes.ts exposes register / login / refresh / logout endpoints', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.routes.ts'),
        'utf8',
      );
      for (const path of ['/register', '/login', '/refresh', '/logout']) {
        expect(routes, `auth.routes should mount ${path}`).toContain(`'${path}'`);
      }
      expect(routes).toContain('hashPassword');
      expect(routes).toContain('verifyPassword');
      expect(routes).toContain('issueTokenPair');
      expect(routes).toContain('rotateTokenPair');
      expect(routes).toContain('revokeRefreshToken');
    });

    it('auth.middleware.ts exposes a verifyToken middleware factory', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const mw = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.middleware.ts'),
        'utf8',
      );
      expect(mw).toContain('verifyToken');
      expect(mw).toMatch(/requireAuth|verifyAuth/i);
      expect(mw).toMatch(/401/);
    });

    it('root README documents the auth endpoints and the JWT_SECRET requirement', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      // Auth endpoints
      expect(readme).toMatch(/\/auth\/register|\/auth\/login|register|login/i);
      // JWT_SECRET requirement
      expect(readme).toContain('JWT_SECRET');
    });

    it('root Taskfile declares test:auth target (auth shim unit tests)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      expect(tf).toContain('test:auth');
      expect(tf).toContain('packages/auth');
    });

    it('scaffolded project ships docs/wire-it-in/auth.md (decision 30/31)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const wireItIn = join(targetDir, 'docs/wire-it-in/auth.md');
      expect((await stat(wireItIn)).isFile(), 'docs/wire-it-in/auth.md should exist').toBe(true);
      const md = await readFile(wireItIn, 'utf8');
      // The five fences the issue calls out
      for (const fence of ['email verif', 'password reset', 'MFA', 'OAuth', 'RBAC']) {
        expect(md, `auth.md should mention ${fence}`).toMatch(new RegExp(fence, 'i'));
      }
      // And points at the auth shim as the seam
      expect(md).toMatch(/@starter\/auth|seam|shim/i);
    });

    it('apps/api .env.example documents JWT_SECRET (sole minter, decision 11)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const env = await readFile(join(targetDir, 'apps/api/.env.example'), 'utf8');
      expect(env).toContain('JWT_SECRET');
      // optional TTLs should be documented too
      expect(env).toMatch(/ACCESS_TOKEN_TTL|REFRESH_TOKEN_TTL/);
    });

    it('apps/api buildApp mounts the auth module at /auth and protects /items with requireAuth (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
      // /auth is mounted (unprotected — register/login are public)
      expect(idx).toMatch(/\.route\(\s*['"]\/auth['"]/);
      // /items is protected: requireAuth middleware is applied
      expect(idx).toContain('requireAuth');
      // the items module is composed via makeItemsModule
      expect(idx).toContain('makeItemsModule');
      // auth module is composed via makeAuthModule
      expect(idx).toContain('makeAuthModule');
    });

    it('apps/api buildApp opens /items without requireAuth (issue 05; re-protected in 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
      // The items module is still mounted
      expect(idx).toContain('makeItemsModule');
      // ...at the /items prefix
      expect(idx).toMatch(/\.route\(\s*['"]\/items['"]/);
      // But it is NOT wrapped in a requireAuth-protected subtree:
      // the comment in apps/api/src/index.ts calls this out, and
      // there's no `protectedItems` (or similar) Hono() with
      // .use('*', requireAuth(...)) followed by .route('/items', ...).
      // (Issue 06 re-protects /items; this assertion will then need
      // to be revisited.)
      expect(idx).not.toMatch(/\.use\(\s*['"]\*['"]\s*,\s*requireAuth/);
    });

    it('auth.repo.drizzle.ts wires the Drizzle-backed UserStore + RefreshTokenStore', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const repo = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.repo.drizzle.ts'),
        'utf8',
      );
      expect(repo).toContain('usersTable');
      expect(repo).toContain('refreshTokensTable');
      expect(repo).toMatch(/@starter\/db/);
    });

    it('packages/db barrel re-exports usersTable and refreshTokensTable', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'packages/db/src/index.ts'), 'utf8');
      expect(idx).toContain('usersTable');
      expect(idx).toContain('refreshTokensTable');
    });

    it('packages/auth unit tests use real libraries (no mocks)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pwTest = await readFile(
        join(targetDir, 'packages/auth/src/passwords.test.ts'),
        'utf8',
      );
      const tkTest = await readFile(
        join(targetDir, 'packages/auth/src/tokens.test.ts'),
        'utf8',
      );
      const rfTest = await readFile(
        join(targetDir, 'packages/auth/src/refresh.test.ts'),
        'utf8',
      );
      // decision 22: real libraries, not mocks
      expect(pwTest).not.toMatch(/vi\.mock/);
      expect(tkTest).not.toMatch(/vi\.mock/);
      expect(rfTest).not.toMatch(/vi\.mock/);
      // each test file uses the actual library it's testing
      expect(pwTest).toContain('hashPassword');
      expect(tkTest).toContain('signToken');
      expect(rfTest).toContain('issueTokenPair');
    });

    it('writes the packages/api-client workspace (typed Hono RPC client)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dir = join(targetDir, 'packages/api-client');
      expect((await stat(dir)).isDirectory()).toBe(true);
      for (const file of ['package.json', 'tsconfig.json', 'src/index.ts']) {
        expect((await stat(join(dir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/api-client exports createApiClient typed via Hono RPC', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(
        join(targetDir, 'packages/api-client/src/index.ts'),
        'utf8',
      );
      expect(idx).toContain('createApiClient');
      expect(idx).toContain('hono/client');
      expect(idx).toContain('@starter/api');
      expect(idx).toMatch(/hc</);
    });

    it('packages/api-client/package.json declares @starter/api-client and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/api-client/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/api-client');
      expect(pkg.dependencies['@starter/api']).toBe('workspace:*');
      expect(pkg.dependencies['hono']).toEqual(expect.any(String));
    });

    it('writes the apps/api internal/items module (repo + routes + drizzle impl)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const itemsDir = join(targetDir, 'apps/api/src/internal/items');
      expect((await stat(itemsDir)).isDirectory()).toBe(true);
      for (const file of [
        'items.repo.ts',
        'items.repo.drizzle.ts',
        'items.routes.ts',
        'index.ts',
      ]) {
        expect((await stat(join(itemsDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('items.repo.ts declares the typed ItemsRepo interface', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const repo = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.repo.ts'),
        'utf8',
      );
      expect(repo).toContain('ItemsRepo');
      expect(repo).toContain('list');
      expect(repo).toContain('create');
    });

    it('items.routes.ts exposes GET and POST handlers via a Hono router factory', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.routes.ts'),
        'utf8',
      );
      expect(routes).toContain('Hono');
      expect(routes).toMatch(/items\.(get|post)\(/);
      expect(routes).toContain('makeItemsRoutes');
    });

    it('items.repo.drizzle.ts is the Drizzle-backed implementation of ItemsRepo', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const impl = await readFile(
        join(targetDir, 'apps/api/src/internal/items/items.repo.drizzle.ts'),
        'utf8',
      );
      expect(impl).toContain('ItemsRepo');
      expect(impl).toContain('@starter/db');
      expect(impl).toMatch(/drizzle-orm/);
    });

    it('writes the packages/db workspace (Drizzle + items schema + migration)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const dbDir = join(targetDir, 'packages/db');
      expect((await stat(dbDir)).isDirectory()).toBe(true);
      for (const file of [
        'package.json',
        'tsconfig.json',
        'drizzle.config.ts',
        '.env.example',
        'src/index.ts',
        'src/config.ts',
        'src/client.ts',
        'src/schema/items.ts',
        'migrations/0000_items.sql',
      ]) {
        expect((await stat(join(dbDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('packages/db/package.json declares @starter/db and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/db/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/db');
      expect(pkg.dependencies['drizzle-orm']).toEqual(expect.any(String));
      expect(pkg.dependencies['pg']).toEqual(expect.any(String));
      expect(pkg.dependencies['zod']).toEqual(expect.any(String));
      expect(pkg.devDependencies['drizzle-kit']).toEqual(expect.any(String));
    });

    it('packages/db migrations create the items table with id, name, created_at', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const sql = await readFile(
        join(targetDir, 'packages/db/migrations/0000_items.sql'),
        'utf8',
      );
      expect(sql).toMatch(/CREATE TABLE/i);
      expect(sql).toMatch(/items/i);
      expect(sql).toContain('"id"');
      expect(sql).toContain('"name"');
      expect(sql).toContain('"created_at"');
    });

    it('packages/db exports the itemsTable from the schema barrel', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const index = await readFile(join(targetDir, 'packages/db/src/index.ts'), 'utf8');
      expect(index).toContain('itemsTable');
    });

    it('packages/db ships a zod-validated config with a databaseUrl schema', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const cfg = await readFile(join(targetDir, 'packages/db/src/config.ts'), 'utf8');
      expect(cfg).toContain('zod');
      expect(cfg).toMatch(/databaseUrl/i);
    });

    it('substitutes the project name in the root package.json', async () => {
      await materialize({ targetDir, name: 'my-cool-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-cool-app');
    });

    it('declares pnpm workspaces in the root pnpm-workspace.yaml', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const ws = await readFile(join(targetDir, 'pnpm-workspace.yaml'), 'utf8');
      expect(ws).toContain('apps/*');
      expect(ws).toContain('packages/*');
    });

    it('declares dev / test / build in the root Taskfile.yml', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      for (const task of ['dev:', 'test:', 'build:']) {
        expect(tf, `Taskfile should declare ${task}`).toContain(task);
      }
    });
  });

  describe('unimplemented compositions', () => {
    it('throws UnimplementedCompositionError for Go backend', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('throws UnimplementedCompositionError for TS + microservices', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, topology: 'microservices' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('throws UnimplementedCompositionError when web variant differs', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, web: 'next' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('error message mentions the composition and is human-readable', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      try {
        await materialize({ targetDir, name: 'test-app' }, composition);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UnimplementedCompositionError);
        const msg = (err as Error).message;
        expect(msg).toMatch(/not yet implemented/i);
        expect(msg).toContain('go');
        expect(msg).toContain('monolith');
      }
    });

    it('does not create any files when the composition is unimplemented', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
      const entries = await readdir(targetDir);
      expect(entries, 'target dir should be empty after a failed materialize').toEqual([]);
    });
  });
});
