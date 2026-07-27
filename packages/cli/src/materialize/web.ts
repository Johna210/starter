// Materializer: apps/web templates (Vite + React + TanStack Router/Query).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 10 files written into apps/web (package.json, tsconfig, vite
// config, index.html, .env.example, src/main.tsx, src/app.css,
// src/router.tsx, src/pages/index.tsx, src/lib/api.ts, src/config.ts).
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
  await writeFileRecursive(join(targetDir, 'apps/web/src/pages/index.tsx'), webIndexPage());
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

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
    <title>Scaffolded app</title>
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
import './app.css';

const queryClient = new QueryClient();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
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
  return `export function IndexPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Starter — TS-monolith</h1>
      <p>Web shell is up. api-client is wired in via <code>src/lib/api.ts</code>.</p>
    </main>
  );
}
`;
}

function webRouter(): string {
  return `import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { IndexPage } from './pages/index';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
`;
}

function webLibApi(): string {
  return `// @starter/web — typed entry point to the api.
//
// Builds the apiClient (Hono RPC, decision 17/18) from the runtime-resolved
// base URL in ./config and gives the rest of the app a single canonical
// import: \`import { apiClient } from '@/lib/api'\`. Pages call
// \`apiClient.items.\$get()\` / \`\$post(...)\` and get end-to-end type
// inference against apps/api/src/index.ts's Hono router. Auth integration
// (issue 06) wraps this client to add transparent refresh-on-401
// (decision 16).

import { createApiClient } from '@starter/api-client';
import { config } from '../config';

export const apiClient = createApiClient(config.apiUrl);
`;
}

function webConfigTs(): string {
  return `// @starter/web — typed config (decision 28).
//
// Reads VITE_API_URL (the api base URL) from Vite's import.meta.env and
// validates it through a zod schema. The web app never reads
// import.meta.env directly — everything goes through \`config\` so the
// surface is one typed object, fail-fast on missing/invalid at boot.
// Copy apps/web/.env.example to apps/web/.env for local dev.

import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .url('VITE_API_URL must be a valid URL')
    .default('http://localhost:3000'),
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
  return `# @starter/web — local dev env (git-ignored; copy to .env).
#
# Decision 28: dev loads vars via .env + Vite, prod uses the deploy
# platform's real env vars (Vercel/Cloudflare/Fly inject them). Vite
# picks up vars prefixed with VITE_ and exposes them on import.meta.env.
# Code never reads import.meta.env directly — go through src/config.ts.

# Base URL of the api (apps/api). Vite proxies /api to this in dev if
# you wire it up in vite.config.ts; today the web calls the api
# directly so the full URL is needed.
VITE_API_URL=http://localhost:3000
`;
}
