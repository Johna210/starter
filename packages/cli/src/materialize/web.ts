// Materializer: apps/web templates (Vite + React + TanStack Router/Query).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 13 files written into apps/web (package.json, tsconfig, vite
// config, index.html, .env.example, src/main.tsx, src/app.css,
// src/router.tsx, src/pages/index.tsx, src/pages/items.tsx,
// src/pages/login.tsx, src/lib/api.ts, src/config.ts, src/auth.tsx).
// The orchestrator (materialize.ts) calls writeWeb(ctx); template
// functions are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeWeb(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'apps/web/package.json'), webPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/web/tsconfig.json'), webTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/web/vite.config.ts'), webViteConfig());
  await writeFileRecursive(join(targetDir, 'apps/web/index.html'), webIndexHtml());
  await writeFileRecursive(join(targetDir, 'apps/web/.env.example'), webEnvExample());
  await writeFileRecursive(join(targetDir, 'apps/web/src/main.tsx'), webMainTsx());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app.css'), webAppCss());
  await writeFileRecursive(join(targetDir, 'apps/web/src/router.tsx'), webRouter());
  await writeFileRecursive(join(targetDir, 'apps/web/src/auth.tsx'), webAuthTsx());
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/index.tsx'), webIndexPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/items.tsx'), webItemsPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/login.tsx'), webLoginPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/api.ts'), webLibApi());
  await writeFileRecursive(join(targetDir, 'apps/web/src/config.ts'), webConfigTs());
}

function webPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/web',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite --port 5173 --host',
        build: 'vite build',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@starter/api-client': 'workspace:*',
        '@starter/shared': 'workspace:*',
        '@tanstack/react-query': '^5.59.0',
        '@tanstack/react-router': '^1.79.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        typescript: '^5.9.3',
        vite: '^6.0.0',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function webTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        types: ['vite/client'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function webViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server proxies /api → apps/api so the web can call
// \`/api/auth/login\`, \`/api/items\`, etc. without CORS in dev. In
// production the deploy platform does the same routing, and the
// app reads the relative \`/api\` from src/config.ts (VITE_API_URL).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, ''),
      },
    },
  },
});
`;
}

function webIndexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter — TS-monolith</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function webMainTsx(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { AuthProvider } from './auth';
import './app.css';

const queryClient = new QueryClient();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
`;
}

function webAppCss(): string {
  return `:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color-scheme: light dark;
  background: #0b0d10;
  color: #e6e6e6;
}

body {
  margin: 0;
  min-height: 100vh;
}
`;
}

function webIndexPage(): string {
  return `import { Link } from '@tanstack/react-router';
import { useAuth } from '../auth';

export function IndexPage() {
  const { accessToken, signOut } = useAuth();
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Starter — TS-monolith</h1>
      <p>Web shell is up. api-client is wired in via <code>src/lib/api.ts</code>.</p>
      {accessToken ? (
        <>
          <p>
            <Link to="/items">View items →</Link>
          </p>
          <p>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </p>
        </>
      ) : (
        <p>
          <Link to="/login">Sign in →</Link>
        </p>
      )}
    </main>
  );
}
`;
}

