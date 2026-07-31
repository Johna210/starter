// Materializer: packages/contract templates for the Go-monolith
// (shape 3) base.
//
// In the polyglot shapes (3 & 4) packages/contract is the ONLY shared
// package (decision 9). Go is the canonical side (decision 19):
// openapi.yaml is GENERATED from the Go api's structs (via Huma) and
// COMMITTED here; the TS client (src/) is generated from the committed
// file, and the Dart client (clients/dart/) serves the Flutter mobile
// (ticket 17). None of these files are hand-edited — a spec change
// flows Go structs -> task contract:generate -> commit.
//
// The scaffolded project's own tests tripwire the flow:
// apps/api/contract_test.go proves the committed spec equals the live
// spec; test/generated.test.ts proves the committed client equals the
// generator's output.
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into packages/contract. The orchestrator
// (materialize.ts) calls writeGoContract(ctx).

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeGoContract(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'packages/contract/openapi.yaml'), openapiYaml());
  await writeFileRecursive(join(targetDir, 'packages/contract/package.json'), contractPackageJson());
  await writeFileRecursive(join(targetDir, 'packages/contract/tsconfig.json'), contractTsconfigJson());
  await writeFileRecursive(join(targetDir, 'packages/contract/README.md'), contractReadme());
  await writeFileRecursive(join(targetDir, 'packages/contract/scripts/generate-ts-client.mjs'), generateTsClientMjs());
  await writeFileRecursive(join(targetDir, 'packages/contract/src/types.ts'), clientTypesTs());
  await writeFileRecursive(join(targetDir, 'packages/contract/src/client.ts'), clientTs());
  await writeFileRecursive(join(targetDir, 'packages/contract/src/index.ts'), clientIndexTs());
  await writeFileRecursive(join(targetDir, 'packages/contract/test/generated.test.ts'), generatedTestTs());
  await writeFileRecursive(join(targetDir, 'packages/contract/clients/dart/pubspec.yaml'), dartPubspec());
  await writeFileRecursive(join(targetDir, 'packages/contract/clients/dart/lib/openapi_client.dart'), dartClient());
}


