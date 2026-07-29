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
      // credentials: 'include' is what sends the httpOnly cookie
      expect(main).toMatch(/credentials\s*:\s*['"]include['"]/);
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
