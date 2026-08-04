# create-fs-starter

Scaffold a new fullstack project from the [Starter](../../). The CLI
composes five prompt axes (backend language, topology, web variant,
mobile, AI) and writes a runnable monorepo.

> **Status (`0.1.0`):** eight compositions are materializable:
>
> - **TS-monolith + Vite+TanStack + no mobile + no AI** (shape 1)
> - **TS-monolith + Vite+TanStack + Expo + no AI** (shape 1 + mobile)
> - **TS-monolith + Vite+TanStack + no mobile + AI** (shape 1 + AI;
>   generatable but not in the blessed matrix)
> - **TS-microservices + Vite+TanStack + no mobile + no AI** (shape 2)
> - **TS-microservices + Vite+TanStack + Expo + no AI** (shape 2 + mobile)
> - **Go-monolith + Next.js + no mobile + no AI** (shape 3)
> - **Go-microservices + Next.js + no mobile + no AI** (shape 4: example
>   split — apps/api-auth as the sole minter, JWKS-verified apps/api)
> - **Go-microservices + Next.js + no mobile + AI** (shape 4 + AI;
>   generatable but not in the blessed matrix)
>
> All other combinations produce a friendly error. See [Issue
> tracker](https://github.com/Johna210/starter/issues) for the roadmap.

## Usage

```sh
npx create-fs-starter my-app
# ... answer 5 prompts ...
cd my-app
pnpm install
task dev
```

The web app boots on http://localhost:5173 and the api on
http://localhost:3000.

### Options

```sh
npx create-fs-starter my-app --yes      # overwrite existing directory
npx create-fs-starter my-app --dry-run  # don't write any files
npx create-fs-starter --help           # full help
```

## The five prompt axes

| # | Axis            | Options                              |
|---|-----------------|--------------------------------------|
| 1 | Backend         | `ts` (TypeScript) / `go` (Go)        |
| 2 | Topology        | `monolith` / `microservices`         |
| 3 | Web variant     | `vite` (TanStack) / `next` / `tanstack-start` |
| 4 | Mobile          | `none` / `expo` / `flutter`          |
| 5 | AI              | `off` / `on`                         |

## What gets scaffolded

For a supported TypeScript composition (the mobile folder is present when
Expo is selected):

```
my-app/
├── package.json          # root manifest, name = <your-app>
├── pnpm-workspace.yaml   # apps/* + packages/*
├── Taskfile.yml          # dev/test/build orchestrator
├── .gitignore
├── README.md
├── apps/
│   ├── web/              # Vite + React + TanStack Router + Query shell
│   ├── api/              # Hono on @hono/node-server, GET /health
│   └── mobile/           # Expo + secure storage (when mobile=expo)
└── packages/
    └── shared/           # zod schemas + utils (empty for now)
```

Subsequent issues in the [Starter roadmap](https://github.com/Johna210/starter/issues)
fill in the `items` demo, auth, DB, etc.

## Development

This CLI lives in the [Starter monorepo](https://github.com/Johna210/starter).
From the repo root:

```sh
# Run the CLI in watch mode
task cli:dev

# Run the CLI's tests
task cli:test

# Build the CLI (tsc -> dist/)
task cli:build

# Run everything (contract test + CLI tests)
task test
```

Or from `packages/cli/`:

```sh
pnpm dev      # tsx src/index.ts
pnpm test     # vitest run
pnpm build    # tsc -p tsconfig.build.json
pnpm typecheck
```

## Architecture

| Module                     | Role                                                      |
|----------------------------|-----------------------------------------------------------|
| `src/composition.ts`       | The five-axis types + `isImplemented()` + `describeComposition()`. Single source of truth for "what's allowed." |
| `src/prompts.ts`           | Default answers + the `PromptAnswers` type.               |
| `src/materialize.ts`       | The hand-rolled materializer — writes the scaffolded project. Throws `UnimplementedCompositionError` for unsupported compositions. |
| `src/cli.ts`               | `runCli(argv, options)` — the testable core: parses args, prompts, calls materializer, returns a `CliResult`. |
| `src/index.ts`             | Thin entry point: `runCli(process.argv.slice(2))` + `process.exit` translation. |

Per decision 25b, templates are TS string constants — type-checked at
build time, not embedded as bytes.

## License

MIT
