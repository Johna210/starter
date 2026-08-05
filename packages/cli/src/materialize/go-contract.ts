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
  await writeFileRecursive(join(targetDir, 'packages/contract/scripts/generate-dart-client.mjs'), generateDartClientMjs());
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
    "generate": "node scripts/generate-ts-client.mjs && node scripts/generate-dart-client.mjs",
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
//     AND regenerates both clients (TS + Dart) from it
//  3. commit everything together (the scaffold's tests tripwire this:
//     \`apps/api/contract_test.go\` proves the committed spec equals the
//     live spec; \`test/generated.test.ts\` proves the committed clients
//     equal the generators' outputs)
//
// ## Regenerating
//
//     task contract:generate
//
// runs \`go run ./cmd/specgen\` (apps/api -> this file) followed by
// \`node scripts/generate-ts-client.mjs\` (this file -> src/) and
// \`node scripts/generate-dart-client.mjs\` (this file ->
// clients/dart/lib/). Both clients are generated, never hand-edited —
// the same tripwire test covers them.
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
  const [, seg, ...rest] = path.split('/');
  if (rest.length === 0) {
    // The group root: /items (GET list, POST create).
    return method === 'get' ? 'list' : 'create';
  }
  // Nested paths (shape 4 + AI, issue #16): '/ai/vector-store/upsert'
  // -> 'vectorStoreUpsert' (CamelCase each segment, drop separators,
  // lowercase-first for the JS method name).
  const name = rest
    .map((s) => s.split(/[^a-zA-Z0-9]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(''))
    .join('');
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function generateClient(paths, schemas) {
  const lines = [header];
  const ops = [];
  const usedTypes = new Set();
  for (const [path, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (method !== 'get' && method !== 'post') continue;
      // Well-known endpoints (e.g. /.well-known/jwks.json) are
      // machine-to-machine infrastructure consumed by services, not
      // by generated clients — skip them (shape 4's auth service
      // documents its JWKS in the spec; no client calls it).
      if (path.startsWith('/.')) continue;
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
    lines.push(\`} from './types';\`, '');
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
  // auth.register; '/items' -> items.list / items.create; the AI
  // routes -> ai.chatCompletions / ai.vectorStoreUpsert, issue #16).
  const groups = new Map();
  for (const { path, method, reqT, resT, auth } of ops) {
    const [, seg] = path.split('/');
    const group = seg ?? 'root';
    const name = operationName(method, path);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ name, method, path, reqT, resT, auth });
  }

  for (const [group, entries] of groups) {
    lines.push(\`  \${group}: {\`);
    for (const { name, method, path, reqT, resT, auth } of entries) {
      const lower = method.toLowerCase();
      const args = reqT !== 'void' ? \`input: \${reqT}\` : '';
      const callBody = reqT !== 'void' ? ', input' : '';
      // The authenticated flag is the 4th positional arg; an
      // authenticated no-body call needs an explicit undefined body
      // placeholder (request(method, path, body?, authenticated?)).
      const authArg = auth ? (reqT !== 'void' ? ', true' : ', undefined, true') : '';
      lines.push(\`    /** \${lower.toUpperCase()} \${path}\${auth ? ' (requires Bearer access token)' : ''} */\`);
      lines.push(\`    \${name}: async (\${args}) => request<\${resT}>('\${lower}', '\${path}'\${callBody}\${authArg}),\`);
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
  lines.push(\`} from './types';\`);
  lines.push(\`export { createClient, type ClientOptions } from './client';\`);
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
} from './types';

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
    login: async (input: AuthCredentialsInputBody) => request<AuthTokens>('post', '/auth/login', input),
    /** POST /auth/logout */
    logout: async (input: AuthRefreshInputBody) => request<void>('post', '/auth/logout', input),
    /** POST /auth/refresh */
    refresh: async (input: AuthRefreshInputBody) => request<AuthTokens>('post', '/auth/refresh', input),
    /** POST /auth/register */
    register: async (input: AuthRegisterInputBody) => request<AuthRegisterOutputBody>('post', '/auth/register', input),
  },
  items: {
    /** GET /items (requires Bearer access token) */
    list: async () => request<Item[]>('get', '/items', undefined, true),
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
} from './types';
export { createClient, type ClientOptions } from './client';`;
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

  it('regenerating the Dart client from the committed openapi.yaml changes nothing', () => {
    const dartGenerator = join(contractDir, 'scripts/generate-dart-client.mjs');
    const out = mkdtempSync(join(tmpdir(), 'contract-regen-dart-'));
    try {
      execFileSync(process.execPath, [dartGenerator, specPath, join(out, 'openapi_client.dart')], { stdio: 'pipe' });
      expect(
        readFileSync(join(out, 'openapi_client.dart'), 'utf8'),
        \`openapi_client.dart is stale — run \\\`task contract:generate\\\` and commit the diff\`,
      ).toBe(readFileSync(join(contractDir, 'clients/dart/lib/openapi_client.dart'), 'utf8'));
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
  return `// GENERATED by scripts/generate-dart-client.mjs — do not edit by hand.
// Regenerate with \`task contract:generate\` after regenerating
// openapi.yaml from the Go structs (decision 19: Go is canonical,
// clients are downstream). Consumed by the Flutter mobile (ticket 17).

import 'dart:convert';

import 'package:http/http.dart' as http;

/// AuthCredentialsInputBody — a schema of the committed openapi.yaml.
class AuthCredentialsInputBody {
  const AuthCredentialsInputBody({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  factory AuthCredentialsInputBody.fromJson(Map<String, dynamic> json) => AuthCredentialsInputBody(
        email: json['email'] as String,
        password: json['password'] as String,
      );

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
      };
}

/// AuthRefreshInputBody — a schema of the committed openapi.yaml.
class AuthRefreshInputBody {
  const AuthRefreshInputBody({
    this.refresh,
  });

  final String? refresh;

  factory AuthRefreshInputBody.fromJson(Map<String, dynamic> json) => AuthRefreshInputBody(
        refresh: json['refresh'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'refresh': refresh,
      };
}

/// AuthRegisterInputBody — a schema of the committed openapi.yaml.
class AuthRegisterInputBody {
  const AuthRegisterInputBody({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;

  factory AuthRegisterInputBody.fromJson(Map<String, dynamic> json) => AuthRegisterInputBody(
        email: json['email'] as String,
        password: json['password'] as String,
      );

  Map<String, dynamic> toJson() => {
        'email': email,
        'password': password,
      };
}

/// AuthRegisterOutputBody — a schema of the committed openapi.yaml.
class AuthRegisterOutputBody {
  const AuthRegisterOutputBody({
    required this.access,
    required this.refresh,
    required this.user,
  });

  final String access;
  final String refresh;
  final AuthUser user;

  factory AuthRegisterOutputBody.fromJson(Map<String, dynamic> json) => AuthRegisterOutputBody(
        access: json['access'] as String,
        refresh: json['refresh'] as String,
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'access': access,
        'refresh': refresh,
        'user': user,
      };
}

/// AuthTokens — a schema of the committed openapi.yaml.
class AuthTokens {
  const AuthTokens({
    required this.access,
    required this.refresh,
  });

  final String access;
  final String refresh;

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
        access: json['access'] as String,
        refresh: json['refresh'] as String,
      );

  Map<String, dynamic> toJson() => {
        'access': access,
        'refresh': refresh,
      };
}

/// AuthUser — a schema of the committed openapi.yaml.
class AuthUser {
  const AuthUser({
    required this.email,
    required this.id,
  });

  final String email;
  final String id;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        email: json['email'] as String,
        id: json['id'] as String,
      );

  Map<String, dynamic> toJson() => {
        'email': email,
        'id': id,
      };
}

/// ErrorDetail — a schema of the committed openapi.yaml.
class ErrorDetail {
  const ErrorDetail({
    this.location,
    this.message,
    this.value,
  });

  final String? location;
  final String? message;
  final dynamic value;

  factory ErrorDetail.fromJson(Map<String, dynamic> json) => ErrorDetail(
        location: json['location'] as String?,
        message: json['message'] as String?,
        value: json['value'],
      );

  Map<String, dynamic> toJson() => {
        'location': location,
        'message': message,
        'value': value,
      };
}

/// ErrorModel — a schema of the committed openapi.yaml.
class ErrorModel {
  const ErrorModel({
    this.detail,
    this.errors,
    this.instance,
    this.status,
    this.title,
    this.type,
  });

  final String? detail;
  final List<ErrorDetail>? errors;
  final String? instance;
  final int? status;
  final String? title;
  final String? type;

  factory ErrorModel.fromJson(Map<String, dynamic> json) => ErrorModel(
        detail: json['detail'] as String?,
        errors: json['errors'] == null ? null : (json['errors'] as List).map((e) => ErrorDetail.fromJson(e as Map<String, dynamic>)).toList(),
        instance: json['instance'] as String?,
        status: json['status'] as int?,
        title: json['title'] as String?,
        type: json['type'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'detail': detail,
        'errors': errors?.map((e) => e.toJson()).toList(),
        'instance': instance,
        'status': status,
        'title': title,
        'type': type,
      };
}

/// Item — a schema of the committed openapi.yaml.
class Item {
  const Item({
    required this.createdAt,
    required this.id,
    required this.name,
  });

  final DateTime createdAt;
  final String id;
  final String name;

  factory Item.fromJson(Map<String, dynamic> json) => Item(
        createdAt: DateTime.parse(json['created_at'] as String),
        id: json['id'] as String,
        name: json['name'] as String,
      );

  Map<String, dynamic> toJson() => {
        'created_at': createdAt.toIso8601String(),
        'id': id,
        'name': name,
      };
}

/// ItemCreateInputBody — a schema of the committed openapi.yaml.
class ItemCreateInputBody {
  const ItemCreateInputBody({
    required this.name,
  });

  final String name;

  factory ItemCreateInputBody.fromJson(Map<String, dynamic> json) => ItemCreateInputBody(
        name: json['name'] as String,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
      };
}

/// A typed client over the committed openapi.yaml (decision 19).
class OpenApiClient {
  OpenApiClient({
    required this.baseUrl,
    this.accessToken,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;

  /// The Bearer access token attached to protected calls (decision 16/23).
  String? accessToken;

  final http.Client _http;

  Map<String, String> _headers({required bool authenticated}) => {
        'Content-Type': 'application/json',
        if (authenticated && accessToken != null) 'Authorization': 'Bearer $accessToken',
      };

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = false,
  }) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll(_headers(authenticated: authenticated));
    if (body != null) request.body = jsonEncode(body);
    final response = await _http.send(request);
    final text = await response.stream.bytesToString();
    if (response.statusCode >= 400) {
      var message = '$method $path -> \${response.statusCode}';
      if (text.isNotEmpty) {
        try {
          final decoded = jsonDecode(text) as Map<String, dynamic>;
          message = decoded['detail'] as String? ?? message;
        } catch (_) {
          // non-JSON error body; keep the status message
        }
      }
      throw OpenApiException(response.statusCode, message);
    }
    if (text.isEmpty) return null;
    return jsonDecode(text);
  }

  /// POST /auth/login
  Future<AuthTokens> login(AuthCredentialsInputBody input) async {
    final json = await _send('POST', '/auth/login', body: input.toJson());
    return AuthTokens.fromJson(json as Map<String, dynamic>);
  }

  /// POST /auth/logout
  Future<void> logout(AuthRefreshInputBody input) async {
    await _send('POST', '/auth/logout', body: input.toJson());
  }

  /// POST /auth/refresh
  Future<AuthTokens> refresh(AuthRefreshInputBody input) async {
    final json = await _send('POST', '/auth/refresh', body: input.toJson());
    return AuthTokens.fromJson(json as Map<String, dynamic>);
  }

  /// POST /auth/register
  Future<AuthRegisterOutputBody> register(AuthRegisterInputBody input) async {
    final json = await _send('POST', '/auth/register', body: input.toJson());
    return AuthRegisterOutputBody.fromJson(json as Map<String, dynamic>);
  }

  /// GET /items (requires Bearer access token)
  Future<List<Item>> listItems() async {
    final json = await _send('GET', '/items', authenticated: true);
    return (json as List).map((e) => Item.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// POST /items (requires Bearer access token)
  Future<Item> createItem(ItemCreateInputBody input) async {
    final json = await _send('POST', '/items', body: input.toJson(), authenticated: true);
    return Item.fromJson(json as Map<String, dynamic>);
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
function generateDartClientMjs(): string {
  return `// scripts/generate-dart-client.mjs — regenerates the Dart client
// (clients/dart/lib/openapi_client.dart) from the committed
// openapi.yaml (decision 19: Go is the canonical side; clients are
// downstream). Consumed by the Flutter mobile (ticket 17).
//
// The generator is intentionally small and dependency-light (only
// \`yaml\` for parsing), mirroring generate-ts-client.mjs: the emitted
// client is a typed http wrapper with one model class per object
// schema — nothing more. Regenerating must produce a byte-identical
// diff — the scaffold's tests assert that (test/generated.test.ts).
//
// Usage: node scripts/generate-dart-client.mjs [spec-path] [out-file]
//   spec-path defaults to ./openapi.yaml
//   out-file  defaults to ./clients/dart/lib/openapi_client.dart

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(process.argv[2] ?? join(root, 'openapi.yaml'));
const outFile = resolve(process.argv[3] ?? join(root, 'clients/dart/lib/openapi_client.dart'));

const spec = YAML.parse(readFileSync(specPath, 'utf8'));
const schemas = spec.components?.schemas ?? {};
const paths = spec.paths ?? {};

const header = [
  '// GENERATED by scripts/generate-dart-client.mjs — do not edit by hand.',
  '// Regenerate with \`task contract:generate\` after regenerating',
  '// openapi.yaml from the Go structs (decision 19: Go is canonical,',
  '// clients are downstream). Consumed by the Flutter mobile (ticket 17).',
  '',
  "import 'dart:convert';",
  '',
  "import 'package:http/http.dart' as http;",
  '',
  '',
].join('\\n');

// ---- helpers --------------------------------------------------------------

const isModel = (name) => Object.prototype.hasOwnProperty.call(schemas, name);
const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const camel = (s) => s.split(/[^a-zA-Z0-9]/).map((w) => upperFirst(w)).join('');

function isNullable(schema) {
  if (!schema) return true;
  if (schema.anyOf && schema.anyOf.some((s) => s.type === 'null')) return true;
  if (schema.oneOf && schema.oneOf.some((s) => s.type === 'null')) return true;
  return Array.isArray(schema.type) && schema.type.includes('null');
}

// typeOf maps a schema to a Dart type (non-null base; nullability is
// handled by the emitters).
function typeOf(schema) {
  if (!schema) return 'dynamic';
  if (schema.$ref) return schema.$ref.split('/').pop();
  const union = schema.anyOf ?? schema.oneOf;
  if (union) return typeOf(union.find((s) => s.type !== 'null'));
  if (Array.isArray(schema.type)) {
    return typeOf({ ...schema, type: schema.type.find((t) => t !== 'null') });
  }
  if (schema.type === 'array') return \`List<\${typeOf(schema.items)}>\`;
  if (schema.type === 'object') return 'Map<String, dynamic>';
  if (schema.format === 'date-time') return 'DateTime';
  switch (schema.type) {
    case 'string':
      return 'String';
    case 'integer':
      return 'int';
    case 'number':
      return 'num';
    case 'boolean':
      return 'bool';
    default:
      return 'dynamic';
  }
}

const isListType = (schema) =>
  schema?.type === 'array' || (Array.isArray(schema?.type) && schema.type.includes('array'));
const isDateType = (schema) =>
  schema?.format === 'date-time' ||
  (schema?.anyOf ?? []).some((s) => s.format === 'date-time') ||
  (schema?.oneOf ?? []).some((s) => s.format === 'date-time');

// ---- models ---------------------------------------------------------------

function fromJsonExpr(key, schema, nullable) {
  const T = typeOf(schema);
  const j = \`json['\${key}']\`;
  if (schema.$ref) {
    return nullable
      ? \`\${j} == null ? null : \${T}.fromJson(\${j} as Map<String, dynamic>)\`
      : \`\${T}.fromJson(\${j} as Map<String, dynamic>)\`;
  }
  if (isListType(schema)) {
    const itemT = typeOf(schema.items);
    const inner = isModel(itemT)
      ? \`.map((e) => \${itemT}.fromJson(e as Map<String, dynamic>)).toList()\`
      : itemT === 'dynamic'
        ? ''
        : \`.map((e) => e as \${itemT}).toList()\`;
    const cast = \`(\${j} as List)\${inner}\`;
    return nullable ? \`\${j} == null ? null : \${cast}\` : cast;
  }
  if (isDateType(schema)) {
    return nullable
      ? \`\${j} == null ? null : DateTime.parse(\${j} as String)\`
      : \`DateTime.parse(\${j} as String)\`;
  }
  if (T === 'Map<String, dynamic>') {
    return nullable
      ? \`\${j} == null ? null : \${j} as Map<String, dynamic>\`
      : \`\${j} as Map<String, dynamic>\`;
  }
  if (T === 'dynamic') return j;
  return nullable ? \`\${j} as \${T}?\` : \`\${j} as \${T}\`;
}

function toJsonExpr(key, field, schema, nullable) {
  const T = typeOf(schema);
  if (schema.$ref) return \`'\${key}': \${field}\`;
  if (isListType(schema)) {
    const itemT = typeOf(schema.items);
    const inner = isModel(itemT) ? '.map((e) => e.toJson()).toList()' : '';
    if (nullable && inner) {
      return \`'\${key}': \${field}?\${inner}\`;
    }
    // A primitive-typed or null list serializes as-is (jsonEncode
    // handles null) — a bare '? ' is invalid Dart.
    return \`'\${key}': \${field}\${inner}\`;
  }
  if (isDateType(schema)) {
    return nullable ? \`'\${key}': \${field}?.toIso8601String()\` : \`'\${key}': \${field}.toIso8601String()\`;
  }
  return \`'\${key}': \${field}\`;
}

function generateModels() {
  const out = [];
  for (const [name, schema] of Object.entries(schemas)) {
    const t = schema.type;
    if (t !== 'object' && !(Array.isArray(t) && t.includes('object'))) continue;
    const required = new Set(schema.required ?? []);
    const props = Object.entries(schema.properties ?? {}).filter(([k]) => k !== '$schema');

    out.push(\`/// \${name} — a schema of the committed openapi.yaml.\`);
    out.push(\`class \${name} {\`);
    if (props.length === 0) {
      out.push(\`  const \${name}();\`);
      out.push('');
      out.push(\`  factory \${name}.fromJson(Map<String, dynamic> json) => \${name}();\`);
      out.push('');
      out.push('  Map<String, dynamic> toJson() => {};');
    } else {
      out.push(\`  const \${name}({\`);
      out.push(\`    \${props.map(([k, s]) => {
        const field = lowerFirst(camel(k));
        return \`\${required.has(k) ? 'required this.' : 'this.'}\${field},\`;
      }).join('\\n    ')}\`);
      out.push('  });');
      out.push('');
      for (const [k, s] of props) {
        const field = lowerFirst(camel(k));
        const T = typeOf(s);
        const nullable = !required.has(k) || isNullable(s);
        // dynamic is already nullable — a trailing '?' is a lint.
        const suffix = nullable && T !== 'dynamic' ? '?' : '';
        out.push(\`  final \${T}\${suffix} \${field};\`);
      }
      out.push('');
      out.push(\`  factory \${name}.fromJson(Map<String, dynamic> json) => \${name}(\`);
      for (const [k, s] of props) {
        const field = lowerFirst(camel(k));
        out.push(\`        \${field}: \${fromJsonExpr(k, s, !required.has(k) || isNullable(s))},\`);
      }
      out.push('      );');
      out.push('');
      out.push('  Map<String, dynamic> toJson() => {');
      for (const [k, s] of props) {
        const field = lowerFirst(camel(k));
        out.push(\`        \${toJsonExpr(k, field, s, !required.has(k) || isNullable(s))},\`);
      }
      out.push('      };');
    }
    out.push('}');
    out.push('');
  }
  return out.join('\\n');
}

// ---- client ---------------------------------------------------------------

function operationName(method, path) {
  const [, seg, ...rest] = path.split('/');
  if (rest.length === 0) {
    // The group root: /items (GET list, POST create).
    const singular = seg.replace(/s$/, '');
    return method === 'get' ? \`list\${upperFirst(seg)}\` : \`create\${upperFirst(singular)}\`;
  }
  // Nested paths: '/auth/login' -> 'login', '/ai/vector-store/upsert'
  // -> 'vectorStoreUpsert' (camelCase each segment, lowercase-first).
  const name = rest.map((s) => camel(s)).join('');
  return lowerFirst(name);
}

function requestType(op) {
  const media = op.requestBody?.content?.['application/json'];
  const schema = media?.schema;
  if (!schema) return 'void';
  if (schema.$ref) return schema.$ref.split('/').pop();
  return 'Map<String, dynamic>';
}

function responseType(op) {
  const responses = op.responses ?? {};
  const keys = Object.keys(responses).filter((k) => /^2\\d\\d$/.test(k));
  if (keys.length === 0) return 'void';
  const media = responses[keys[0]]?.content?.['application/json'];
  if (!media) return 'void';
  return typeOf(media.schema);
}

function isAuthenticated(op) {
  return Array.isArray(op.security) && op.security.length > 0;
}

function generateClient() {
  const out = [];
  const ops = [];
  for (const [path, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (method !== 'get' && method !== 'post') continue;
      // Well-known endpoints (e.g. /.well-known/jwks.json) are
      // machine-to-machine infrastructure consumed by services, not by
      // generated clients — skip them (shape 4's auth service
      // documents its JWKS in the spec; no client calls it).
      if (path.startsWith('/.')) continue;
      ops.push({
        path,
        method,
        name: operationName(method, path),
        reqT: requestType(op),
        resT: responseType(op),
        auth: isAuthenticated(op),
      });
    }
  }

  out.push('/// A typed client over the committed openapi.yaml (decision 19).');
  out.push('class OpenApiClient {');
  out.push('  OpenApiClient({');
  out.push('    required this.baseUrl,');
  out.push('    this.accessToken,');
  out.push('    http.Client? httpClient,');
  out.push('  }) : _http = httpClient ?? http.Client();');
  out.push('');
  out.push('  final String baseUrl;');
  out.push('');
  out.push("  /// The Bearer access token attached to protected calls (decision 16/23).");
  out.push('  String? accessToken;');
  out.push('');
  out.push('  final http.Client _http;');
  out.push('');
  out.push("  Map<String, String> _headers({required bool authenticated}) => {");
  out.push("        'Content-Type': 'application/json',");
  out.push("        if (authenticated && accessToken != null) 'Authorization': 'Bearer $accessToken',");
  out.push('      };');
  out.push('');
  out.push('  Future<dynamic> _send(');
  out.push('    String method,');
  out.push('    String path, {');
  out.push('    Map<String, dynamic>? body,');
  out.push('    bool authenticated = false,');
  out.push('  }) async {');
  out.push("    final request = http.Request(method, Uri.parse('$baseUrl$path'))");
  out.push('      ..headers.addAll(_headers(authenticated: authenticated));');
  out.push('    if (body != null) request.body = jsonEncode(body);');
  out.push('    final response = await _http.send(request);');
  out.push('    final text = await response.stream.bytesToString();');
  out.push('    if (response.statusCode >= 400) {');
  out.push("      var message = '$method $path -> \${response.statusCode}';");
  out.push('      if (text.isNotEmpty) {');
  out.push('        try {');
  out.push('          final decoded = jsonDecode(text) as Map<String, dynamic>;');
  out.push("          message = decoded['detail'] as String? ?? message;");
  out.push('        } catch (_) {');
  out.push('          // non-JSON error body; keep the status message');
  out.push('        }');
  out.push('      }');
  out.push('      throw OpenApiException(response.statusCode, message);');
  out.push('    }');
  out.push('    if (text.isEmpty) return null;');
  out.push('    return jsonDecode(text);');
  out.push('  }');
  out.push('');

  for (const { path, method, name, reqT, resT, auth } of ops) {
    const upper = method.toUpperCase();
    const args = reqT !== 'void' ? \`\${reqT} input\` : '';
    const sendArgs = [
      \`'\${upper}'\`,
      \`'\${path}'\`,
      reqT !== 'void' ? 'body: input.toJson()' : '',
      auth ? 'authenticated: true' : '',
    ].filter(Boolean).join(', ');
    const doc = \`  /// \${upper} \${path}\${auth ? ' (requires Bearer access token)' : ''}\`;
    if (resT === 'void') {
      out.push(doc);
      out.push(\`  Future<void> \${name}(\${args}) async {\`);
      out.push(\`    await _send(\${sendArgs});\`);
      out.push('  }');
      out.push('');
      continue;
    }
    if (resT.startsWith('List<')) {
      const itemT = resT.slice(5, -1);
      const fromJson = isModel(itemT)
        ? \`.map((e) => \${itemT}.fromJson(e as Map<String, dynamic>)).toList()\`
        : \`.cast<\${itemT}>()\`;
      out.push(doc);
      out.push(\`  Future<\${resT}> \${name}(\${args}) async {\`);
      out.push(\`    final json = await _send(\${sendArgs});\`);
      out.push(\`    return (json as List)\${fromJson};\`);
      out.push('  }');
      out.push('');
      continue;
    }
    const returnExpr =
      resT === 'Map<String, dynamic>'
        ? 'json as Map<String, dynamic>'
        : \`\${resT}.fromJson(json as Map<String, dynamic>)\`;
    out.push(doc);
    out.push(\`  Future<\${resT}> \${name}(\${args}) async {\`);
    out.push(\`    final json = await _send(\${sendArgs});\`);
    out.push(\`    return \${returnExpr};\`);
    out.push('  }');
    out.push('');
  }

  out.push('}');
  out.push('');
  out.push('/// Thrown for non-2xx responses.');
  out.push('class OpenApiException implements Exception {');
  out.push('  OpenApiException(this.statusCode, this.message);');
  out.push('');
  out.push('  final int statusCode;');
  out.push('  final String message;');
  out.push('');
  out.push("  @override");
  out.push("  String toString() => 'OpenApiException($statusCode): $message';");
  out.push('}');
  out.push('');
  return out.join('\\n');
}

// ---- emit ------------------------------------------------------------------

const src = header + generateModels() + '\\n' + generateClient();
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, src);

console.log(\`generate-dart-client: wrote \${outFile}\`);
`;
}

export { openapiYaml, contractPackageJson, contractTsconfigJson, contractReadme, generateTsClientMjs, generateDartClientMjs, clientTypesTs, clientTs, clientIndexTs, generatedTestTs, dartPubspec, dartClient };