function webItemsPage(): string {
  return `// @starter/web — items page (issues 05 + 06).
//
// The first end-to-end view of the spine: web → api-client → api → db.
// Lists items via TanStack Query against the typed api-client and lets
// the user create a new one through a small form. The list refreshes
// after a successful create via TanStack Query invalidation.
//
// Auth (issue 06): the page is **auth-protected**. The router's
// beforeLoad guard is the first line of defense (it redirects
// unauthenticated users to /login before the page renders); the
// in-page useEffect is the second (it covers the case where the user
// is signed out from another tab while the page is mounted). The
// api-client itself is the third (every request carries a Bearer
// access token; on 401 it transparently refreshes via the
// httpOnly cookie and retries — see src/lib/api.ts).
//
// Type discipline: the \`Item\` type is inferred from the api-client's
// response shape via \`Awaited<ReturnType<typeof fetchItems>>\`. The
// api route is the single source of truth — no manual interface, no
// \`any\` (decision 17/18: end-to-end Hono RPC inference).

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { apiClient } from '../lib/api';
import { useAuth } from '../auth';

async function fetchItems() {
  const res = await apiClient.items.$get();
  if (!res.ok) {
    throw new Error(\`Failed to load items: \${res.status}\`);
  }
  return res.json();
}

type Item = Awaited<ReturnType<typeof fetchItems>>[number];

export function ItemsPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  // Defense-in-depth: the router's beforeLoad already guards /items,
  // but a sign-out in another tab should kick the user back to /login
  // without leaving them staring at a 401-induced empty list.
  useEffect(() => {
    if (!accessToken) {
      void navigate({ to: '/login' });
    }
  }, [accessToken, navigate]);

  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    // Don't fire the query while unauthenticated — the api would 401
    // and the refresh-on-401 path would loop.
    enabled: Boolean(accessToken),
  });

  const createItem = useMutation({
    mutationFn: async (newName: string) => {
      const res = await apiClient.items.$post({ json: { name: newName } });
      if (!res.ok) {
        throw new Error(\`Failed to create item: \${res.status}\`);
      }
      return res.json();
    },
    onSuccess: () => {
      // Refresh the list (decision 22: the single source of truth for
      // items lives on the api, not in this client's cache).
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      setName('');
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createItem.mutate(trimmed);
  };

  if (!accessToken) {
    // The router's beforeLoad should already have redirected, but
    // render nothing rather than the (broken) list view while the
    // navigation is in flight.
    return null;
  }

  return (
    <main style={{ padding: '2rem' }}>
      <p>
        <Link to="/">← Home</Link>
      </p>
      <h1>Items</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          maxLength={256}
          required
          aria-label="Item name"
        />
        <button type="submit" disabled={createItem.isPending}>
          {createItem.isPending ? 'Creating…' : 'Create'}
        </button>
      </form>

      {itemsQuery.isPending && <p>Loading…</p>}
      {itemsQuery.isError && <p>Error: {String(itemsQuery.error)}</p>}
      {itemsQuery.data && itemsQuery.data.length === 0 && <p>No items yet.</p>}
      {itemsQuery.data && itemsQuery.data.length > 0 && (
        <ul>
          {itemsQuery.data.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
`;
}

function webLoginPage(): string {
  return `// @starter/web — login page (issue 06).
//
// The web's entry point for the auth flow. POSTs to /auth/login (via
// the typed api-client), gets back { access, refresh, userId }; the
// api also sets the httpOnly refresh cookie. We store the access
// token in memory (the SPA variant's storage model per decision 16)
// and navigate to /items. Errors surface inline.
//
// After login, the api-client's refresh-on-401 path is what keeps the
// user signed in past the access token's short TTL: the httpOnly
// cookie survives reload, so a 401 transparently calls /auth/refresh
// and retries. The user never sees the refresh dance.

import { useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '../lib/api';
import { useAuth } from '../auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      void navigate({ to: '/items' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '24rem' }}>
      <h1>Sign in</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            aria-label="Email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            aria-label="Password"
          />
        </label>
        {error && (
          <p role="alert" style={{ color: '#f88' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
`;
}

