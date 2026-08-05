// Materializer: packages/db templates (Drizzle client + schema + migrations).
//
// Per issue #27 the materializer is split by workspace; this module owns
// the 12 files written into packages/db (package.json, tsconfig, .env
// example, drizzle.config.ts, src/index.ts, src/config.ts, src/client.ts,
// src/schema/{items,users,refresh-tokens}.ts, migrations/{0000,0001,0002}.sql).
// The orchestrator (materialize.ts) calls writeDb(ctx); template functions
// are private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export interface WriteDbOptions {
  /**
   * When true (AI-on compositions, issue #17), packages/db also ships
   * the embeddings schema + the 0003_embeddings pgvector migration —
   * the default VectorStore's table (decision 14 reuse). Off shapes
   * carry zero AI surface (decision 21).
   */
  aiOn?: boolean;
}

export async function writeDb(ctx: ProjectContext, opts: WriteDbOptions = {}): Promise<void> {
  const { targetDir } = ctx;
  const { aiOn = false } = opts;

  await writeFileRecursive(join(targetDir, 'packages/db/package.json'), dbPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/db/tsconfig.json'), dbTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/db/.env.example'), dbEnvExample());
  await writeFileRecursive(join(targetDir, 'packages/db/drizzle.config.ts'), dbDrizzleConfig());
  await writeFileRecursive(join(targetDir, 'packages/db/src/index.ts'), dbIndexTs(aiOn));
  await writeFileRecursive(join(targetDir, 'packages/db/src/config.ts'), dbConfigTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/client.ts'), dbClientTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/schema/items.ts'), dbSchemaItemsTs());
  await writeFileRecursive(join(targetDir, 'packages/db/src/schema/users.ts'), dbSchemaUsersTs());
  await writeFileRecursive(
    join(targetDir, 'packages/db/src/schema/refresh-tokens.ts'),
    dbSchemaRefreshTokensTs(),
  );
  await writeFileRecursive(join(targetDir, 'packages/db/migrations/0000_items.sql'), dbMigration0000());
  await writeFileRecursive(join(targetDir, 'packages/db/migrations/0001_users.sql'), dbMigration0001());
  await writeFileRecursive(
    join(targetDir, 'packages/db/migrations/0002_refresh_tokens.sql'),
    dbMigration0002(),
  );
  if (aiOn) {
    await writeFileRecursive(
      join(targetDir, 'packages/db/src/schema/embeddings.ts'),
      dbSchemaEmbeddingsTs(),
    );
    await writeFileRecursive(
      join(targetDir, 'packages/db/migrations/0003_embeddings.sql'),
      dbMigration0003(),
    );
  }
  // Drizzle's CLI migrator (`drizzle-kit migrate`, which the root
  // Taskfile's `task migrate` invokes) requires meta/_journal.json
  // listing the migrations in order. The hand-authored SQL files
  // here are not drizzle-kit-generated, so we ship the journal
  // alongside them so `task migrate` works on a fresh scaffold
  // (issue 09 surfaced this when the E2E couldn't bootstrap its DB).
  await writeFileRecursive(
    join(targetDir, 'packages/db/migrations/meta/_journal.json'),
    dbMigrationJournal(aiOn),
  );
}

function dbPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/db',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        generate: 'drizzle-kit generate',
        migrate: 'drizzle-kit migrate',
        studio: 'drizzle-kit studio',
        // The db package ships no unit tests (decision 14's repo layer
        // is tested in apps/api against a real DB; the schema itself is
        // verified by `task migrate` + the repo tests) — an empty suite
        // must not fail `task test` (the same tolerance CI applies).
        test: 'vitest run --passWithNoTests',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        'drizzle-orm': '^0.36.0',
        pg: '^8.13.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/pg': '^8.11.10',
        'drizzle-kit': '^0.28.0',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function dbTsconfigJson(): string {
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
      include: ['src/**/*', 'drizzle.config.ts'],
    },
    null,
    2,
  ) + '\n';
}

function dbEnvExample(): string {
  return `# Postgres connection string used by drizzle-kit and the runtime client.
# Local dev: spin up Postgres any way you like (docker, native, etc.) and
# point this at it. The shape of the URL is postgres://USER:PASS@HOST:PORT/DB
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
`;
}

function dbDrizzleConfig(): string {
  return `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/*',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
`;
}

