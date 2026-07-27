// Materializer: writes the scaffolded project for a given composition.
//
// Per issue #3, only the TS-monolith + Vite+TanStack + no-mobile + no-AI
// composition is materializable. All other compositions throw an
// UnimplementedCompositionError; the CLI's own tests assert both paths.
//
// Templates are kept as TS string constants (decision 25b: TS templates
// can be imported as values / type-checked, not embedded as bytes).

import { join } from 'node:path';
import { type Composition, describeComposition, isImplemented } from './composition.js';
// Re-exported to preserve the public API: external code imports
// `ProjectContext` from '../src/materialize.js'.
export type { ProjectContext } from './materialize/_shared.js';
import { type ProjectContext, writeFileRecursive } from './materialize/_shared.js';
import { writeRoot } from './materialize/root.js';
import { writeShared } from './materialize/shared.js';
import { writeWeb } from './materialize/web.js';
import { writeApiClient } from './materialize/api-client.js';
import { writeDb } from './materialize/db.js';
import { writeAuth } from './materialize/auth.js';
import { writeApi } from './materialize/api.js';
import { writeApiAuth } from './materialize/api-auth.js';

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

// ---------- composition writers -------------------------------------------

/** TS-monolith + Vite+TanStack web + no mobile + no AI. */
async function writeTsMonolithVite(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeRoot(ctx);
  await writeWeb(ctx);
  await writeApi(ctx);
  await writeApiAuth(ctx);

  await writeShared(ctx);
  await writeDb(ctx);

  await writeApiClient(ctx);
  await writeAuth(ctx);

  // docs/wire-it-in/auth.md — the fences the shim does NOT ship (decision 12, 30/31)
  await writeFileRecursive(join(targetDir, 'docs/wire-it-in/auth.md'), wireItInAuthMd());
}

// ---------- docs/wire-it-in/auth.md (decision 12, 30/31) ---------------

function wireItInAuthMd(): string {
  return `# Auth: what's in the shim, what isn't

The starter ships an \`auth shim\` (decision 12) — a *thin typed layer*
over vetted upstream libraries that owns the **surface** of auth
(token shape, argon2id parameters, the four HTTP endpoints, refresh
rotation). It does **not** ship everything you might want from a
real auth system; the rest is fenced off below as "wire it in: here's
the seam."

## What the shim ships

- **Password hashing**: \`hashPassword\` / \`verifyPassword\` (argon2id
  via the canonical \`argon2\` Node bindings, OWASP 2024 parameters).
- **JWT issue/verify**: \`signToken\` / \`verifyToken\` (HS256 via
  \`jose\`).
- **Refresh-token rotation**: \`issueTokenPair\` / \`rotateTokenPair\` /
  \`revokeRefreshToken\`, over a \`RefreshTokenStore\` seam.
- **Four HTTP endpoints** (\`/auth/{register,login,refresh,logout}\`)
  with zod-validated input and JSON output.
- **Sole-minter invariant** (decision 11): only \`apps/api\` reads
  \`JWT_SECRET\`. No other service in the monorepo holds a signing key.

Real libraries, not mocks. The \`@starter/auth\` package's unit tests
exercise \`argon2\`, \`jose\`, and the rotation store against real
implementations (decision 22).

## What the shim does NOT ship (the fences)

These are intentionally out of scope. Each is a real product decision
that varies per app — shipping one would be a bait-and-switch (decision 12).
For each, the seam is the \`@starter/auth\` package; the api's
\`internal/auth/\` module is the HTTP boundary; and \`apps/api\` is the
deployment surface.

### Email verification

Send a one-time link after \`/auth/register\`; the user clicks to mark
their email as verified. **Seam**: add a \`users.emailVerifiedAt\`
column to \`packages/db\` (migration 0003), then a new \`/auth/verify\`
route that flips it on a valid token. \`@starter/auth\` exports the
token shape; you add the mailer and the route. The login response can
include \`{ emailVerified: boolean }\` and the api can 403 unverified
users on a per-project policy.

### Password reset

\`POST /auth/forgot-password { email }\` emails a short-lived token;
\`POST /auth/reset-password { token, newPassword }\` validates and
updates. **Seam**: a new \`password_reset_tokens\` table in
\`packages/db\` (parallel to \`refresh_tokens\`), a new store
implementation in \`apps/api/src/internal/auth/\`, two new routes on
the auth sub-router. The \`hashPassword\` function in
\`@starter/auth\` is the password-update primitive.

### MFA (TOTP, WebAuthn, SMS)

Step-up auth: after password login, a second factor. **Seam**: add a
\`user_factors\` table (factor type, public key / secret, last used
counter), a \`/auth/mfa/*\` route group, and a per-project policy
in \`apps/api\` (which routes require step-up). The lib's
\`signToken\` / \`verifyToken\` stay unchanged — you can issue
short-lived step-up tokens with a custom payload field.

### OAuth / social login (Google, GitHub, etc.)

\`POST /auth/oauth/{provider}/callback { code }\` exchanges an auth
code for a user identity, then either finds-or-creates a row in
\`users\`, then issues a token pair. **Seam**: add a per-provider
config block (\`GOOGLE_CLIENT_ID\`, \`GOOGLE_CLIENT_SECRET\`, ...) to
\`apps/api/src/config.ts\`; a new \`oauth_accounts\` table linking
provider+subject to userId; the existing \`issueTokenPair\` handles
the rest. The web client redirects; the api handles the callback.

### RBAC (roles, permissions, organizations)

Beyond "a single authenticated principal", role/permission checks
(\`role: 'admin'\`, \`can('items:write')\`, etc.) are per-domain. **Seam**:
add the columns/tables you need to \`packages/db\` (e.g.
\`user_roles(user_id, role)\`), a \`requireRole(...)\` middleware
parallel to \`requireAuth\` in \`apps/api/src/internal/auth/\`, and
apply it to the routes that need it. The base \`requireAuth\` is
unchanged — the \`userId\` it sets on the context is the FK into
your role tables.

## Why these are fences, not features

Decision 12 (locked): the starter owns the surface, not the entire
auth system. A "real minimal auth" is a contradiction — real auth has
no minimum, and shipping one turns the starter into a *maintained
auth framework* (every CVE, every rotation bug lands forever). A
"documented stub" is the bait-and-switch rejected at the architecture
level in decision 10. Fences are the third path: the seam is real,
the shim is honest, the rest is a deliberate handoff.
`;
}