function openapiYaml(): string {
  return `components:
    schemas:
        AuthCredentialsInputBody:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/AuthCredentialsInputBody.json
                    format: uri
                    readOnly: true
                    type: string
                email:
                    format: email
                    maxLength: 256
                    type: string
                password:
                    maxLength: 256
                    minLength: 1
                    type: string
            required:
                - email
                - password
            type: object
        AuthRefreshInputBody:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/AuthRefreshInputBody.json
                    format: uri
                    readOnly: true
                    type: string
                refresh:
                    type: string
            type: object
        AuthRegisterInputBody:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/AuthRegisterInputBody.json
                    format: uri
                    readOnly: true
                    type: string
                email:
                    format: email
                    maxLength: 256
                    type: string
                password:
                    maxLength: 256
                    minLength: 8
                    type: string
            required:
                - email
                - password
            type: object
        AuthRegisterOutputBody:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/AuthRegisterOutputBody.json
                    format: uri
                    readOnly: true
                    type: string
                access:
                    type: string
                refresh:
                    type: string
                user:
                    $ref: '#/components/schemas/AuthUser'
            required:
                - access
                - refresh
                - user
            type: object
        AuthTokens:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/AuthTokens.json
                    format: uri
                    readOnly: true
                    type: string
                access:
                    type: string
                refresh:
                    type: string
            required:
                - access
                - refresh
            type: object
        AuthUser:
            additionalProperties: false
            properties:
                email:
                    type: string
                id:
                    type: string
            required:
                - id
                - email
            type: object
        ErrorDetail:
            additionalProperties: false
            properties:
                location:
                    description: Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id'
                    type: string
                message:
                    description: Error message text
                    type: string
                value:
                    description: The value at the given location
            type: object
        ErrorModel:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/ErrorModel.json
                    format: uri
                    readOnly: true
                    type: string
                detail:
                    description: A human-readable explanation specific to this occurrence of the problem.
                    examples:
                        - Property foo is required but is missing.
                    type: string
                errors:
                    description: Optional list of individual error details
                    items:
                        $ref: '#/components/schemas/ErrorDetail'
                    type:
                        - array
                        - "null"
                instance:
                    description: A URI reference that identifies the specific occurrence of the problem.
                    examples:
                        - https://example.com/error-log/abc123
                    format: uri
                    type: string
                status:
                    description: HTTP status code
                    examples:
                        - 400
                    format: int64
                    type: integer
                title:
                    description: A short, human-readable summary of the problem type. This value should not change between occurrences of the error.
                    examples:
                        - Bad Request
                    type: string
                type:
                    default: about:blank
                    description: A URI reference to human-readable documentation for the error.
                    examples:
                        - https://example.com/errors/example
                    format: uri
                    type: string
            type: object
        Item:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/Item.json
                    format: uri
                    readOnly: true
                    type: string
                created_at:
                    format: date-time
                    type: string
                id:
                    type: string
                name:
                    maxLength: 200
                    type: string
            required:
                - id
                - name
                - created_at
            type: object
        ItemCreateInputBody:
            additionalProperties: false
            properties:
                $schema:
                    description: A URL to the JSON Schema for this object.
                    examples:
                        - https://example.com/schemas/ItemCreateInputBody.json
                    format: uri
                    readOnly: true
                    type: string
                name:
                    description: Name of the item
                    maxLength: 200
                    minLength: 1
                    type: string
            required:
                - name
            type: object
    securitySchemes:
        bearerAuth:
            bearerFormat: JWT
            description: A short-lived access token (decision 16), minted by /auth/login or /auth/register.
            scheme: bearer
            type: http
info:
    description: 'The scaffolded Go api: auth shim + items demo (decision 12/13).'
    title: Starter API
    version: 0.1.0
openapi: 3.1.0
paths:
    /auth/login:
        post:
            requestBody:
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/AuthCredentialsInputBody'
                required: true
            responses:
                "200":
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/AuthTokens'
                    description: OK
                    headers:
                        Set-Cookie:
                            schema:
                                type: string
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            summary: Log in and receive a token pair
            tags:
                - auth
    /auth/logout:
        post:
            parameters:
                - in: cookie
                  name: refresh_token
                  schema:
                    type: string
            requestBody:
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/AuthRefreshInputBody'
            responses:
                "204":
                    description: No Content
                    headers:
                        Set-Cookie:
                            schema:
                                type: string
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            summary: Revoke the refresh token and clear the cookie
            tags:
                - auth
    /auth/refresh:
        post:
            parameters:
                - in: cookie
                  name: refresh_token
                  schema:
                    type: string
            requestBody:
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/AuthRefreshInputBody'
            responses:
                "200":
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/AuthTokens'
                    description: OK
                    headers:
                        Set-Cookie:
                            schema:
                                type: string
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            summary: Rotate the refresh token and issue a new pair
            tags:
                - auth
    /auth/register:
        post:
            requestBody:
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/AuthRegisterInputBody'
                required: true
            responses:
                "201":
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/AuthRegisterOutputBody'
                    description: Created
                    headers:
                        Set-Cookie:
                            schema:
                                type: string
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            summary: Register a new user
            tags:
                - auth
    /items:
        get:
            responses:
                "200":
                    content:
                        application/json:
                            schema:
                                items:
                                    $ref: '#/components/schemas/Item'
                                type:
                                    - array
                                    - "null"
                    description: OK
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            security:
                - bearerAuth: []
            summary: List items
            tags:
                - items
        post:
            requestBody:
                content:
                    application/json:
                        schema:
                            $ref: '#/components/schemas/ItemCreateInputBody'
                required: true
            responses:
                "200":
                    content:
                        application/json:
                            schema:
                                $ref: '#/components/schemas/Item'
                    description: OK
                default:
                    content:
                        application/problem+json:
                            schema:
                                $ref: '#/components/schemas/ErrorModel'
                    description: Error
            security:
                - bearerAuth: []
            summary: Create an item
            tags:
                - items
`;
}

function contractPackageJson(): string {
  return `{
  "name": "@starter/contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "description": "The one package of the polyglot shapes (decision 9): the committed openapi.yaml (generated from the Go structs, decision 19) plus generated TS and Dart clients.",
  "scripts": {
    "generate": "node scripts/generate-ts-client.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^24.13.3",
    "typescript": "^5.9.3",
    "vitest": "^4.1.10",
    "yaml": "^2.5.0"
  }
}
`;
}