function dbIndexTs(aiOn: boolean): string {
  const shared = `// @starter/db — Drizzle client + schema barrel.
//
// The Drizzle TS schema is the single source of truth (decision 14):
//   drizzle-kit generate -> emits a versioned SQL migration into ./migrations/
//   drizzle-kit migrate  -> applies pending migrations
//
// The runtime client (\`getDb\`) is created lazily so that consumers that
// only need the schema type (e.g. api-client's type-only imports) don't
// open a Postgres connection at module-load time. Tests build their own
// client via \`getDb({ connectionString })\` against a test DB.
//
// The eager \`config\` export from ./config.js is intentionally NOT
// re-exported here: loading the barrel must not force-parse process.env
// (e.g. when a test file imports this package before the env is wired).
// Consuming workspaces call \`readDatabaseConfig()\` themselves at the
// point they need the config (decision 28: each workspace owns its env).

export { databaseUrlSchema, readDatabaseConfig } from './config.js';
export { getDb, getPool, __resetForTests, type DbClient, type GetDbOptions, type GetPoolOptions } from './client.js';
export { itemsTable, type Item, type NewItem } from './schema/items.js';
export { usersTable, type User, type NewUser } from './schema/users.js';
export { refreshTokensTable, type RefreshTokenRow, type NewRefreshTokenRow } from './schema/refresh-tokens.js';
`;
  // AI-on compositions (issue #17) also ship the embeddings schema —
  // the pgvector table the PgVectorStore default upserts into.
  const embeddingsExport = `export { embeddingsTable, type EmbeddingRow, type NewEmbeddingRow } from './schema/embeddings.js';
`;
  return aiOn ? shared + embeddingsExport : shared;
}

function dbConfigTs(): string {
  return `// @starter/db — zod-validated config (decision 28).
//
// Exports a zod schema for DATABASE_URL that other workspaces (apps/api)
// compose into their own config. The actual parsing of \`process.env\`
// happens in each consuming workspace, not here, so a workspace that only
// uses the schema at type-level doesn't force-load process.env.
//
// Nothing is evaluated eagerly — importing this module must not throw on
// a missing DATABASE_URL. CLI tools (drizzle-kit) compose the schema with
// their own env-loading; consuming workspaces call \`readDatabaseConfig\`
// at the point they need the config.

import { z } from 'zod';

export const databaseUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .url('DATABASE_URL must be a valid URL');

/**
 * Read the db config from a given env source. Defaults to process.env.
 * Each consuming workspace calls this with its loaded env (e.g. via dotenv)
 * to get a fully-typed config object.
 */
export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): { databaseUrl: string } {
  return {
    databaseUrl: databaseUrlSchema.parse(env.DATABASE_URL),
  };
}
`;
}

function dbClientTs(): string {
  return `// @starter/db — Drizzle client + pg pool.
//
// Lazy-initialized: the pool is only created on first call. This keeps
// the import cheap (e.g. for the api-client's type-only imports) and
// avoids opening a connection at module load time.
//
// Tests build their own client by passing a different connectionString
// to \`getDb({ connectionString })\`. Production callers (apps/api) pass
// the connectionString from their own env-loaded config.

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { itemsTable } from './schema/items.js';

export type DbClient = NodePgDatabase<{ items: typeof itemsTable }>;

let _pool: Pool | undefined;
let _db: DbClient | undefined;

export interface GetPoolOptions {
  connectionString: string;
}

export function getPool(opts: GetPoolOptions): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: opts.connectionString });
  }
  return _pool;
}

export interface GetDbOptions {
  connectionString: string;
}

export function getDb(opts: GetDbOptions): DbClient {
  if (!_db) {
    _db = drizzle(getPool(opts), { schema: { items: itemsTable } });
  }
  return _db;
}

/**
 * Reset cached clients. Test-only — allows tests to swap the underlying
 * connection between cases without leaking across test files.
 */
export function __resetForTests(): void {
  _pool = undefined;
  _db = undefined;
}
`;
}

function dbSchemaItemsTs(): string {
  return `// @starter/db — items demo schema (decision 13).
//
// The single trivial domain the scaffold ships to prove the data layer
// composes end-to-end. Delete this and the \`items\` route when you start
// your real domain — it's a 5-minute job, not a refactor.

import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const itemsTable = pgTable('items', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 256 }).notNull(),
  // Explicit snake_case column name: matches the migration SQL and
  // keeps the TS field name ergonomic for callers (without the
  // explicit name Drizzle defaults to the TS field name and the
  // runtime SQL would reference "createdAt", which the table
  // doesn't have).
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;
`;
}

