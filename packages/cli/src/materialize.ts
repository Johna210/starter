// Materializer: writes the scaffolded project for a given composition.
//
// Per issue #3, only the TS-monolith + Vite+TanStack + no-mobile + no-AI
// composition is materializable. All other compositions throw an
// UnimplementedCompositionError; the CLI's own tests assert both paths.
//
// Templates are kept as TS string constants (decision 25b: TS templates
// can be imported as values / type-checked, not embedded as bytes).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { type Composition, describeComposition, isImplemented } from './composition.js';

export interface ProjectContext {
  /** Absolute path to the (empty) target directory the scaffold is written into. */
  targetDir: string;
  /** npm package name for the scaffolded project. */
  name: string;
}

export class UnimplementedCompositionError extends Error {
  public readonly composition: Composition;
  constructor(composition: Composition) {
    super(`Composition not yet implemented: ${describeComposition(composition)}.\n` +
      `The CLI materializer ships one composition in this ticket; the other 23+ are ` +
      `scheduled for later issues. Please choose another combination.`);
    this.name = 'UnimplementedCompositionError';
    this.composition = composition;
  }
}

/** Public API. Throws UnimplementedCompositionError if composition is not yet wired. */
export async function materialize(ctx: ProjectContext, composition: Composition): Promise<void> {
  if (!isImplemented(composition)) {
    throw new UnimplementedCompositionError(composition);
  }
  // Today only one composition is implementable; future issues add more.
  await writeTsMonolithVite(ctx);
}

// ---------- helpers --------------------------------------------------------

async function writeFileRecursive(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

// ---------- composition writers -------------------------------------------

/** TS-monolith + Vite+TanStack web + no mobile + no AI. */
async function writeTsMonolithVite(ctx: ProjectContext): Promise<void> {
  const { targetDir, name } = ctx;

  // Root files
  await writeFileRecursive(join(targetDir, 'package.json'), rootPackageJson(name));
  await writeFileRecursive(join(targetDir, 'pnpm-workspace.yaml'), rootPnpmWorkspaceYaml());
  await writeFileRecursive(join(targetDir, 'Taskfile.yml'), rootTaskfileYml());
  await writeFileRecursive(join(targetDir, '.gitignore'), rootGitignore());
  await writeFileRecursive(join(targetDir, 'README.md'), rootReadme(name));

  // apps/web — Vite + React + TanStack Router shell (no content yet)
  await writeFileRecursive(join(targetDir, 'apps/web/package.json'), webPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/web/tsconfig.json'), webTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/web/vite.config.ts'), webViteConfig());
  await writeFileRecursive(join(targetDir, 'apps/web/index.html'), webIndexHtml());
  await writeFileRecursive(join(targetDir, 'apps/web/src/main.tsx'), webMainTsx());
  await writeFileRecursive(join(targetDir, 'apps/web/src/app.css'), webAppCss());
  await writeFileRecursive(join(targetDir, 'apps/web/src/routes/__root.tsx'), webRootRoute());
  await writeFileRecursive(join(targetDir, 'apps/web/src/routes/index.tsx'), webIndexRoute());
  await writeFileRecursive(join(targetDir, 'apps/web/src/router.ts'), webRouter());

  // apps/api — Hono shell (no routes yet beyond /health)
  await writeFileRecursive(join(targetDir, 'apps/api/package.json'), apiPackageJson());
  await writeFileRecursive(join(targetDir, 'apps/api/tsconfig.json'), apiTsconfigJson());
  await writeFileRecursive(join(targetDir, 'apps/api/src/index.ts'), apiIndexTs());

  // packages/shared — zod schemas + utils placeholder (empty for now)
  await writeFileRecursive(join(targetDir, 'packages/shared/package.json'), sharedPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/tsconfig.json'), sharedTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/shared/src/index.ts'), sharedIndexTs());
}

// ---------- root templates -------------------------------------------------

function rootPackageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: 'Scaffolded from create-fs-starter (TS-monolith + Vite+TanStack).',
      engines: { node: '>=20.0.0' },
      packageManager: 'pnpm@10.17.1',
      scripts: {
        dev: 'task dev',
        test: 'task test',
        build: 'task build',
      },
    },
    null,
    2,
  ) + '\n';
}

