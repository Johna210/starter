// Materializer: apps/web templates for the Next.js web variant (ticket
// 12 — the web for the Go shapes 3 & 4, blessed per decision 24b).
//
// Next.js (App Router, RSC) consumes the codegen'd TS client from
// packages/contract (decision 19: Go is canonical, clients are
// downstream) — no hand-written fetch URLs anywhere. The items page is
// a server component; the create-item form and login page are client
// components; the list refreshes after create via router.refresh()
// (re-runs the server component, which refetches through the api).
//
// Web-auth flow (decision 16, Next SSR variant): the refresh token
// stays in the api's httpOnly cookie; the short-lived access token is
// stored in a JS-readable cookie so it can be forwarded from the
// incoming request into the server-side api-client (lib/server.ts).
// The browser half (lib/client.ts) does refresh-on-401 transparently
// against /api/auth/refresh (cookie rides along, rotation lands via
// Set-Cookie); the server half sends the browser through the /refresh
// bridge (a route handler — the one place the web may set cookies)
// when a server-side call 401s.
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into apps/web for the Next variant (the
// Vite+TanStack variant lives in web.ts). The orchestrator
// (materialize.ts) calls writeNextWeb(ctx, composition); template
// functions are private to this module.
//
// Shape 4 (Go-microservices, issue 15) reuses this module unchanged:
// the composition only changes the dev proxy split (next.config.ts)
// and which base URLs the server-side config defaults document.

import { join } from 'node:path';
import { type Composition } from '../composition.js';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeNextWeb(ctx: ProjectContext, composition: Composition): Promise<void> {
  const { targetDir } = ctx;
  const isMicroservices = composition.topology === 'microservices';
  const shapeLabel = isMicroservices ? 'Go-microservices' : 'Go-monolith';

  await writeFileRecursive(join(targetDir, 'apps/web/package.json'), webNextPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/web/tsconfig.json'), webNextTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/web/next-env.d.ts'), webNextEnvDts());
  await writeFileRecursive(join(targetDir, 'apps/web/next.config.ts'), webNextConfigTs(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/web/.env.example'), webNextEnvExample(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/web/src/config.ts'), webNextConfigModule(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/token-cookie.ts'), webNextTokenCookie(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/client.ts'), webNextClient());
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/server.ts'), webNextServer());
  await writeFileRecursive(join(targetDir, 'apps/web/src/lib/server.test.ts'), webNextServerTest());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/layout.tsx'), webNextLayout(shapeLabel));
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/page.tsx'), webNextIndexPage(shapeLabel));
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/globals.css'), webNextGlobalsCss());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/login/page.tsx'), webNextLoginPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/items/page.tsx'), webNextItemsPage());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app/refresh/route.ts'), webNextRefreshRoute(isMicroservices));
  await writeFileRecursive(join(targetDir, 'apps/web/src/components/sign-out-button.tsx'), webNextSignOutButton());
  await writeFileRecursive(join(targetDir, 'apps/web/src/components/create-item-form.tsx'), webNextCreateItemForm());
}

function webNextPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/web',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'next dev -p 5173',
        build: 'next build',
        start: 'next start -p 5173',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@starter/contract': 'workspace:*',
        next: '^15.1.6',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/node': '^24.13.3',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function webNextTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  ) + '\n';
}