function dbMigration0000(): string {
  return `CREATE TABLE IF NOT EXISTS "items" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "name" varchar(256) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;
}

function dbSchemaUsersTs(): string {
  return `// @starter/db — users schema (auth shim, decision 12).
//
// One row per registered user. The password hash is an argon2id PHC
// string produced by \`@starter/auth.hashPassword\`; this schema holds
// the hash, the auth shim owns the hashing/verification.

import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: text().notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
`;
}

function dbSchemaRefreshTokensTs(): string {
  return `// @starter/db — refresh tokens schema (auth shim, decision 12).
//
// Each issued refresh token has a record here, identified by its \`jti\`.
// The auth shim's rotation algorithm (issue / rotate / revoke) reads
// and writes these rows. Storing refresh tokens DB-side (rather than
// just trusting the JWT contents) is what makes revocation real:
// revoking a token means flipping \`revoked_at\` on its row.

import { integer, pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { usersTable } from './users.js';

export const refreshTokensTable = pgTable(
  'refresh_tokens',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    jti: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    jtiIdx: uniqueIndex('refresh_tokens_jti_idx').on(t.jti),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
  }),
);

export type RefreshTokenRow = typeof refreshTokensTable.$inferSelect;
export type NewRefreshTokenRow = typeof refreshTokensTable.$inferInsert;
`;
}

function dbMigration0001(): string {
  return `CREATE TABLE IF NOT EXISTS "users" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
`;
}

function dbMigration0002(): string {
  return `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
  "user_id" integer NOT NULL,
  "jti" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_jti_idx" ON "refresh_tokens" ("jti");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "refresh_tokens" ("user_id");
DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;
}

function dbSchemaEmbeddingsTs(): string {
  return `// @starter/db — embeddings schema (AI primitives, decision 20/14).
//
// The default VectorStore's table: the PgVectorStore in packages/ai
// upserts into and searches this table. The vector column has a fixed
// dimension (1536 — the default embeddings model text-embedding-3-small's
// output size); switching to a model with a different dimension means a
// new column/migration (a documented seam, not something the store hides).
//
// Requires the pgvector extension (\`CREATE EXTENSION vector\`) — the
// 0003_embeddings migration creates it if the Postgres instance has
// pgvector installed (see packages/ai/.env.example / the README).

import { jsonb, pgTable, text, timestamp, vector } from 'drizzle-orm/pg-core';

export const embeddingsTable = pgTable('embeddings', {
  id: text().primaryKey(),
  vector: vector({ dimensions: 1536 }).notNull(),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmbeddingRow = typeof embeddingsTable.$inferSelect;
export type NewEmbeddingRow = typeof embeddingsTable.$inferInsert;
`;

}

function dbMigration0003(): string {
  return `CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "embeddings" (
  "id" text PRIMARY KEY NOT NULL,
  "vector" vector(1536) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Cosine-similarity index (matches PgVectorStore's \`1 - (a <=> b)\` search).
CREATE INDEX IF NOT EXISTS "embeddings_vector_idx" ON "embeddings" USING hnsw ("vector" vector_cosine_ops);
`;
}

/**
 * Drizzle's CLI migrator requires `meta/_journal.json` listing the
 * migrations in order (drizzle-orm/migrator.js: readMigrationFiles).
 * The hand-authored SQL files in this scaffold aren't drizzle-kit-
 * generated, so we ship the journal alongside them. Schema version
 * ("7") and dialect ("postgresql") match what drizzle-kit writes
 * for the current versions of drizzle-orm / drizzle-kit; bump
 * together if the scaffolded version is ever upgraded.
 */
function dbMigrationJournal(aiOn: boolean): string {
  const entries = [
    { idx: 0, version: '7', when: 1730000000000, tag: '0000_items', breakpoints: true },
    { idx: 1, version: '7', when: 1730000001000, tag: '0001_users', breakpoints: true },
    { idx: 2, version: '7', when: 1730000002000, tag: '0002_refresh_tokens', breakpoints: true },
  ];
  if (aiOn) {
    entries.push({ idx: 3, version: '7', when: 1730000003000, tag: '0003_embeddings', breakpoints: true });
  }
  return JSON.stringify(
    {
      version: '7',
      dialect: 'postgresql',
      entries,
    },
    null,
    2,
  ) + '\n';
}