function contractTsconfigJson(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*", "test/**/*"]
}
`;
}

function contractReadme(): string {
  return `// packages/contract — the contract package (decision 9/19).
//
// In the polyglot shapes (3 & 4) this is the *only* shared package:
// the wire-format boundary every side is generated from. There is no
// packages/db or packages/auth — each backend owns its own.
//
// ## Go is the canonical side (decision 19)
//
// The api's Go structs are the source of truth. \`openapi.yaml\` here is
// **generated from them** (via Huma) at build time and **committed** —
// it is not hand-authored. Clients are downstream:
//
//   - \`src/\` — the generated TS client (\`@starter/contract\`)
//   - \`clients/dart/\` — the generated Dart client (used by the Flutter
//     mobile, ticket 17)
//
// A spec change therefore requires three steps, in order:
//
//  1. change the Go structs in \`apps/api\` (the canonical side)
//  2. \`task contract:generate\` — regenerates \`openapi.yaml\` from Go
//     AND regenerates the TS client from it
//  3. commit everything together (the scaffold's tests tripwire this:
//     \`apps/api/contract_test.go\` proves the committed spec equals the
//     live spec; \`test/generated.test.ts\` proves the committed client
//     equals the generator's output)
//
// ## Regenerating
//
//     task contract:generate
//
// runs \`go run ./cmd/specgen\` (apps/api -> this file) followed by
// \`node scripts/generate-ts-client.mjs\` (this file -> src/). The Dart
// client is generated with the openapi-generator (dart-dio flavor)
// once Flutter lands (ticket 17); its \`lib/\` is kept in sync here.
`;
}

function generateTsClientMjs(): string {
  return `// scripts/generate-ts-client.mjs — regenerates the TS client
// (src/types.ts, src/client.ts, src/index.ts) from the committed
// openapi.yaml (decision 19: Go is the canonical side; clients are
// downstream). Run via \`task contract:generate\` after the spec is
// regenerated from the Go structs.
//
// The generator is intentionally small and dependency-light (only
// \`yaml\` for parsing): the emitted client is a typed fetch wrapper,
// nothing more. Regenerating must produce a byte-identical diff —
// the scaffold's tests assert that (test/generated.test.ts).
//
// Usage: node scripts/generate-ts-client.mjs [spec-path] [out-dir]
//   spec-path defaults to ./openapi.yaml
//   out-dir   defaults to ./src

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(process.argv[2] ?? join(root, 'openapi.yaml'));
const outDir = resolve(process.argv[3] ?? join(root, 'src'));

const spec = YAML.parse(readFileSync(specPath, 'utf8'));

const header = [
  '// GENERATED by scripts/generate-ts-client.mjs — do not edit by hand.',
  '// Regenerate with \`task contract:generate\` after regenerating',
  '// openapi.yaml from the Go structs (decision 19: Go is canonical,',
  '// clients are downstream).',
  '',
].join('\\n');

// ---- types -----------------------------------------------------------------

