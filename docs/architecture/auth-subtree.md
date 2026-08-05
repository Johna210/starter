# The auth subtree (decisions 11, 12, 16, 23)

This is the *generator's* auth doc: the auth shim the CLI produces, the
sole-minter invariant, and the two client flows (web and mobile). The
scaffolded project's `docs/architecture/auth-subtree.md` shows the
reader *their* shape's diagram; this doc is the contributor-facing map.

## The auth shim (decision 12)

The starter ships an **auth shim** — a *thin typed layer* over vetted
upstream libraries that owns the **surface** of auth:

- **token shape** (short-lived access + rotating refresh);
- **argon2id parameters** for password hashing;
- **the four HTTP endpoints** (`/auth/{register,login,refresh,logout}`);
- **refresh rotation**.

It does **not** ship the crypto (that lives in audited libraries), and
it does **not** ship everything a real auth system might want —
everything beyond the shim's scope is **fenced off** as "wire it in:
here's the seam" (email verification, password reset, MFA, account
lockout, social/OAuth, RBAC beyond a single authenticated principal —
decision 12's exact list). A "genuinely real minimal auth" was rejected
(real auth has no minimum; shipping it makes the starter a maintained
auth framework), as was a "documented stub" (a real seam wrapping a
fake capability is the same bait-and-switch rejected at every layer).
Fences are the third path: the seam is real, the shim is honest, the
rest is a deliberate handoff.

## The sole-minter invariant (decision 11)

Across *every* shape, exactly one process is configured to mint tokens:
`apps/api` in monolith shapes (1, 3), `apps/api-auth` in microservices
shapes (2, 4). Every other service holds only public-key material — it
can verify, never sign. The mechanism for distributing the public half
differs by shape (a shared TS package import in shape 2; a fetched-and-
cached JWKS document in shape 4). The mechanism differs; the invariant
is identical, and it matters more than the mechanism.

## The web flow (decision 16)

The web→api auth flow is **uniform across both web variants**:

1. `POST /auth/login` (or `/register`) verifies the password (argon2id),
   issues a token pair, and sets an **httpOnly refresh cookie** + returns
   a short-lived **access token** in the body.
2. `api-client` (decision 15) attaches the access token as a **Bearer
   header** to api calls.
3. On 401 it transparently calls `/refresh` (which re-reads the httpOnly
   cookie), rotates the refresh token, and retries.

Refresh is a **property of the client**, not bespoke per variant.
Storage of the access token differs only by rendering shell — in-memory
in the SPA (Vite) variant, forwarded from the incoming cookie into the
server-side `api-client` in the Next SSR variant. httpOnly protects the
refresh token from XSS; the short-lived access token is briefly readable
during its lifetime — the standard, accepted JWT tradeoff.

## The mobile flow (decision 23)

Mobile is a different auth architecture for a different runtime — not
an inconsistency with the web flow:

- Both mobile variants (Expo in TS shapes, Flutter in polyglot shapes)
  store access **and** refresh tokens in **OS-managed secure storage**
  (`expo-secure-store` / `flutter_secure_storage`), not cookies.
- The access token is attached as a **Bearer header**; on 401 the client
  calls `/refresh` with the refresh token in the **body** (not a cookie)
  and swaps.
- `/login` returns both tokens in the response body to mobile clients
  (web gets cookies *additionally*; mobile just doesn't use them) — a
  body-only / cookie-also fork on the endpoints, not a new architecture.

Secure storage is the **platform-native** mitigation on mobile (there
is no httpOnly cookie on a Flutter device), not a downgrade. OAuth/PKCE
stays fenced (decision 12): a full app graduates to the platform-vendor-
recommended OAuth-with-PKCE flow (RFC 8252) by wiring it into the shim's
seam.

## The contributor's seam

The shim's scope is a **locked surface** — new auth capabilities do not
get scaffolded in; they become fences (see
[`../wire-it-in/fence-extension.md`](../wire-it-in/fence-extension.md)).
A template change that touches auth must preserve: the sole-minter
invariant (one process signs), the shim's surface (token shape, argon2
params, four endpoints, rotation), and the web/mobile fork (cookie-also
vs body-only delivery). The `contributing/` playbook's fence entry
([`../contributing/fence.md`](../contributing/fence.md)) covers adding a
new fenced capability across the three places a fence lives.
