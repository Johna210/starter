import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type Composition,
  GO_MICROSERVICES_NEXT_FLUTTER,
  GO_MONOLITH_NEXT_FLUTTER,
  TS_MICROSERVICES_VITE,
  TS_MICROSERVICES_VITE_EXPO,
  TS_MONOLITH_VITE,
  TS_MONOLITH_VITE_EXPO,
} from '../src/composition.js';
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

    it('apps/web items page is auth-protected (issue 06; redirects to /login when unauthenticated)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const page = await readFile(join(targetDir, 'apps/web/src/pages/items.tsx'), 'utf8');
      // The page checks authentication and redirects to /login
      expect(page).toMatch(/useAuth/);
      expect(page).toMatch(/navigate\(\s*\{\s*to\s*:\s*['"]\/login['"]/);
      // The router also gates /items (defense in depth: route guard
      // before the page renders, so a hard refresh doesn't flash the
      // page first)
      const router = await readFile(join(targetDir, 'apps/web/src/router.tsx'), 'utf8');
      expect(router).toMatch(/beforeLoad.*auth/);
      expect(router).toMatch(/requireAuth/);
    });

    it('apps/web has a /login page that POSTs to /auth/login (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pagePath = join(targetDir, 'apps/web/src/pages/login.tsx');
      expect((await stat(pagePath)).isFile(), 'login.tsx should exist').toBe(true);
      const page = await readFile(pagePath, 'utf8');
      // The page uses the auth hook to sign in (the hook is the seam
      // between the page and the api-client — the page doesn't reach
      // the api directly).
      expect(page).toMatch(/useAuth/);
      // It has a real <form> with email + password inputs and a submit
      expect(page).toMatch(/<form[\s>]/);
      expect(page).toMatch(/<input[^>]*type=["']email["']/);
      expect(page).toMatch(/<input[^>]*type=["']password["']/);
      expect(page).toMatch(/<button[^>]*type=["']submit["']/);
      // After login it navigates to /items
      expect(page).toMatch(/navigate\(\s*\{\s*to\s*:\s*['"]\/items['"]/);
    });

    it('apps/web auth hook wraps the api-client (login/logout flow) (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // The auth hook is the seam that calls apiClient.auth.login +
      // apiClient.auth.logout (the typed Hono RPC auth surface from
      // apps/api). Pages don't call apiClient.auth.* directly; they
      // call useAuth().signIn / signOut.
      const auth = await readFile(join(targetDir, 'apps/web/src/auth.tsx'), 'utf8');
      expect(auth).toMatch(/apiClient\.auth\.login/);
      expect(auth).toMatch(/apiClient\.auth\.logout/);
    });

    it('apps/web router registers /login pointing at the login page (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const router = await readFile(join(targetDir, 'apps/web/src/router.tsx'), 'utf8');
      expect(router).toContain("path: '/login'");
      expect(router).toContain('LoginPage');
      expect(router).toMatch(/import\s*\{[^}]*LoginPage[^}]*\}\s*from\s*['"]\.\/pages\/login['"]/);
    });

    it('apps/web has an auth hook (AuthProvider + useAuth) that stores the access token in memory (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const authPath = join(targetDir, 'apps/web/src/auth.tsx');
      expect((await stat(authPath)).isFile(), 'auth.tsx should exist').toBe(true);
      const auth = await readFile(authPath, 'utf8');
      // Exports the AuthProvider and the useAuth hook
      expect(auth).toContain('AuthProvider');
      expect(auth).toMatch(/export\s+function\s+useAuth/);
      // Stores the access token in memory (useState or useSyncExternalStore),
      // NOT in localStorage / sessionStorage (the SPA storage model is
      // decision 16: in-memory access, httpOnly cookie for the refresh).
      expect(auth).toMatch(/useState|useSyncExternalStore/);
      expect(auth).not.toMatch(/localStorage/);
      expect(auth).not.toMatch(/sessionStorage/);
      // Exposes a signIn() that takes credentials and a signOut()
      expect(auth).toMatch(/signIn/);
      expect(auth).toMatch(/signOut/);
    });

    it('apps/web main.tsx wraps the app in the AuthProvider (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const main = await readFile(join(targetDir, 'apps/web/src/main.tsx'), 'utf8');
      // The AuthProvider is imported and wraps the RouterProvider
      expect(main).toContain('AuthProvider');
      expect(main).toMatch(/AuthProvider>[\s\S]*RouterProvider/);
    });

    it('apps/web main.tsx bootstraps the session via /auth/refresh on load (issue 09; survives page reload)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const main = await readFile(join(targetDir, 'apps/web/src/main.tsx'), 'utf8');
      // The SPA stores the access token in memory; without a refresh
      // on boot, a hard reload redirects the user to /login. The
      // bootstrap call restores the session from the httpOnly cookie
      // BEFORE React mounts (so the route guards see the right
      // state on the first render — no flash of /login).
      expect(main).toMatch(/auth\/refresh/);
      // Uses the typed apiClient (decision 15: web's only door to the
      // api), which sends the httpOnly cookie via authedFetch's
      // `credentials: 'include'`. The api-client's authedFetch
      // short-circuits /auth/* so the refresh call won't recurse on
      // 401 (the auth surface is excluded from refresh-on-401).
      expect(main).toMatch(/apiClient\.auth\.refresh/);
      // The bootstrap completes (or times out) before createRoot
      expect(main).toMatch(/bootstrapAuth|finally\(\(\)\s*=>\s*createRoot/);
    });

    it('apps/web/lib/api.ts attaches a Bearer access token and refreshes on 401 (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      // The wrapper reaches the api through the api-client (typed)
      expect(api).toMatch(/createApiClient/);
      // It attaches the access token as a Bearer header
      expect(api).toMatch(/Authorization/);
      expect(api).toMatch(/Bearer/);
      // It handles refresh-on-401
      expect(api).toMatch(/refresh/);
      // The api-client is the typed Hono RPC client; the auth surface
      // is reached through apiClient.auth.* in the auth hook
      // (src/auth.tsx), not directly in lib/api.ts — lib/api.ts is
      // the transport wrapper, auth.tsx is the auth surface.
      const auth = await readFile(join(targetDir, 'apps/web/src/auth.tsx'), 'utf8');
      expect(auth).toMatch(/apiClient\.auth\.(login|register|refresh|logout)/);
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

    it('apps/web has auth wiring (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // The auth hook is the seam that calls the typed api-client's
      // auth surface (apiClient.auth.login, apiClient.auth.logout).
      const auth = await readFile(join(targetDir, 'apps/web/src/auth.tsx'), 'utf8');
      expect(auth).toMatch(/apiClient\.auth\.(login|register|refresh|logout)/);
      // The api-client wrapper does Bearer + refresh-on-401.
      const api = await readFile(join(targetDir, 'apps/web/src/lib/api.ts'), 'utf8');
      expect(api).toContain('@starter/api-client');
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

    it('auth.routes.ts sets an httpOnly refresh cookie on login + register (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.routes.ts'),
        'utf8',
      );
      // The cookie helper (setRefreshCookie) is imported and used.
      expect(routes).toMatch(/setRefreshCookie/);
      // The cookie attributes include httpOnly (and path=/, the usual pair).
      expect(routes).toMatch(/httpOnly/i);
      // /refresh reads the cookie via getCookie as a fallback when the
      // request doesn't carry a body { refresh }.
      expect(routes).toMatch(/getCookie/);
    });

    it('auth.routes.ts declares the refresh-cookie name as a single constant (issue 06)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const routes = await readFile(
        join(targetDir, 'apps/api/src/internal/auth/auth.routes.ts'),
        'utf8',
      );
      // The cookie name lives in one place — a named constant the
      // login/register/refresh/logout routes all share.
      expect(routes).toMatch(/REFRESH_COOKIE_NAME/);
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

    it('docs/architecture/contract-spine.md has a Mermaid diagram labeled "your Hono RPC contract spine" (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/contract-spine.md'), 'utf8');
      // Composition-specific label (decision 31: Hono RPC for TS-monolith)
      expect(md).toMatch(/your Hono RPC contract spine/i);
      // It's a real Mermaid diagram
      expect(md).toMatch(/```mermaid/);
      expect(md).toMatch(/graph/);
    });

    it('docs/architecture/modular-monolith.md diagrams the internal/{auth,items} split-seam (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/modular-monolith.md'), 'utf8');
      expect(md).toMatch(/```mermaid/);
      // Names the modular monolith + the internal modules
      expect(md).toMatch(/modular monolith/i);
      expect(md).toMatch(/internal/);
      expect(md).toMatch(/auth|items/);
    });

    it('docs/architecture/auth-subtree.md diagrams the auth flow (httpOnly cookie + access token, sole minter) (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/auth-subtree.md'), 'utf8');
      expect(md).toMatch(/```mermaid/);
      // Names the auth flow specifics (decision 16)
      expect(md).toMatch(/httpOnly|http-only/i);
      expect(md).toMatch(/access token/i);
      // Sole minter invariant (decision 11)
      expect(md).toMatch(/sole minter|sole.*mint/i);
    });

    it('docs/architecture/typed-rpc-transport.md diagrams batch-by-default transport (decision 17b) (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/typed-rpc-transport.md'), 'utf8');
      expect(md).toMatch(/```mermaid/);
      // Names the transport mechanism
      expect(md).toMatch(/Hono RPC|typed-RPC|RPC/i);
      // Batch-by-default rule (decision 17b)
      expect(md).toMatch(/batch/i);
    });

    it('docs/adr/README.md explains the ADR convention for future decisions (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = join(targetDir, 'docs/adr/README.md');
      expect((await stat(readme)).isFile(), 'docs/adr/README.md should exist').toBe(true);
      const md = await readFile(readme, 'utf8');
      // Explains the convention
      expect(md).toMatch(/ADR|architectural decision record/i);
      // Mentions how to record future decisions
      expect(md).toMatch(/future|template|convention/i);
    });

    it('docs/standards/code-style.md documents Biome for TS (decision 29) (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/standards/code-style.md'), 'utf8');
      // Composition-conditional: TS-monolith gets Biome
      expect(md).toMatch(/Biome/i);
      // Points at the config
      expect(md).toMatch(/biome\.json|config/i);
      // Explains the one-tool discipline
      expect(md).toMatch(/one.tool|ESLint.*Prettier|replaces/i);
    });

    it('docs/standards/best-practices.md documents the per-seam copy-from-README patterns (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/standards/best-practices.md'), 'utf8');
      // Per-seam best practices
      expect(md).toMatch(/internal/i);
      expect(md).toMatch(/contract/i);
      // The modular monolith seam (decision 27)
      expect(md).toMatch(/monolith|module/i);
    });

    it('docs/standards/anti-patterns.md exists with rejected options from decisions 1, 10, 12, 14, 17, 18, 19, 20, 21, 24, 26, 27, 29, 32 (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = await readFile(join(targetDir, 'docs/standards/anti-patterns.md'), 'utf8');
      // At minimum the decisions the issue calls out
      for (const decision of ['1', '10', '12', '14', '17', '18', '19', '20', '21', '24', '26', '27', '29', '32']) {
        expect(md, `anti-patterns.md should reference decision ${decision}`).toMatch(
          new RegExp(`decision\\s+${decision}\\b`),
        );
      }
      // It's a "don't do this" list
      expect(md).toMatch(/don't do|anti-pattern|rejected/i);
    });

    it('docs/wire-it-in/ has no AI fences (composition-conditional per decision 31) (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // AI is off for TS-monolith; AI fences must be absent
      const wireItInDir = join(targetDir, 'docs/wire-it-in');
      const entries = await readdir(wireItInDir);
      // No ai.md or similar AI fence file
      expect(entries).not.toContain('ai.md');
      expect(entries).not.toContain('ai-primitives.md');
      // And the auth.md content doesn't mention AI fences
      const authMd = await readFile(join(wireItInDir, 'auth.md'), 'utf8');
      expect(authMd).not.toMatch(/AI fence|composing AI/i);
    });

    it('scaffolded README has the four sections per decision 33 (issue 08)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      // Section 1: items quickstart (the spine demonstration)
      expect(readme).toMatch(/items/i);
      expect(readme).toMatch(/quickstart/i);
      // Section 2: "what you just saw" (names the architecture)
      expect(readme).toMatch(/what you just saw/i);
      // Composition-conditional: TS-monolith names Hono RPC
      expect(readme).toMatch(/Hono RPC/i);
      // Section 3: where to extend (the seams)
      expect(readme).toMatch(/where to extend/i);
      // Section 4: how to grow (the upgrade paths)
      expect(readme).toMatch(/how to grow/i);
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

    it('apps/api buildApp applies requireAuth to /items (issue 06; /items is now protected)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const idx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
      // The items module is still mounted
      expect(idx).toContain('makeItemsModule');
      // ...at the /items prefix
      expect(idx).toMatch(/\.route\(\s*['"]\/items['"]/);
      // ...wrapped in a requireAuth-protected subtree: there IS a Hono()
      // with .use('*', requireAuth(...)) followed by .route('/items', ...).
      expect(idx).toMatch(/\.use\(\s*['"]\*['"]\s*,\s*requireAuth/);
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
      // Chained style: .get(...) and .post(...) on the new Hono() builder,
      // not const-then-mutate (which collapses the route schema; see
      // type-inference note in the file).
      expect(routes).toMatch(/\.get\(/);
      expect(routes).toMatch(/\.post\(/);
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

    // ---- E2E (issue 09) ------------------------------------------------

    it('ships the E2E test file (e2e/items-flow.spec.ts) and Playwright config (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // The single E2E test file (decision 22: one E2E, the items flow).
      const spec = join(targetDir, 'e2e/items-flow.spec.ts');
      expect((await stat(spec)).isFile(), 'e2e/items-flow.spec.ts should exist').toBe(true);
      // The Playwright config at the project root.
      const cfg = join(targetDir, 'playwright.config.ts');
      expect((await stat(cfg)).isFile(), 'playwright.config.ts should exist').toBe(true);
    });

    it('E2E spec exercises the items flow end-to-end (login → /items → create → refresh → still there) (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const spec = await readFile(join(targetDir, 'e2e/items-flow.spec.ts'), 'utf8');
      // Imports from @playwright/test
      expect(spec).toMatch(/from\s+['"]@playwright\/test['"]/);
      // test(...) and the assertions the spec calls for
      expect(spec).toMatch(/\btest\(/);
      // The flow steps the issue calls out:
      //  - registers a user (or seeds one)
      //  - logs in via the UI (or uses a pre-seeded user)
      //  - navigates to /items
      //  - creates an item via the form
      //  - asserts the new item appears
      //  - refreshes the page; asserts the item is still there
      expect(spec).toMatch(/register|seed/i);                  // setup
      expect(spec).toMatch(/login|sign in|signIn/i);          // login
      expect(spec).toMatch(/\/items/);                         // nav
      expect(spec).toMatch(/create|submit|POST/i);             // create
      expect(spec).toMatch(/page\.reload|reload|refresh/i);   // refresh
      // TanStack Query selector for the items list + the form input aria-label
      // the web app actually exposes (apps/web/src/pages/items.tsx).
      expect(spec).toMatch(/aria-label=["']Item name["']|input[^]*name/);
    });

    it('E2E spec skips cleanly when DATABASE_URL is unset (mirrors the per-workspace describeDb skip pattern) (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const spec = await readFile(join(targetDir, 'e2e/items-flow.spec.ts'), 'utf8');
      // The skip at the top of the file means `task test` stays runnable
      // in DB-less environments (the api won't boot without one).
      expect(spec).toMatch(/test\.skip/);
      expect(spec).toMatch(/DATABASE_URL/);
    });

    it('playwright.config.ts boots the full stack via `task dev` (webServer) and points at the e2e/ dir (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const cfg = await readFile(join(targetDir, 'playwright.config.ts'), 'utf8');
      // Uses @playwright/test's defineConfig
      expect(cfg).toMatch(/from\s+['"]@playwright\/test['"]/);
      expect(cfg).toMatch(/defineConfig/);
      // testDir is the e2e/ directory at the project root
      expect(cfg).toMatch(/testDir\s*:\s*['"]\.\/e2e['"]/);
      // webServer is configured to boot the full stack with `task dev`
      // and wait for the web's URL.
      expect(cfg).toMatch(/webServer/);
      expect(cfg).toMatch(/task\s+dev/);
      expect(cfg).toMatch(/localhost:5173/);
    });

    it('root package.json declares @playwright/test as a devDependency (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'package.json'), 'utf8'),
      );
      expect(pkg.devDependencies?.['@playwright/test']).toEqual(expect.any(String));
      // And a `test:e2e` script so `pnpm test:e2e` (the AC) works
      expect(pkg.scripts['test:e2e']).toMatch(/playwright/);
    });

    it('root Taskfile declares a test:e2e target wired into the `test` meta-task (issue 09)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      // test:e2e is declared
      expect(tf, 'Taskfile should declare test:e2e').toMatch(/^  test:e2e:/m);
      // and runs pnpm (which delegates to the `playwright test` script
      // in root package.json — the Taskfile is a thin wrapper per the
      // per-workspace pattern in this scaffold).
      const e2eBlock = tf.match(/^  test:e2e:\n(?:    .+\n)+/m);
      expect(e2eBlock, 'test:e2e block should exist').toBeTruthy();
      expect(e2eBlock![0]).toMatch(/pnpm/);
      // The `test` meta-task includes test:e2e
      const testBlock = tf.match(/^  test:\n(?:    .+\n)+/m);
      expect(testBlock, '`test` task should exist').toBeTruthy();
      expect(testBlock![0]).toMatch(/test:e2e/);
    });

    it('root README documents the one-E2E-only discipline (issue 09, decision 22)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      // The README points at the E2E
      expect(readme).toMatch(/e2e|E2E|playwright/i);
      // And calls out the one-E2E-only discipline (the E2E ownership
      // is the starter's; user features own their own E2Es).
      expect(readme).toMatch(/one[\s-]+E2E|one E2E|single E2E/i);
    });

    it('ships docs/test-strategy.md documenting the test pyramid (issue 09, decision 22)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      const md = join(targetDir, 'docs/test-strategy.md');
      expect((await stat(md)).isFile(), 'docs/test-strategy.md should exist').toBe(true);
      const text = await readFile(md, 'utf8');
      // Documents the three layers (unit, contract, e2e)
      expect(text).toMatch(/unit/i);
      expect(text).toMatch(/contract/i);
      expect(text).toMatch(/e2e|E2E/i);
      // And the one-E2E-only rule
      expect(text).toMatch(/one[\s-]+E2E|one E2E|single E2E|only one E2E/i);
    });

    it('packages/db ships a drizzle meta journal so `task migrate` works (issue 09; pre-existing scaffold bug surfaced by the E2E)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE);
      // Drizzle's CLI migrator (`drizzle-kit migrate`) requires
      // meta/_journal.json listing the migrations in order. Without
      // it, `task migrate` fails with "Can't find meta/_journal.json
      // file" — the E2E can't bootstrap a fresh DB without it.
      const journalPath = join(targetDir, 'packages/db/migrations/meta/_journal.json');
      expect((await stat(journalPath)).isFile(), 'meta/_journal.json should exist').toBe(true);
      const journal = JSON.parse(await readFile(journalPath, 'utf8'));
      expect(journal.version).toBe('7');
      expect(journal.dialect).toBe('postgresql');
      expect(Array.isArray(journal.entries)).toBe(true);
      // Every SQL migration in the scaffold has a journal entry, in
      // order, with the matching tag (the file the migrator reads).
      const tags = journal.entries.map((e: { tag: string }) => e.tag);
      expect(tags).toEqual(['0000_items', '0001_users', '0002_refresh_tokens']);
    });
  });

  describe('TS + Expo mobile (issue #18)', () => {
    it('writes an Expo workspace with the secure-store dependency', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_EXPO);
      const mobileDir = join(targetDir, 'apps/mobile');
      expect((await stat(mobileDir)).isDirectory()).toBe(true);
      for (const file of [
        'package.json',
        'app.json',
        'index.ts',
        'tsconfig.json',
        '.env.example',
        'src/App.tsx',
        'src/auth.ts',
        'src/config.ts',
        'src/lib/api.ts',
        'src/lib/token-storage.ts',
        'src/lib/auth-flow.test.ts',
        'src/screens/LoginScreen.tsx',
        'src/screens/ItemsScreen.tsx',
      ]) {
        expect((await stat(join(mobileDir, file))).isFile(), `${file} should exist`).toBe(true);
      }

      const pkg = JSON.parse(await readFile(join(mobileDir, 'package.json'), 'utf8'));
      expect(pkg.dependencies.expo).toEqual(expect.any(String));
      expect(pkg.dependencies['expo-secure-store']).toEqual(expect.any(String));
      expect(pkg.dependencies['@starter/api-client']).toBe('workspace:*');
      expect(pkg.type).toBe('module');
      expect(pkg.main).toBe('index.ts');
    });

    it('uses the shared typed api-client and secure-storage Bearer refresh flow', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_EXPO);
      const api = await readFile(join(targetDir, 'apps/mobile/src/lib/api.ts'), 'utf8');
      const storage = await readFile(join(targetDir, 'apps/mobile/src/lib/token-storage.ts'), 'utf8');
      const auth = await readFile(join(targetDir, 'apps/mobile/src/auth.ts'), 'utf8');

      expect(api).toContain('@starter/api-client');
      expect(api).toContain('createApiClient');
      expect(api).toContain('Authorization');
      expect(api).toContain('Bearer');
      expect(api).toContain('refresh');
      expect(api).toContain('json: { refresh }');
      expect(storage).toContain('expo-secure-store');
      expect(storage).toContain('setItemAsync');
      expect(storage).toContain('getItemAsync');
      expect(auth).toContain('setTokens');
      expect(auth).toContain('data.access');
      expect(auth).toContain('data.refresh');
    });

    it('ships login and items screens plus mobile Taskfile/docs seams', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MONOLITH_VITE_EXPO);
      const login = await readFile(join(targetDir, 'apps/mobile/src/screens/LoginScreen.tsx'), 'utf8');
      const items = await readFile(join(targetDir, 'apps/mobile/src/screens/ItemsScreen.tsx'), 'utf8');
      const taskfile = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      const mobileDocs = await readFile(join(targetDir, 'docs/architecture/mobile-auth-flow.md'), 'utf8');

      expect(login).toMatch(/signIn|Sign in/);
      expect(login).toContain('secureTextEntry');
      expect(items).toContain('apiClient.items.$get()');
      expect(items).toContain('apiClient.items.$post');
      expect(taskfile).toMatch(/^  dev:mobile:/m);
      expect(taskfile).toMatch(/^  test:mobile:/m);
      expect(taskfile).toMatch(/^  build:mobile:/m);
      expect(readme).toMatch(/Expo mobile|mobile-auth|secure-store/i);
      expect(mobileDocs).toMatch(/secure-store|body|Bearer|refresh/i);
    });

    it('configures two typed clients for TS microservices + Expo', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE_EXPO);
      const pkg = JSON.parse(await readFile(join(targetDir, 'apps/mobile/package.json'), 'utf8'));
      const api = await readFile(join(targetDir, 'apps/mobile/src/lib/api.ts'), 'utf8');
      const config = await readFile(join(targetDir, 'apps/mobile/src/config.ts'), 'utf8');
      const env = await readFile(join(targetDir, 'apps/mobile/.env.example'), 'utf8');

      expect(pkg.dependencies['@starter/api-client']).toBe('workspace:*');
      expect(api).toContain('createApiClient');
      expect(api).toContain('createApiAuthClient');
      expect(api).toContain('apiAuthClient');
      expect(config).toContain('EXPO_PUBLIC_AUTH_URL');
      expect(env).toContain('EXPO_PUBLIC_AUTH_URL');
    });
  });

  describe('Go + Flutter mobile (issue #19)', () => {
    it('writes a Flutter workspace with flutter_secure_storage (decision 23)', async () => {
      await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT_FLUTTER);
      const mobileDir = join(targetDir, 'apps/mobile');
      expect((await stat(mobileDir)).isDirectory()).toBe(true);
      for (const file of [
        'pubspec.yaml',
        'analysis_options.yaml',
        'lib/main.dart',
        'lib/src/app.dart',
        'lib/src/api.dart',
        'lib/src/auth.dart',
        'lib/src/config.dart',
        'lib/src/token_storage.dart',
        'lib/src/screens/login_screen.dart',
        'lib/src/screens/items_screen.dart',
        'test/auth_flow_test.dart',
      ]) {
        expect((await stat(join(mobileDir, file))).isFile(), `${file} should exist`).toBe(true);
      }

      const pub = await readFile(join(mobileDir, 'pubspec.yaml'), 'utf8');
      expect(pub).toContain('flutter_secure_storage');
      // The app is a Flutter workspace, not a pnpm/TS workspace.
      expect(pub).toContain('flutter:');
    });

    it('consumes the codegen\'d Dart client from packages/contract (no hand-written HTTP)', async () => {
      await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT_FLUTTER);
      const pub = await readFile(join(targetDir, 'apps/mobile/pubspec.yaml'), 'utf8');
      const api = await readFile(join(targetDir, 'apps/mobile/lib/src/api.dart'), 'utf8');
      const storage = await readFile(join(targetDir, 'apps/mobile/lib/src/token_storage.dart'), 'utf8');
      const dartClient = await readFile(
        join(targetDir, 'packages/contract/clients/dart/lib/openapi_client.dart'),
        'utf8',
      );

      expect(pub).toContain('starter_contract:');
      expect(pub).toContain('path: ../../packages/contract/clients/dart');
      expect(api).toContain('package:starter_contract/openapi_client.dart');
      expect(api).toContain('OpenApiClient');
      expect(api).toContain('accessToken');
      expect(api).toContain('AuthRefreshInputBody');
      expect(storage).toContain('flutter_secure_storage');
      // No hand-written fetch/http in the app — the generated Dart
      // client owns the HTTP surface (Bearer header included).
      expect(dartClient).toContain('GENERATED by scripts/generate-dart-client.mjs');
      expect(dartClient).toContain('class OpenApiClient');
      expect(dartClient).toContain('Authorization');
      expect(dartClient).toContain('Bearer');
      expect(api).not.toMatch(/package:http/);
    });

    it('configures the microservices shape with two base URLs (api + api-auth)', async () => {
      await materialize({ targetDir, name: 'test-app' }, GO_MICROSERVICES_NEXT_FLUTTER);
      const config = await readFile(join(targetDir, 'apps/mobile/lib/src/config.dart'), 'utf8');
      const api = await readFile(join(targetDir, 'apps/mobile/lib/src/api.dart'), 'utf8');
      const env = await readFile(join(targetDir, 'apps/mobile/README.md'), 'utf8');

      expect(config).toContain('AUTH_URL');
      expect(config).toContain('http://localhost:3001');
      expect(api).toContain('config.authUrl');
      expect(api).toContain('config.apiUrl');
      expect(env).toContain('AUTH_URL');
    });

    it('writes the mobile auth smoke test + Taskfile/README seams', async () => {
      await materialize({ targetDir, name: 'test-app' }, GO_MONOLITH_NEXT_FLUTTER);
      const test = await readFile(join(targetDir, 'apps/mobile/test/auth_flow_test.dart'), 'utf8');
      const taskfile = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      const contractReadme = await readFile(join(targetDir, 'packages/contract/README.md'), 'utf8');

      expect(test).toContain('MOBILE_SMOKE_API_URL');
      expect(test).toContain('refresh');
      expect(taskfile).toMatch(/^  dev:mobile:/m);
      expect(taskfile).toMatch(/^  test:mobile:/m);
      expect(taskfile).toMatch(/^  build:mobile:/m);
      expect(readme).toMatch(/Flutter mobile|flutter_secure_storage|decision 23/i);
      expect(contractReadme).toMatch(/generate-dart-client/);
    });
  });

  describe('unimplemented compositions', () => {
    it('throws UnimplementedCompositionError for Go backend', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, backend: 'go' };
      await expect(materialize({ targetDir, name: 'test-app' }, composition)).rejects.toBeInstanceOf(
        UnimplementedCompositionError,
      );
    });

    it('materializes TS + microservices (shape 2 is implemented in issue #12)', async () => {
      const composition: Composition = { ...TS_MONOLITH_VITE, topology: 'microservices' };
      // Shape 2 is now implemented — the materializer should succeed.
      await expect(
        materialize({ targetDir, name: 'test-app' }, composition),
      ).resolves.toBeUndefined();
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

  // ── Shape 2: TS-microservices (issue #12) ─────────────────────────
  // Per decision 10/11: apps/api-auth is the sole minter, apps/api
  // verifies locally via the shared @starter/auth package. The example
  // split extracts a capability (auth/IAM), not a business domain.
  describe('TS-microservices + Vite+TanStack + no-mobile + no-AI (shape 2, issue #12)', () => {
    it('writes the root scaffold files', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      for (const file of ['package.json', 'pnpm-workspace.yaml', 'Taskfile.yml', '.gitignore', 'README.md']) {
        const s = await stat(join(targetDir, file));
        expect(s.isFile(), `${file} should be a file`).toBe(true);
      }
    });

    it('writes apps/api with items module but NO internal/auth (sole-minter invariant)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const apiDir = join(targetDir, 'apps/api');
      expect((await stat(apiDir)).isDirectory()).toBe(true);
      // Items module is here
      for (const file of [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'src/internal/items/items.repo.ts',
        'src/internal/items/items.routes.ts',
        'src/internal/items/index.ts',
      ]) {
        expect((await stat(join(apiDir, file))).isFile(), `${file} should exist`).toBe(true);
      }
      // Auth module is NOT here (it's in apps/api-auth now)
      const authDir = join(apiDir, 'src/internal/auth');
      try {
        await stat(authDir);
        expect.fail('apps/api/src/internal/auth should NOT exist in shape 2');
      } catch (err) {
        expect((err as NodeJS.ErrnoException).code).toBe('ENOENT');
      }
    });

    it('apps/api buildApp mounts /items with requireAuth and NO /auth route (sole-minter invariant)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const idx = await readFile(join(targetDir, 'apps/api/src/index.ts'), 'utf8');
      // /items is mounted
      expect(idx).toMatch(/\.route\(\s*['"]\/items['"]/);
      // requireAuth middleware is applied
      expect(idx).toContain('requireAuth');
      // /auth is NOT mounted in apps/api
      expect(idx).not.toMatch(/\.route\(\s*['"]\/auth['"]/);
      // makeAuthModule is NOT called (the minter lives in api-auth)
      expect(idx).not.toContain('makeAuthModule');
    });

    it('apps/api has a verify-only middleware (no signing) that uses @starter/auth', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const mw = await readFile(join(targetDir, 'apps/api/src/middleware/auth.ts'), 'utf8');
      // Uses verifyToken from @starter/auth
      expect(mw).toContain('verifyToken');
      expect(mw).toContain('@starter/auth');
      // Does NOT use signToken / issueTokenPair (sole minter invariant)
      expect(mw).not.toContain('signToken');
      expect(mw).not.toContain('issueTokenPair');
      // Exports requireAuth
      expect(mw).toMatch(/export\s+function\s+requireAuth/);
    });

    it('writes apps/api-auth as a separate deployable (the sole minter)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const dir = join(targetDir, 'apps/api-auth');
      expect((await stat(dir)).isDirectory(), 'apps/api-auth should exist').toBe(true);
      for (const file of [
        'package.json',
        'tsconfig.json',
        '.env.example',
        'src/index.ts',
        'src/server.ts',
        'src/config.ts',
        'src/internal/auth/auth.repo.ts',
        'src/internal/auth/auth.repo.drizzle.ts',
        'src/internal/auth/auth.routes.ts',
        'src/internal/auth/index.ts',
        'src/internal/auth/auth.repo.test.ts',
      ]) {
        expect((await stat(join(dir, file))).isFile(), `${file} should exist`).toBe(true);
      }
    });

    it('apps/api-auth is the sole minter: exposes /auth routes and uses signToken/issueTokenPair', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const idx = await readFile(join(targetDir, 'apps/api-auth/src/index.ts'), 'utf8');
      // /auth is mounted
      expect(idx).toMatch(/\.route\(\s*['"]\/auth['"]/);
      // makeAuthModule is called
      expect(idx).toContain('makeAuthModule');
      // /items is NOT mounted in api-auth
      expect(idx).not.toMatch(/\.route\(\s*['"]\/items['"]/);
      // The routes use signToken / issueTokenPair (the minting surface)
      const routes = await readFile(
        join(targetDir, 'apps/api-auth/src/internal/auth/auth.routes.ts'),
        'utf8',
      );
      for (const path of ['/register', '/login', '/refresh', '/logout']) {
        expect(routes, `api-auth routes should mount ${path}`).toContain(`'${path}'`);
      }
      expect(routes).toContain('hashPassword');
      expect(routes).toContain('verifyPassword');
      expect(routes).toContain('issueTokenPair');
      expect(routes).toContain('rotateTokenPair');
      expect(routes).toContain('revokeRefreshToken');
    });

    it('apps/api-auth/package.json declares @starter/api-auth and the right deps', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'apps/api-auth/package.json'), 'utf8'),
      );
      expect(pkg.name).toBe('@starter/api-auth');
      // Wraps @starter/auth (decision 10: wrap, not replace)
      expect(pkg.dependencies['@starter/auth']).toBe('workspace:*');
      // Uses Drizzle (for users + refresh_tokens)
      expect(pkg.dependencies['@starter/db']).toBe('workspace:*');
      expect(pkg.dependencies['drizzle-orm']).toEqual(expect.any(String));
    });

    it('packages/auth is shared between apps/api and apps/api-auth (decision 10: wrap, not replace)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const authPkg = join(targetDir, 'packages/auth');
      expect((await stat(authPkg)).isDirectory()).toBe(true);
      // The same package is used by both services
      const apiPkg = JSON.parse(
        await readFile(join(targetDir, 'apps/api/package.json'), 'utf8'),
      );
      const apiAuthPkg = JSON.parse(
        await readFile(join(targetDir, 'apps/api-auth/package.json'), 'utf8'),
      );
      expect(apiPkg.dependencies['@starter/auth']).toBe('workspace:*');
      expect(apiAuthPkg.dependencies['@starter/auth']).toBe('workspace:*');
    });

    it('packages/api-client exports two typed clients (createApiClient + createApiAuthClient)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const idx = await readFile(
        join(targetDir, 'packages/api-client/src/index.ts'),
        'utf8',
      );
      // Two clients for the two services
      expect(idx).toContain('createApiClient');
      expect(idx).toContain('createApiAuthClient');
      // Both are Hono RPC
      expect(idx).toContain('hono/client');
      expect(idx).toMatch(/hc</);
      // Typed against both AppTypes
      expect(idx).toContain('@starter/api');
      expect(idx).toContain('@starter/api-auth');
    });

    it('packages/api-client/package.json depends on both @starter/api and @starter/api-auth', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const pkg = JSON.parse(
        await readFile(join(targetDir, 'packages/api-client/package.json'), 'utf8'),
      );
      expect(pkg.dependencies['@starter/api']).toBe('workspace:*');
      expect(pkg.dependencies['@starter/api-auth']).toBe('workspace:*');
    });

    it('apps/web vite proxy routes /api/auth/* to api-auth and /api/* to api', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const vite = await readFile(join(targetDir, 'apps/web/vite.config.ts'), 'utf8');
      // Two proxy entries
      expect(vite).toMatch(/\/api\/auth/);
      expect(vite).toContain('3001'); // api-auth port
      expect(vite).toContain('3000'); // api port
    });

    it('apps/web auth hook uses apiAuthClient (the auth-service client), not apiClient', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const auth = await readFile(join(targetDir, 'apps/web/src/auth.tsx'), 'utf8');
      // Uses apiAuthClient for auth surface
      expect(auth).toContain('apiAuthClient');
      expect(auth).toMatch(/apiAuthClient\.auth\.(login|logout|register|refresh)/);
    });

    it('apps/web bootstrapAuth uses apiAuthClient.auth.refresh', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const main = await readFile(join(targetDir, 'apps/web/src/main.tsx'), 'utf8');
      // Bootstrap calls refresh through the auth client
      expect(main).toContain('apiAuthClient');
      expect(main).toMatch(/apiAuthClient\.auth\.refresh/);
    });

    it('root Taskfile boots web + api + api-auth in parallel (shape 2)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const tf = await readFile(join(targetDir, 'Taskfile.yml'), 'utf8');
      // Three dev targets
      expect(tf).toMatch(/^  dev:web:/m);
      expect(tf).toMatch(/^  dev:api:/m);
      expect(tf).toMatch(/^  dev:api-auth:/m);
      // The dev meta-task references all three
      const devBlock = tf.match(/^  dev:\n(?:    .+\n)+/m);
      expect(devBlock, 'dev: task should exist').toBeTruthy();
      expect(devBlock![0]).toMatch(/dev:web/);
      expect(devBlock![0]).toMatch(/dev:api/);
      expect(devBlock![0]).toMatch(/dev:api-auth/);
    });

    it('root README documents the TS-microservices shape and the sole-minter invariant', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const readme = await readFile(join(targetDir, 'README.md'), 'utf8');
      // Names the shape
      expect(readme).toMatch(/shape 2|TS-microservices|microservices/i);
      // Names the example split
      expect(readme).toMatch(/example split/i);
      // Names the sole-minter invariant
      expect(readme).toMatch(/sole minter|sole.*mint/i);
      // Has the four sections (decision 33)
      expect(readme).toMatch(/quickstart/i);
      expect(readme).toMatch(/what you just saw/i);
      expect(readme).toMatch(/where to extend/i);
      expect(readme).toMatch(/how to grow/i);
    });

    it('docs/architecture/contract-spine.md is composition-specific (mentions both services)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/contract-spine.md'), 'utf8');
      // Mermaid diagram
      expect(md).toMatch(/```mermaid/);
      // Names both services
      expect(md).toMatch(/apps\/api/);
      expect(md).toMatch(/apps\/api-auth/);
      // Names the sole-minter invariant
      expect(md).toMatch(/sole.*mint|sole minter/i);
    });

    it('docs/architecture/modular-monolith.md is renamed to the example split for shape 2', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const md = await readFile(
        join(targetDir, 'docs/architecture/modular-monolith.md'),
        'utf8',
      );
      expect(md).toMatch(/```mermaid/);
      // Names the example split
      expect(md).toMatch(/example split/i);
      // Names the capability axis (not domain)
      expect(md).toMatch(/capability/i);
    });

    it('docs/architecture/auth-subtree.md shows the sole-minter invariant (decision 11)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const md = await readFile(join(targetDir, 'docs/architecture/auth-subtree.md'), 'utf8');
      expect(md).toMatch(/```mermaid/);
      // Sole minter invariant is documented
      expect(md).toMatch(/sole.*mint|sole minter/i);
      // The auth service is named
      expect(md).toMatch(/apps\/api-auth/);
    });

    it('apps/api .env.example documents JWT_SECRET (for verification, not minting)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const env = await readFile(join(targetDir, 'apps/api/.env.example'), 'utf8');
      expect(env).toContain('JWT_SECRET');
      // Documents that api is the verifier, not the minter
      expect(env).toMatch(/verif|consum/i);
    });

    it('apps/api-auth .env.example documents JWT_SECRET (the sole-minter secret)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const env = await readFile(join(targetDir, 'apps/api-auth/.env.example'), 'utf8');
      expect(env).toContain('JWT_SECRET');
      // Documents the sole-minter role
      expect(env).toMatch(/sole minter|minter|signing/i);
    });

    it('docs/standards/best-practices.md documents splitting another capability (decision 10)', async () => {
      await materialize({ targetDir, name: 'test-app' }, TS_MICROSERVICES_VITE);
      const md = await readFile(join(targetDir, 'docs/standards/best-practices.md'), 'utf8');
      // Names the split pattern
      expect(md).toMatch(/split/i);
      // Names the capability axis
      expect(md).toMatch(/capability/i);
    });
  });
});