function webNextEnvDts(): string {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.
`;
}

function webNextConfigTs(isMicroservices: boolean): string {
  if (isMicroservices) {
    return `import type { NextConfig } from 'next';

// Shape 4 (Go-microservices): the dev proxy routes to TWO backends.
// - /api/auth/* -> apps/api-auth (:3001) — the sole minter (decision 11)
// - /api/*      -> apps/api (:3000) — the main api, verifies locally
// The web code is identical to the monolith: it still calls /api/auth/login,
// /api/items, etc. The proxy keeps the httpOnly refresh cookie first-party.
//
// API_URL / API_AUTH_URL are the same vars src/config.ts validates
// (decision 28); in production the deploy platform does the same routing.
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const API_AUTH_URL = process.env.API_AUTH_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  rewrites: async () => [
    { source: '/api/auth/:path*', destination: \`\${API_AUTH_URL}/:path*\` },
    { source: '/api/:path*', destination: \`\${API_URL}/:path*\` },
  ],
};

export default nextConfig;
`;
  }
  return `import type { NextConfig } from 'next';

// Dev proxy: /api/* -> the Go api on :3000 (the mirror of the Vite
// variant's vite proxy). Same-origin keeps the httpOnly refresh cookie
// first-party, so there is no CORS. In production the deploy platform
// does the same routing — the web stays a thin client over the
// contract (decision 15).
//
// API_URL is the same var src/config.ts validates (decision 28).
const API_URL = process.env.API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  rewrites: async () => [
    { source: '/api/:path*', destination: \`\${API_URL}/:path*\` },
  ],
};

export default nextConfig;
`;
}

function webNextEnvExample(isMicroservices: boolean): string {
  const authNote = isMicroservices
    ? `# Shape 4 (Go-microservices): the auth endpoints live on apps/api-auth;
# point API_AUTH_URL at it (:3001). The Go-monolith shape leaves this
# equal to API_URL.
API_AUTH_URL=http://localhost:3001`
    : `# The auth endpoints are served by the same api in the Go-monolith
# (shape 3); the Go-microservices shape points this at apps/api-auth.
API_AUTH_URL=http://localhost:3000`;
  return `# apps/web — env surface (decision 28). Copy to .env.local for dev;
# prod injects real env vars. Code reads these only through src/config.ts
# (the server-side client). The browser never reads process.env: client
# components call the same-origin /api path, which next.config.ts
# rewrites to these hosts in dev.

# Server-side base URL of the main api (items + health).
API_URL=http://localhost:3000

${authNote}
`;
}

function webNextConfigModule(isMicroservices: boolean): string {
  const apiAuthDefault = isMicroservices
    ? 'http://localhost:3001'
    : 'http://localhost:3000';
  return `// @starter/web — typed config (decision 28).
//
// Server-side base URLs for the main api and the auth endpoints.
// Client components never read these: the browser calls the
// same-origin /api path (proxied to these hosts by next.config.ts
// rewrites in dev, by the deploy platform in production). This
// module is server-only — keep it out of client component imports.
// (The dev proxy in next.config.ts reads the same two env vars for
// its rewrites; those two files are the only env readers.)
// Copy apps/web/.env.example to apps/web/.env.local for local dev.

import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z
    .string()
    .min(1, 'API_URL is required')
    .default('http://localhost:3000'),
  apiAuthUrl: z
    .string()
    .min(1, 'API_AUTH_URL is required')
    .default('${apiAuthDefault}'),
});

const parsed = configSchema.safeParse({
  apiUrl: process.env.API_URL,
  apiAuthUrl: process.env.API_AUTH_URL,
});

if (!parsed.success) {
  // Fail-fast on bad config so the user sees the error at boot, not
  // at the first api call (decision 28).
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

function webNextTokenCookie(isMicroservices: boolean): string {
  const cookieOwner = isMicroservices
    ? 'apps/api-auth/internal/auth/auth.routes.go'
    : 'apps/api/internal/auth/auth.routes.go';
  return `// Access-token cookie helpers (decision 16, Next SSR variant).
//
// The access token lives in a JS-readable cookie so that (a) the
// browser can store it after login/refresh and (b) server components
// can forward it from the incoming request into the server-side
// api-client (lib/server.ts). It is short-lived (the api's
// ACCESS_TOKEN_TTL) — the XSS exposure window of decision 16's
// accepted tradeoff. The REFRESH token is never here: it stays in
// the api's httpOnly cookie, unreadable from JS.

export const ACCESS_TOKEN_COOKIE = 'access_token';

// Keep in sync with the api's refresh cookie name (the single source
// of truth is ${cookieOwner}). The SPA variant
// duplicates it the same way (apps/web/src/lib/api.ts).
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Keep in sync with ACCESS_TOKEN_TTL in apps/api (default 900s). The
// api owns the real TTL; this only bounds the cookie's lifetime.
export const ACCESS_TOKEN_TTL_SECONDS = 900;

export function getAccessTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(\`\${ACCESS_TOKEN_COOKIE}=\`));
  return match ? decodeURIComponent(match.slice(ACCESS_TOKEN_COOKIE.length + 1)) : null;
}

export function setAccessTokenCookie(token: string): void {
  document.cookie =
    \`\${ACCESS_TOKEN_COOKIE}=\${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=\${ACCESS_TOKEN_TTL_SECONDS}\`;
}

export function clearAccessTokenCookie(): void {
  document.cookie = \`\${ACCESS_TOKEN_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0\`;
}
`;
}

function webNextClient(): string {
  return `// @starter/web — the browser-side api-client (decision 15/16).
//
// Every client-component call (login, create-item, sign-out) goes
// through the codegen'd @starter/contract client — no hand-written
// fetch URLs. The base URL is the same-origin /api path, proxied to
// the api by next.config.ts rewrites in dev and the deploy platform
// in production, so the httpOnly refresh cookie stays first-party.
//
// Auth wiring (decision 16): the access token is read from the
// JS-readable access_token cookie. \`authedFetch\` attaches it as a
// Bearer header; on a 401 (excluding /auth/* endpoints) it
// transparently POSTs /auth/refresh via the typed client — the
// httpOnly cookie rides along through \`credentials: 'include'\`, the
// api rotates it and Set-Cookies the new one — stores the fresh
// access token, and retries the original request once.

import { createClient } from '@starter/contract';
import {
  clearAccessTokenCookie,
  getAccessTokenCookie,
  setAccessTokenCookie,
} from './token-cookie';

const AUTH_PATH_PREFIX = '/auth/';

function isAuthEndpoint(url: string): boolean {
  // Match /auth/login, /auth/refresh, /auth/logout, /auth/register.
  return url.includes(AUTH_PATH_PREFIX);
}

const authedFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const skipAuth = isAuthEndpoint(url);

  // 1. Attach the Bearer header on non-auth calls when we have a token.
  const headers = new Headers(init?.headers);
  const token = getAccessTokenCookie();
  if (token && !skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }
  const response = await fetch(input, { ...init, headers, credentials: 'include' });

  // 2. On 401, try a transparent refresh + retry — but only for
  //    non-auth endpoints (the refresh endpoint must not recurse).
  //    Not gated on having a token: the access cookie dies in lockstep
  //    with the token, so an idle-but-signed-in user has a live
  //    refresh cookie but no access token.
  if (response.status === 401 && !skipAuth) {
    try {
      const pair = await client.auth.refresh({});
      setAccessTokenCookie(pair.access);
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set('Authorization', \`Bearer \${pair.access}\`);
      return fetch(input, { ...init, headers: retryHeaders, credentials: 'include' });
    } catch {
      // Refresh failed (no cookie / expired / revoked): drop the
      // access token; the next navigation lands on /login.
      clearAccessTokenCookie();
    }
  }

  return response;
};

// The one browser client. \`client.auth.refresh\` in authedFetch runs
// through this same wrapper; isAuthEndpoint keeps it from recursing.
export const client = createClient({
  baseUrl: '/api',
  getAccessToken: getAccessTokenCookie,
  fetch: authedFetch,
});
`;
}

function webNextServer(): string {
  return `// @starter/web — the server-side api-client (decision 16, Next SSR
// variant). Server components (and the refresh bridge) reach the api
// through the same codegen'd @starter/contract client the browser
// uses; what differs is where the access token comes from: it is
// forwarded from the incoming request's cookie (next/headers), never
// read from module state or process.env.
//
// refresh-on-401 is a property of the api-client (decision 16): when
// a server-side call 401s, \`onUnauthorized\` sends the browser through
// the /refresh bridge (src/app/refresh/route.ts) — a route handler,
// the one place the web may set cookies, which rotates the refresh
// cookie and stores the new access token. Server components cannot
// set cookies, so the client must not try.
//
// User-scoped data is never cached: \`cache: 'no-store'\` keeps an RSC
// fetch from sharing one user's items with the next request
// (decision 17b's unbatch rule — the same property, the same carve-out).

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@starter/contract';
import { config } from '../config';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './token-cookie';

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

/**
 * The server-side clients: \`api\` for the main api (items) and \`auth\`
 * for the auth endpoints (used by the refresh bridge). In the
 * Go-monolith both point at the same server; in shape 4 the auth
 * endpoints live on apps/api-auth (config.apiAuthUrl).
 */
export async function createServerClients(): Promise<{
  api: ReturnType<typeof createClient>;
  auth: ReturnType<typeof createClient>;
}> {
  const cookieStore = await cookies();

  const serverFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: 'no-store' });

  const api = createClient({
    baseUrl: config.apiUrl,
    getAccessToken: () => cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    // A 401 means the access token is missing or expired. The browser
    // still holds (or not) the httpOnly refresh cookie, so we send it
    // through the refresh bridge rather than failing the render.
    onUnauthorized: () => {
      redirect('/refresh');
    },
    fetch: serverFetch,
  });

  const auth = createClient({
    baseUrl: config.apiAuthUrl,
    getAccessToken: () => cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null,
    fetch: serverFetch,
  });

  return { api, auth };
}
`;
}

function webNextServerTest(): string {
  return `// The server-side api-client's decision-16 properties, exercised with
// a stubbed cookie store + fetch (decision 22: modules tested where
// they stand — real HTTP is the E2E's job):
//   1. the access token is forwarded from the incoming request cookie
//   2. refresh-on-401: a 401 routes the browser through /refresh (the
//      refresh is a property of the client, not bespoke per page)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCookies, mockRedirect } = vi.hoisted(() => ({
  mockCookies: new Map<string, string>(),
  mockRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined,
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { createServerClients } from './server';

describe('server-side api-client (Next SSR variant, decision 16)', () => {
  beforeEach(() => {
    mockCookies.clear();
    mockRedirect.mockClear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the access token from the incoming cookie as a Bearer header', async () => {
    mockCookies.set('access_token', 'test-access-token');
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { api } = await createServerClients();
    const items = await api.items.list();

    expect(items).toEqual([]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://localhost:3000/items');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('routes a 401 through the /refresh bridge (refresh-on-401 is a property of the client)', async () => {
    mockCookies.set('access_token', 'expired-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
          new Response(JSON.stringify({ detail: 'unauthorized' }), { status: 401 }),
      ),
    );

    const { api } = await createServerClients();
    await expect(api.items.list()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/refresh');
  });
});
`;
}

function webNextLayout(shapeLabel: string): string {
  return `import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SignOutButton } from '../components/sign-out-button';
import { ACCESS_TOKEN_COOKIE } from '../lib/token-cookie';
import './globals.css';

export const metadata: Metadata = {
  title: 'Starter — ${shapeLabel}',
  description:
    'Scaffolded from create-fs-starter: a Next.js web over the OpenAPI contract spine (decision 19).',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);

  return (
    <html lang="en">
      <body>
        <nav style={{ padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/">Home</Link>
          <Link href="/items">Items</Link>
          {signedIn ? <SignOutButton /> : <Link href="/login">Sign in</Link>}
        </nav>
        {children}
      </body>
    </html>
  );
}
`;
}

function webNextIndexPage(shapeLabel: string): string {
  return `import { cookies } from 'next/headers';
import Link from 'next/link';
import { ACCESS_TOKEN_COOKIE } from '../lib/token-cookie';

export default async function HomePage() {
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Starter — ${shapeLabel}</h1>
      <p>
        Web shell is up; the api-client is the only door to the api (decision 15).
      </p>
      {signedIn ? (
        <p>
          <Link href="/items">View items →</Link>
        </p>
      ) : (
        <p>
          <Link href="/login">Sign in →</Link>
        </p>
      )}
    </main>
  );
}
`;
}

function webNextGlobalsCss(): string {
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

a {
  color: #6ea8fe;
}
`;
}

function webNextLoginPage(): string {
  return `'use client';

// The login page (decision 16 in the Next SSR variant). POSTs to
// /auth/login via the codegen'd client: the api sets the httpOnly
// refresh cookie (first-party through the /api rewrite), the page
// stores the short-lived access token in its JS-readable cookie, and
// the router navigates to /items — whose server components now find
// the token in the incoming request and forward it into the
// server-side api-client.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '../../lib/client';
import { setAccessTokenCookie } from '../../lib/token-cookie';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await client.auth.login({ email, password });
      setAccessTokenCookie(data.access);
      router.push('/items');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

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

function webNextItemsPage(): string {
  return `// The items page (decision 13): the first end-to-end view of the
// spine in the Next SSR variant. A server component: the list is
// fetched through the server-side api-client, which forwards the
// access token from the incoming request's cookie (decision 16).
// Unauthenticated visits 401, which the client turns into a redirect
// through the /refresh bridge — and then /login when there is no
// session at all. Creating an item runs in the client component form;
// router.refresh() re-runs this component, so the list refetches.

import { CreateItemForm } from '../../components/create-item-form';
import { createServerClients } from '../../lib/server';

export default async function ItemsPage() {
  const { api } = await createServerClients();
  const items = await api.items.list();

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Items</h1>
      <CreateItemForm />
      {items.length === 0 ? (
        <p>No items yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
`;
}

function webNextRefreshRoute(isMicroservices: boolean): string {
  const ttlOwner = isMicroservices ? 'apps/api-auth' : 'apps/api';
  return `// The refresh bridge (decision 16 in the Next SSR variant).
//
// When a server-side api call 401s, the server-side api-client sends
// the browser here (redirect from a server component — GET-only).
// Server components cannot set cookies; this route handler can, so it
// is the one place the web rotates the session: it exchanges the
// browser's httpOnly refresh cookie for a fresh pair via the api and
// writes both cookies on the response.
//
// A GET that rotates tokens is a pragmatic exception to HTTP's
// side-effect-free GET rule — the browser must be able to land here
// via redirect(), which only issues GETs.
//
// Returns the user where they were going: the Referer header (the
// page that triggered the redirect), or /items. When there is no
// session to refresh, it lands on /login instead — the referer page
// is auth-protected, so sending the user back would loop /refresh
// forever.

import { NextRequest, NextResponse } from 'next/server';
import type { AuthTokens } from '@starter/contract';
import { createClient } from '@starter/contract';
import { config } from '../../config';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
} from '../../lib/token-cookie';

// Keep in sync with REFRESH_TOKEN_TTL in ${ttlOwner} (default 604800s).
const REFRESH_TOKEN_TTL_SECONDS = 604800;

function backToPath(request: NextRequest): string {
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).pathname;
    } catch {
      // malformed referer — fall through to the default
    }
  }
  return '/items';
}

export async function GET(request: NextRequest) {
  const out = NextResponse.redirect(new URL(backToPath(request), request.url));

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    // No session at all — the user is signed out, and the referer page
    // is auth-protected (sending them back would loop /refresh forever).
    return signedOutResponse(request);
  }

  const auth = createClient({ baseUrl: config.apiAuthUrl });
  let pair: AuthTokens;
  try {
    pair = await auth.auth.refresh({ refresh: refreshToken });
  } catch {
    // Refresh token invalid / expired / revoked — the session is gone.
    return signedOutResponse(request);
  }

  out.cookies.set(ACCESS_TOKEN_COOKIE, pair.access, {
    path: '/',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  out.cookies.set(REFRESH_TOKEN_COOKIE, pair.refresh, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  return out;
}

// The signed-out branch of the bridge: /login, with any stale cookies
// cleared (the api's refresh cookie clears itself via Max-Age=0 on the
// logout path; here we mirror it for the no-session case).
function signedOutResponse(request: NextRequest): NextResponse {
  const out = NextResponse.redirect(new URL('/login', request.url));
  out.cookies.set(ACCESS_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
  out.cookies.set(REFRESH_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
  return out;
}
`;
}

function webNextSignOutButton(): string {
  return `'use client';

import { useRouter } from 'next/navigation';
import { client } from '../lib/client';
import { clearAccessTokenCookie } from '../lib/token-cookie';

// Sign-out button (decision 16). Clears the JS-readable access token
// immediately so the UI updates without waiting for the network;
// /auth/logout revokes the refresh token and clears the httpOnly
// cookie (best-effort — a failing call still leaves the user signed
// out locally, and the cookie expires on its own).

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    clearAccessTokenCookie();
    try {
      await client.auth.logout({});
    } catch {
      // Already signed out locally; nothing else to do.
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
`;
}

function webNextCreateItemForm(): string {
  return `'use client';

// The create-item form (decision 13/15): a client component that
// reaches the api through the same codegen'd client the server
// components use — no bypass, no direct db access. On success the
// list refreshes via router.refresh(), which re-runs the server
// components (the items list refetches through the api-client).

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '../lib/client';

export function CreateItemForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await client.items.create({ name: trimmed });
      setName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
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
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
      {error && (
        <p role="alert" style={{ color: '#f88' }}>
          {error}
        </p>
      )}
    </div>
  );
}
`;
}