function tsType(schema, schemas) {
  if (!schema) return 'unknown';
  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }
  const types = Array.isArray(schema.type) ? schema.type.filter((t) => t !== 'null') : [schema.type];
  const t = types[0];
  switch (t) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return \`\${tsType(schema.items, schemas)}[]\`;
    case 'object':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

function generateTypes(schemas) {
  const lines = [header];
  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.type !== 'object' && !(Array.isArray(schema.type) && schema.type.includes('object'))) {
      continue;
    }
    lines.push(\`export interface \${name} {\`);
    for (const [prop, propSchema] of Object.entries(schema.properties ?? {})) {
      // $schema is huma's runtime link to the JSON Schema; it is not
      // part of the domain contract and is omitted from client types.
      if (prop === '$schema') continue;
      const required = (schema.required ?? []).includes(prop);
      lines.push(\`  \${prop}\${required ? '' : '?'}: \${tsType(propSchema, schemas)};\`);
    }
    lines.push('}', '');
  }
  return lines.join('\\n');
}

// ---- client ----------------------------------------------------------------

function schemaType(schema, schemas) {
  if (!schema) return 'void';
  return tsType(schema, schemas);
}

function responseType(op, schemas) {
  const responses = op.responses ?? {};
  const keys = Object.keys(responses).filter((k) => /^2\\d\\d$/.test(k));
  if (keys.length === 0) return 'void';
  const resp = responses[keys[0]];
  const media = resp?.content?.['application/json'];
  return schemaType(media?.schema, schemas);
}

function requestType(op, schemas) {
  const media = op.requestBody?.content?.['application/json'];
  return schemaType(media?.schema, schemas);
}

function isAuthenticated(op) {
  return Array.isArray(op.security) && op.security.length > 0;
}

function operationName(method, path) {
  const [, seg, rest] = path.split('/');
  if (!rest) {
    // The group root: /items (GET list, POST create).
    return method === 'get' ? 'list' : 'create';
  }
  return rest;
}

function generateClient(paths, schemas) {
  const lines = [header];
  const ops = [];
  const usedTypes = new Set();
  for (const [path, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (method !== 'get' && method !== 'post') continue;
      const reqT = requestType(op, schemas);
      const resT = responseType(op, schemas);
      if (reqT !== 'void') usedTypes.add(reqT.replace(/\\[\\]$/g, ''));
      if (resT !== 'void') usedTypes.add(resT.replace(/\\[\\]$/g, ''));
      ops.push({ path, method, op, reqT, resT, auth: isAuthenticated(op) });
    }
  }

  if (usedTypes.size > 0) {
    lines.push(\`import type {\`);
    for (const t of [...usedTypes].sort()) {
      lines.push(\`  \${t},\`);
    }
    lines.push(\`} from './types.js';\`, '');
  }

  lines.push(\`export interface ClientOptions {\`);
  lines.push(\`  /** Base URL of the api, e.g. http://localhost:3000 */\`);
  lines.push(\`  baseUrl: string;\`);
  lines.push(\`  /** Returns the current access token (Bearer), if any. */\`);
  lines.push(\`  getAccessToken?: () => string | null;\`);
  lines.push(\`  /** Called when a request answers 401, e.g. to trigger a refresh. */\`);
  lines.push(\`  onUnauthorized?: () => void;\`);
  lines.push(\`  /** Fetch implementation override (defaults to global fetch). */\`);
  lines.push(\`  fetch?: typeof fetch;\`);
  lines.push(\`}\`, '');

  lines.push(\`/** A typed fetch wrapper over the committed openapi.yaml (decision 19). */\`);
  lines.push(\`export function createClient(options: ClientOptions) {\`);
  lines.push(\`  const { baseUrl } = options;\`);
  lines.push(\`  const doFetch = options.fetch ?? fetch;\`);
  lines.push(\`  async function request<T>(method: string, path: string, body?: unknown, authenticated = false): Promise<T> {\`);
  lines.push(\`    const headers: Record<string, string> = {};\`);
  lines.push(\`    if (body !== undefined) headers['Content-Type'] = 'application/json';\`);
  lines.push(\`    if (authenticated) {\`);
  lines.push(\`      const token = options.getAccessToken?.() ?? null;\`);
  lines.push(\`      if (token) headers['Authorization'] = \\\`Bearer \\\${token}\\\`;\`);
  lines.push(\`    }\`);
  lines.push(\`    const res = await doFetch(\\\`\\\${baseUrl}\\\${path}\\\`, {\`);
  lines.push(\`      method,\`);
  lines.push(\`      headers,\`);
  lines.push(\`      body: body !== undefined ? JSON.stringify(body) : undefined,\`);
  lines.push(\`      credentials: 'include',\`);
  lines.push(\`    });\`);
  lines.push(\`    if (res.status === 401) options.onUnauthorized?.();\`);
  lines.push(\`    if (!res.ok) {\`);
  lines.push(\`      let message = \\\`\\\${method} \\\${path} -> \\\${res.status}\\\`;\`);
  lines.push(\`      try {\`);
  lines.push(\`        const err = (await res.json()) as { detail?: string; title?: string };\`);
  lines.push(\`        message = err.detail ?? err.title ?? message;\`);
  lines.push(\`      } catch {\`);
  lines.push(\`        // non-JSON error body; keep the status message\`);
  lines.push(\`      }\`);
  lines.push(\`      throw new Error(message);\`);
  lines.push(\`    }\`);
  lines.push(\`    if (res.status === 204) return undefined as T;\`);
  lines.push(\`    return (await res.json()) as T;\`);
  lines.push(\`  }\`, '');
  lines.push(\`  return {\`, '');

  // Group operations by the first path segment ('/auth/register' ->
  // auth.register; '/items' -> items.list / items.create).
  const groups = new Map();
  for (const { path, method, reqT, resT, auth } of ops) {
    const [, seg, rest] = path.split('/');
    const group = seg ?? 'root';
    const name = rest ? rest : operationName(method, path);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ name, method, path, reqT, resT, auth });
  }

  for (const [group, entries] of groups) {
    lines.push(\`  \${group}: {\`);
    for (const { name, method, path, reqT, resT, auth } of entries) {
      const lower = method.toLowerCase();
      const args = reqT !== 'void' ? \`input: \${reqT}\` : '';
      const callBody = reqT !== 'void' ? ', input' : '';
      lines.push(\`    /** \${lower.toUpperCase()} \${path}\${auth ? ' (requires Bearer access token)' : ''} */\`);
      lines.push(\`    \${name}: async (\${args}) => request<\${resT}>('\${lower}', '\${path}'\${callBody}, \${auth}),\`);
    }
    lines.push(\`  },\`);
  }
  lines.push('};');
  lines.push('}');
  return lines.join('\\n');
}

function generateIndex(types) {
  const lines = [header];
  lines.push(\`export type {\`);
  for (const t of types) {
    lines.push(\`  \${t},\`);
  }
  lines.push(\`} from './types.js';\`);
  lines.push(\`export { createClient, type ClientOptions } from './client.js';\`);
  return lines.join('\\n');
}

// ---- emit ------------------------------------------------------------------

const schemas = spec.components?.schemas ?? {};
const paths = spec.paths ?? {};

const typesSrc = generateTypes(schemas);
const typeNames = [...typesSrc.matchAll(/^export interface (\\w+)/gm)].map((m) => m[1]);
const clientSrc = generateClient(paths, schemas);
const indexSrc = generateIndex(typeNames);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'types.ts'), typesSrc);
writeFileSync(join(outDir, 'client.ts'), clientSrc);
writeFileSync(join(outDir, 'index.ts'), indexSrc);

console.log(\`generate-ts-client: wrote \${join(outDir, 'types.ts')}, client.ts, index.ts\`);
`;
}