function rootPnpmWorkspaceYaml(): string {
  return `packages:
  - "apps/*"
  - "packages/*"
`;
}

function rootTaskfileYml(): string {
  return `# Taskfile.yml — scaffolded orchestrator.
#
# Boot the stack with \`task dev\`. Each subtask delegates to a
# workspace's \`pnpm\` script. Per-workspace detail lives in that
# workspace's own package.json.

version: "3"

tasks:
  default:
    desc: List available tasks
    cmds:
      - task --list
    silent: true

  dev:
    desc: Boot the full stack (web + api) in parallel
    cmds:
      - task: dev:web
      - task: dev:api

  dev:web:
    dir: apps/web
    cmds:
      - pnpm dev

  dev:api:
    dir: apps/api
    cmds:
      - pnpm dev

  test:
    desc: Run all tests
    cmds:
      - task: test:web
      - task: test:api
      - task: test:shared

  test:web:
    dir: apps/web
    cmds:
      - pnpm test

  test:api:
    dir: apps/api
    cmds:
      - pnpm test

  test:shared:
    dir: packages/shared
    cmds:
      - pnpm test

  build:
    desc: Build all workspaces
    cmds:
      - task: build:web
      - task: build:api
      - task: build:shared

  build:web:
    dir: apps/web
    cmds:
      - pnpm build

  build:api:
    dir: apps/api
    cmds:
      - pnpm build

  build:shared:
    dir: packages/shared
    cmds:
      - pnpm build
`;
}

function rootGitignore(): string {
  return `node_modules/
dist/
build/
coverage/
.env
.env.local
*.tsbuildinfo
.DS_Store
`;
}

function rootReadme(name: string): string {
  return `# ${name}

A fullstack TypeScript monorepo scaffolded from
[create-fs-starter](https://github.com/Johna210/starter).

## What's in here

- \`apps/web\` — Vite + React + TanStack Router + TanStack Query (client only)
- \`apps/api\` — Hono on Node, no routes beyond a \`/health\` probe (yet)
- \`packages/shared\` — shared TS package (zod schemas + utils, empty for now)

## Quickstart

\`\`\`sh
# Install Taskfile (go-task) if you don't have it:
#   go install github.com/go-task/task/v3/cmd/task@latest
# or see https://taskfile.dev/installation/

pnpm install
task dev
\`\`\`

The web app boots on http://localhost:5173 and the api on
http://localhost:3000.

## Tasks

| Task | What it does |
|------|--------------|
| \`task dev\` | Boot web + api in parallel |
| \`task test\` | Run all workspace tests |
| \`task build\` | Build all workspaces |
`;
}

// ---------- apps/web templates --------------------------------------------

function webPackageJson(): string {
  return JSON.stringify(
    {
      name: '@scaffold/web',
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
        '@scaffold/shared': 'workspace:*',
        '@tanstack/react-query': '^5.59.0',
        '@tanstack/react-router': '^1.79.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
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
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
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

function webRootRoute(): string {
  return `import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
`;
}

function webIndexRoute(): string {
  return `import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Scaffolded app</h1>
      <p>Hello from create-fs-starter. This page is intentionally empty.</p>
    </main>
  );
}
`;
}

function webRouter(): string {
  return `import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
`;
}

// ---------- apps/api templates --------------------------------------------

function apiPackageJson(): string {
  return JSON.stringify(
    {
      name: '@scaffold/api',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc -p tsconfig.build.json',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@hono/node-server': '^1.13.0',
        '@scaffold/shared': 'workspace:*',
        hono: '^4.6.0',
      },
      devDependencies: {
        '@types/node': '^24.13.3',
        tsx: '^4.23.1',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function apiTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
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

function apiIndexTs(): string {
  return `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(\`api listening on http://localhost:\${info.port}\`);
});
`;
}

// ---------- packages/shared templates -------------------------------------

function sharedPackageJson(): string {
  return JSON.stringify(
    {
      name: '@scaffold/shared',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        build: 'tsc -p tsconfig.build.json',
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        zod: '^3.23.0',
      },
      devDependencies: {
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function sharedTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
        declaration: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function sharedIndexTs(): string {
  return `// @scaffold/shared — zod schemas + pure utils shared by apps.
// This package is empty for now; later tickets add the first zod
// schemas (likely the \`items\` demo, decision 13).

export {};
`;
}