function webAuthTsx(): string {
  return `// @starter/web — auth context (issue 06, decision 16).
//
// The SPA variant's auth model: the access token lives **in memory**
// (per decision 16, the SPA storage model). The refresh token is in
// an httpOnly cookie set by /auth/login + /auth/refresh, so it
// survives a page reload without being readable from JS (the
// XSS-mitigation half of decision 16's tradeoff).
//
// Auth state is held in a module-level store (see
// \`accessTokenStore\` in src/lib/api.ts) and surfaced to React via
// \`useSyncExternalStore\`. The store is the same one the api-client's
// custom-fetch reads from, so a successful signIn() in this provider
// is immediately visible to the next api call \u2014 no race, no prop
// drilling, no context provider wrapping every fetch.
//
// Exports:
//   - \`AuthProvider\`: the React provider component
//   - \`useAuth()\`: hook returning { accessToken, signIn, signOut }

import { useCallback, useSyncExternalStore } from 'react';
import { apiClient, accessTokenStore } from './lib/api';

export interface AuthState {
  /** The current access token, or null when signed out. */
  accessToken: string | null;
  /**
   * Sign in with email + password. On success the access token is
   * stored in memory and the httpOnly refresh cookie is set by the
   * api. On failure the thrown Error's message is what the login
   * page surfaces to the user.
   */
  signIn(input: { email: string; password: string }): Promise<void>;
  /** Sign out: clear the in-memory access token and revoke the refresh. */
  signOut(): Promise<void>;
}

export function useAuth(): AuthState {
  const accessToken = useSyncExternalStore(
    accessTokenStore.subscribe,
    accessTokenStore.get,
    accessTokenStore.get,
  );

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await apiClient.auth.login.$post({ json: { email, password } });
    if (!res.ok) {
      // 401 is the common case; we surface a generic message rather
      // than leaking the api's body (login responses are intentionally
      // vague to avoid email enumeration).
      throw new Error('Invalid email or password');
    }
    const data = await res.json();
    accessTokenStore.set(data.access);
  }, []);

  const signOut = useCallback(async () => {
    // Clear the in-memory token immediately so the UI updates without
    // waiting for the network round-trip. The /auth/logout call is
    // best-effort: if it fails (network, expired refresh) the cookie
    // will still expire on its own at the refresh-token TTL.
    accessTokenStore.set(null);
    try {
      await apiClient.auth.logout.$post({});
    } catch {
      // Already cleared locally; nothing else to do.
    }
  }, []);

  return { accessToken, signIn, signOut };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`;
}

function webRouter(): string {
  return `import { createRootRoute, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { IndexPage } from './pages/index';
import { ItemsPage } from './pages/items';
import { LoginPage } from './pages/login';
import { accessTokenStore } from './lib/api';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

// /login — the unauthenticated user's entry point (issue 06).
// No guard: this IS the guard target. If the user is already signed
// in they can still see it (e.g. to switch accounts); the page just
// navigates to /items on success.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// /items — auth-protected (issue 06). The route's beforeLoad is the
// first line of defense: an unauthenticated visit redirects to
// /login before the page renders. The ItemsPage also re-checks via
// useAuth() for defense in depth (a sign-out in another tab).
const itemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/items',
  component: ItemsPage,
  // beforeLoad auth guard mirrors the api's requireAuth middleware.
  beforeLoad: ({ location }): void => {
    if (!accessTokenStore.get()) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, itemsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
`;
}

function webLibApi(): string {
  return `// @starter/web \u2014 typed entry point to the api, with auth wired in.
//
// Builds the apiClient (Hono RPC, decision 17/18) from the runtime-resolved
// base URL in ./config and gives the rest of the app a single canonical
// import: \`import { apiClient } from '@/lib/api'\`. Pages call
// \`apiClient.items.\$get()\` / \`\$post(...)\` and get end-to-end type
// inference against apps/api/src/index.ts's Hono router.
//
// Auth wiring (issue 06, decision 16):
// - The custom \`authedFetch\` is the \`fetch\` Hono RPC uses internally.
//   Before every request it attaches \`Authorization: Bearer <token>\` (if
//   we have one), then sends. On a 401 (excluding /auth/* endpoints),
//   it transparently POSTs /auth/refresh (the httpOnly cookie rides
//   along automatically via \`credentials: 'include'\`), updates the
//   in-memory access token, and retries the original request once.
// - The \`accessTokenStore\` is a tiny pub/sub singleton the
//   AuthProvider's useAuth() hook subscribes to via useSyncExternalStore.
//   No React context wraps every api call; the fetch reads from the
//   store directly, so signIn() \u2192 next api call is race-free.

import { createApiClient } from '@starter/api-client';
import { config } from '../config';

/**
 * The refresh-cookie name. Owned by the api (apps/api/src/internal/auth
 * sets it); duplicated here because the client doesn't read the api's
 * source. Keep in sync with REFRESH_COOKIE_NAME in the api.
 */
const REFRESH_COOKIE_NAME = 'starter_refresh';

/* ------------------------------------------------------------------ *
 *  Access-token store (the seam between React state and the fetch).  *
 * ------------------------------------------------------------------ */

type Listener = () => void;

class AccessTokenStore {
  private token: string | null = null;
  private listeners = new Set<Listener>();

  get = (): string | null => this.token;

  set(next: string | null): void {
    if (this.token === next) return;
    this.token = next;
    for (const l of this.listeners) l();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const accessTokenStore = new AccessTokenStore();

/* ------------------------------------------------------------------ *
 *  authedFetch: the refresh-on-401 wrapper.                            *
 * ------------------------------------------------------------------ */

const AUTH_PATH_PREFIX = '/auth/';

function isAuthEndpoint(url: string): boolean {
  // Match /auth/login, /auth/refresh, /auth/logout, /auth/register.
  // We deliberately don't strip query strings \u2014 the api's auth paths
  // don't take query params today; if that ever changes this is the
  // place to revisit.
  return url.includes(AUTH_PATH_PREFIX);
}

async function refreshAccessToken(apiBaseUrl: string): Promise<string | null> {
  const res = await fetch(\`\${apiBaseUrl}/auth/refresh\`, {
    method: 'POST',
    credentials: 'include', // send the httpOnly cookie
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access?: string };
  return data.access ?? null;
}

const authedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const skipAuth = isAuthEndpoint(url);

  // 1. Attach the Bearer header on non-auth calls when we have a token.
  const headers = new Headers(init?.headers);
  const token = accessTokenStore.get();
  if (token && !skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }
  const authedInit: RequestInit = { ...init, headers, credentials: 'include' };

  // 2. Fire the request.
  const response = await fetch(input, authedInit);

  // 3. On 401, try a transparent refresh + retry \u2014 but only for
  //    non-auth endpoints (the refresh endpoint must not recurse).
  if (response.status === 401 && !skipAuth && token) {
    const newAccess = await refreshAccessToken(config.apiUrl);
    if (newAccess) {
      accessTokenStore.set(newAccess);
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set('Authorization', \`Bearer \${newAccess}\`);
      return fetch(input, { ...init, headers: retryHeaders, credentials: 'include' });
    }
    // Refresh failed: the cookie is gone (expired, revoked, or
    // never present). Drop the in-memory token so the route guard
    // kicks the user to /login on the next render.
    accessTokenStore.set(null);
  }

  return response;
};

/* ------------------------------------------------------------------ *
 *  Public surface.                                                     *
 * ------------------------------------------------------------------ */

export const apiClient = createApiClient(config.apiUrl, { fetch: authedFetch });
`;
}