function clientTypesTs(): string {
  return `// GENERATED by scripts/generate-ts-client.mjs — do not edit by hand.
// Regenerate with \`task contract:generate\` after regenerating
// openapi.yaml from the Go structs (decision 19: Go is canonical,
// clients are downstream).

export interface AuthCredentialsInputBody {
  email: string;
  password: string;
}

export interface AuthRefreshInputBody {
  refresh?: string;
}

export interface AuthRegisterInputBody {
  email: string;
  password: string;
}

export interface AuthRegisterOutputBody {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  email: string;
  id: string;
}

export interface ErrorDetail {
  location?: string;
  message?: string;
  value?: unknown;
}

export interface ErrorModel {
  detail?: string;
  errors?: ErrorDetail[];
  instance?: string;
  status?: number;
  title?: string;
  type?: string;
}

export interface Item {
  created_at: string;
  id: string;
  name: string;
}

export interface ItemCreateInputBody {
  name: string;
}
`;
}

function clientTs(): string {
  return `// GENERATED by scripts/generate-ts-client.mjs — do not edit by hand.
// Regenerate with \`task contract:generate\` after regenerating
// openapi.yaml from the Go structs (decision 19: Go is canonical,
// clients are downstream).

import type {
  AuthCredentialsInputBody,
  AuthRefreshInputBody,
  AuthRegisterInputBody,
  AuthRegisterOutputBody,
  AuthTokens,
  Item,
  ItemCreateInputBody,
} from './types.js';

export interface ClientOptions {
  /** Base URL of the api, e.g. http://localhost:3000 */
  baseUrl: string;
  /** Returns the current access token (Bearer), if any. */
  getAccessToken?: () => string | null;
  /** Called when a request answers 401, e.g. to trigger a refresh. */
  onUnauthorized?: () => void;
  /** Fetch implementation override (defaults to global fetch). */
  fetch?: typeof fetch;
}

/** A typed fetch wrapper over the committed openapi.yaml (decision 19). */
export function createClient(options: ClientOptions) {
  const { baseUrl } = options;
  const doFetch = options.fetch ?? fetch;
  async function request<T>(method: string, path: string, body?: unknown, authenticated = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      const token = options.getAccessToken?.() ?? null;
      if (token) headers['Authorization'] = \`Bearer \${token}\`;
    }
    const res = await doFetch(\`\${baseUrl}\${path}\`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    if (res.status === 401) options.onUnauthorized?.();
    if (!res.ok) {
      let message = \`\${method} \${path} -> \${res.status}\`;
      try {
        const err = (await res.json()) as { detail?: string; title?: string };
        message = err.detail ?? err.title ?? message;
      } catch {
        // non-JSON error body; keep the status message
      }
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {

  auth: {
    /** POST /auth/login */
    login: async (input: AuthCredentialsInputBody) => request<AuthTokens>('post', '/auth/login', input, false),
    /** POST /auth/logout */
    logout: async (input: AuthRefreshInputBody) => request<void>('post', '/auth/logout', input, false),
    /** POST /auth/refresh */
    refresh: async (input: AuthRefreshInputBody) => request<AuthTokens>('post', '/auth/refresh', input, false),
    /** POST /auth/register */
    register: async (input: AuthRegisterInputBody) => request<AuthRegisterOutputBody>('post', '/auth/register', input, false),
  },
  items: {
    /** GET /items (requires Bearer access token) */
    list: async () => request<Item[]>('get', '/items', true),
    /** POST /items (requires Bearer access token) */
    create: async (input: ItemCreateInputBody) => request<Item>('post', '/items', input, true),
  },
};
}`;
}

function clientIndexTs(): string {
  return `// GENERATED by scripts/generate-ts-client.mjs — do not edit by hand.
// Regenerate with \`task contract:generate\` after regenerating
// openapi.yaml from the Go structs (decision 19: Go is canonical,
// clients are downstream).

export type {
  AuthCredentialsInputBody,
  AuthRefreshInputBody,
  AuthRegisterInputBody,
  AuthRegisterOutputBody,
  AuthTokens,
  AuthUser,
  ErrorDetail,
  ErrorModel,
  Item,
  ItemCreateInputBody,
} from './types.js';
export { createClient, type ClientOptions } from './client.js';`;
}

function generatedTestTs(): string {
  return `// test/generated.test.ts — proves the Go-as-canonical rule holds in
// the scaffolded project (decision 19): the committed TS client is
// byte-identical to what the committed generator produces from the
// committed openapi.yaml. If the spec changes, \`task contract:generate\`
// must be run and its output committed — this test is the tripwire.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contractDir = resolve(import.meta.dirname, '..');
const specPath = join(contractDir, 'openapi.yaml');
const generator = join(contractDir, 'scripts/generate-ts-client.mjs');
const committed = {
  'types.ts': join(contractDir, 'src/types.ts'),
  'client.ts': join(contractDir, 'src/client.ts'),
  'index.ts': join(contractDir, 'src/index.ts'),
};

describe('generated TS client is committed and up to date (decision 19)', () => {
  it('regenerating from the committed openapi.yaml changes nothing', () => {
    const out = mkdtempSync(join(tmpdir(), 'contract-regen-'));
    try {
      execFileSync(process.execPath, [generator, specPath, out], { stdio: 'pipe' });
      for (const [name, committedPath] of Object.entries(committed)) {
        expect(readFileSync(join(out, name), 'utf8'), \`\${name} is stale — run \\\`task contract:generate\\\` and commit the diff\`)
          .toBe(readFileSync(committedPath, 'utf8'));
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('the client covers every route of the committed spec', () => {
    const client = readFileSync(committed['client.ts'], 'utf8');
    for (const ep of ['/items', '/auth/register', '/auth/login', '/auth/refresh', '/auth/logout']) {
      expect(client, \`client.ts should expose \${ep}\`).toContain(\`'\${ep}'\`);
    }
    // The items routes are authenticated (Bearer) per the spec's
    // security requirement.
    expect(client).toMatch(/GET \\/items \\(requires Bearer access token\\)/);
  });
});
`;
}

function dartPubspec(): string {
  return `name: starter_contract
description: >-
  Generated Dart client over the committed openapi.yaml (decision 19:
  Go is canonical, clients are downstream). Used by the Flutter mobile
  (ticket 17).
version: 0.1.0
publish_to: none

environment:
  sdk: ^3.4.0

dependencies:
  http: ^1.2.0
`;
}