function webConfigTs(): string {
  return `// @starter/web \u2014 typed config (decision 28).
//
// Reads VITE_API_URL (the api base URL) from Vite's import.meta.env and
// validates it through a zod schema. The web app never reads
// import.meta.env directly \u2014 everything goes through \`config\` so the
// surface is one typed object, fail-fast on missing/invalid at boot.
// Copy apps/web/.env.example to apps/web/.env for local dev.
//
// Default: \`/api\` (a same-origin relative URL). Vite's dev server
// proxies /api to the api at http://localhost:3000 (see vite.config.ts),
// and the production deploy platform does the same routing \u2014 the
// cookie stays first-party in both environments.

import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .default('/api'),
});

const parsed = configSchema.safeParse({
  apiUrl: import.meta.env.VITE_API_URL,
});

if (!parsed.success) {
  // Fail-fast on bad config so the user sees the error at boot, not at
  // the first api call (decision 28).
  throw new Error(
    \`Invalid @starter/web config: \${parsed.error.issues
      .map((i) => \`\${i.path.join('.')}: \${i.message}\`)
      .join('; ')}\`,
  );
}

export const config = parsed.data;
export type Config = z.infer<typeof configSchema>;
`;
}

function webEnvExample(): string {
  return `# @starter/web \u2014 local dev env (git-ignored; copy to .env).
#
# Decision 28: dev loads vars via .env + Vite, prod uses the deploy
# platform's real env vars (Vercel/Cloudflare/Fly inject them). Vite
# picks up vars prefixed with VITE_ and exposes them on import.meta.env.
# Code never reads import.meta.env directly \u2014 go through src/config.ts.

# Base URL of the api. The default (empty here, defaults to /api in
# src/config.ts) is the same-origin path that Vite proxies to
# http://localhost:3000 in dev and the deploy platform proxies in
# production. Keep it relative when you can: same-origin means the
# httpOnly refresh cookie is always first-party (no CORS dance).
#
# If you need to call the api cross-origin (e.g. running the web on
# a different host than the api in dev), set this to the full URL
# AND add the appropriate CORS config to apps/api/src/index.ts.
# VITE_API_URL=/api
`;
}