function dartClient(): string {
  return `// Dart client over the committed openapi.yaml (decision 19: Go is
// canonical, clients are downstream). Hand-shaped now for the Flutter
// mobile (ticket 17); the openapi-generator (dart-dio flavor)
// regeneration pipeline lands with that ticket — see ../README.md.
// Keep in sync with the committed spec.

library;

import 'dart:convert';

import 'package:http/http.dart' as http;

/// A row of the items table (decision 13).
class Item {
  const Item({required this.id, required this.name, required this.createdAt});

  final String id;
  final String name;
  final String createdAt;

  factory Item.fromJson(Map<String, dynamic> json) => Item(
        id: json['id'] as String,
        name: json['name'] as String,
        createdAt: json['created_at'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'created_at': createdAt,
      };
}

/// The token pair issued on login / refresh (decision 16).
class AuthTokens {
  const AuthTokens({required this.access, required this.refresh});

  final String access;
  final String refresh;

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        access: json['access'] as String,
        refresh: json['refresh'] as String,
      );
}

/// The public user shape returned by register.
class AuthUser {
  const AuthUser({required this.id, required this.email});

  final String id;
  final String email;

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      AuthUser(id: json['id'] as String, email: json['email'] as String);
}

/// The register response: token pair + created user.
class AuthRegisterResult {
  const AuthRegisterResult({
    required this.tokens,
    required this.user,
  });

  final AuthTokens tokens;
  final AuthUser user;

  factory AuthRegisterResult.fromJson(Map<String, dynamic> json) =>
      AuthRegisterResult(
        tokens: AuthTokens(
          access: json['access'] as String,
          refresh: json['refresh'] as String,
        ),
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      );
}

/// A typed client over the committed openapi.yaml. The refresh token
/// travels in the httpOnly cookie (decision 16); the access token is
/// passed explicitly to the protected /items calls.
class OpenApiClient {
  OpenApiClient({
    required this.baseUrl,
    this.accessToken,
  });

  final String baseUrl;
  String? accessToken;

  Map<String, String> _headers({bool authenticated = false}) => {
        'Content-Type': 'application/json',
        if (authenticated && accessToken != null)
          'Authorization': 'Bearer $accessToken',
      };

  Future<Map<String, dynamic>> _send(
    String method,
    String path,
    Map<String, dynamic>? body, {
    bool authenticated = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = http.Request(method, uri)..headers.addAll(_headers(authenticated: authenticated));
    if (body != null) request.body = jsonEncode(body);
    final response = await http.Client().send(request);
    final text = await response.stream.bytesToString();
    final json = text.isEmpty ? <String, dynamic>{} : jsonDecode(text) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw OpenApiException(response.statusCode, json['detail'] as String? ?? 'request failed');
    }
    return json;
  }

  Future<AuthTokens> login(String email, String password) async {
    final json = await _send('POST', '/auth/login', {'email': email, 'password': password});
    return AuthTokens.fromJson(json);
  }

  Future<AuthRegisterResult> register(String email, String password) async {
    final json = await _send('POST', '/auth/register', {'email': email, 'password': password});
    return AuthRegisterResult.fromJson(json);
  }

  Future<AuthTokens> refresh([String? refreshToken]) async {
    final json = await _send('POST', '/auth/refresh', refreshToken == null ? null : {'refresh': refreshToken});
    return AuthTokens.fromJson(json);
  }

  Future<void> logout([String? refreshToken]) async {
    await _send('POST', '/auth/logout', refreshToken == null ? null : {'refresh': refreshToken});
  }

  Future<List<Item>> listItems() async {
    final json = await _send('GET', '/items', null, authenticated: true);
    return (json as List).map((e) => Item.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Item> createItem(String name) async {
    final json = await _send('POST', '/items', {'name': name}, authenticated: true);
    return Item.fromJson(json);
  }
}

/// Thrown for non-2xx responses.
class OpenApiException implements Exception {
  OpenApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'OpenApiException($statusCode): $message';
}
`;
}

export { openapiYaml, contractPackageJson, contractTsconfigJson, contractReadme, generateTsClientMjs, clientTypesTs, clientTs, clientIndexTs, generatedTestTs, dartPubspec, dartClient };
