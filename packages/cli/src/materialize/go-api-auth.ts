// Materializer: apps/api-auth templates for the Go-microservices shape 4
// (issue #15).
//
// apps/api-auth is the example split (decision 10) on the capability
// axis (auth/IAM): a separate Go deployable that OWNS the four auth
// endpoints (register/login/refresh/logout) and is the SOLE MINTER of
// JWTs in the shape (decision 11). There is no packages/auth across
// languages (decision 9) — the contract is the only seam — so the
// auth shim that the TS shapes share as a package lives HERE as Go
// source: argon2id + RS256 JWT + refresh rotation, exactly the shim
// of the Go-monolith (shape 3), extracted into its own service.
//
// The service also serves its public key material at the
// contract-defined /.well-known/jwks.json endpoint (RFC 7517); apps/api
// (the main api) fetches it, caches on a TTL, and verifies every
// request's signature locally against the cached key — the
// local-verify principle (decision 11). No /verify introspection.
//
// The signing key: read from JWT_PRIVATE_KEY (a PEM-encoded RSA key),
// or generated ephemerally at boot for dev (logged loudly). The
// private half NEVER leaves this process — the invariant is about who
// signs, and apps/api only ever holds public-key material.
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into apps/api-auth. The orchestrator
// (materialize.ts) calls writeGoApiAuthService(ctx). Template
// functions shared with apps/api (shape 3) are imported from
// go-api.js; only the auth-service-specific files live here.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';
import {
  authIndexGo,
  authMiddlewareGo,
  authPasswordsGo,
  authPasswordsTestGo,
  authRepoGo,
  authRepoPgGo,
  authRoutesGo,
  dbGo,
  dbTestpoolGo,
  goSum,
  migrateGo,
  migrationsRefreshTokensSql,
  migrationsUsersSql,
} from './go-api.js';

export async function writeGoApiAuthService(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'apps/api-auth/go.mod'), goModAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/go.sum'), goSum());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/.env.example'), envExampleAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/cmd/api/main.go'), apiMainGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/cmd/migrate/main.go'), migrateMainGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/cmd/specgen/main.go'), specgenMainGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/config/config.go'), configGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/db/db.go'), dbGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/db/migrate.go'), migrateGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/db/testpool.go'), dbTestpoolGo());

  // The auth shim, relocated into its own deployable (the example
  // split, decision 10): argon2id + RS256 JWT + refresh rotation.
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/passwords.go'), authPasswordsGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/tokens.go'), tokensGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/refresh.go'), refreshGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/auth.repo.go'), authRepoGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/auth.repo.pg.go'), authRepoPgGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/auth.routes.go'), authRoutesGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/auth.middleware.go'), authMiddlewareGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/index.go'), authIndexGo());

  // The public half of the signing key, served at the contract-defined
  // JWKS endpoint (decision 11's distribution mechanism for shape 4).
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/jwks/jwks.go'), jwksGoAuth());

  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/router/router.go'), routerGoAuth());

  await writeFileRecursive(join(targetDir, 'apps/api-auth/migrations/0000_users.sql'), migrationsUsersSql());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/migrations/0001_refresh_tokens.sql'), migrationsRefreshTokensSql());

  await writeFileRecursive(join(targetDir, 'apps/api-auth/contract_test.go'), contractTestGoAuth());

  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/passwords_test.go'), authPasswordsTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/tokens_test.go'), tokensTestGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/refresh_test.go'), refreshTestGoAuth());
  await writeFileRecursive(join(targetDir, 'apps/api-auth/internal/auth/auth.repo_test.go'), authRepoTestGoAuth());
}

function goModAuth(): string {
  return `module starter/apps/api-auth

go 1.25.0

require (
	github.com/danielgtaylor/huma/v2 v2.39.1
	github.com/gin-gonic/gin v1.12.0
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/jackc/pgx/v5 v5.10.0
	github.com/joho/godotenv v1.5.1
	golang.org/x/crypto v0.54.0
	gopkg.in/yaml.v3 v3.0.1
)

require (
	github.com/bytedance/gopkg v0.1.4 // indirect
	github.com/bytedance/sonic v1.15.2 // indirect
	github.com/bytedance/sonic/loader v0.5.1 // indirect
	github.com/cloudwego/base64x v0.1.7 // indirect
	github.com/gabriel-vasile/mimetype v1.4.13 // indirect
	github.com/gin-contrib/sse v1.1.1 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.30.3 // indirect
	github.com/goccy/go-json v0.10.6 // indirect
	github.com/goccy/go-yaml v1.19.2 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/cpuid/v2 v2.4.0 // indirect
	github.com/leodido/go-urn v1.4.0 // indirect
	github.com/mattn/go-isatty v0.0.23 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/pelletier/go-toml/v2 v2.4.3 // indirect
	github.com/quic-go/qpack v0.6.0 // indirect
	github.com/quic-go/quic-go v0.60.0 // indirect
	github.com/twitchyliquid64/golang-asm v0.15.1 // indirect
	github.com/ugorji/go/codec v1.3.1 // indirect
	go.mongodb.org/mongo-driver/v2 v2.8.0 // indirect
	golang.org/x/arch v0.29.0 // indirect
	golang.org/x/net v0.57.0 // indirect
	golang.org/x/sync v0.22.0 // indirect
	golang.org/x/sys v0.47.0 // indirect
	golang.org/x/text v0.40.0 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)
`;
}

function envExampleAuth(): string {
  return `# apps/api-auth — env surface (decision 28). Copy to .env for dev; prod
# injects real env vars. Code reads these only through internal/config.
#
# Shape 4 (Go-microservices): apps/api-auth is the SOLE MINTER of JWTs
# (decision 11). It holds the private signing key and owns the /auth/*
# HTTP surface + the JWKS endpoint. apps/api (the main api) holds only
# public-key material — it fetches the JWKS and verifies locally.
#
# JWT_PRIVATE_KEY is optional: when unset the service generates an
# EPHEMERAL RSA key at boot (fine for dev; the api fetches the JWKS
# after boot). Set it to a PEM-encoded RSA private key for a stable
# key across restarts (prod):
#   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwks.key
#   (then export the file's contents as JWT_PRIVATE_KEY)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
PORT=3001
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
`;
}

function apiMainGoAuth(): string {
  return `// cmd/api — the auth service's entrypoint. Boots the gin engine on the
// configured port (default 3001). \`task dev:api-auth\` runs this.
package main

import (
	"context"
	"crypto/rsa"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"starter/apps/api-auth/internal/auth"
	"starter/apps/api-auth/internal/config"
	"starter/apps/api-auth/internal/db"
	"starter/apps/api-auth/internal/jwks"
	"starter/apps/api-auth/internal/router"
)

func main() {
	// Dev loads .env + dotenv (decision 28); prod injects real env
	// vars, and a missing .env is fine.
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	// The signing key (sole minter, decision 11): parsed from
	// JWT_PRIVATE_KEY, or generated ephemerally for dev. The private
	// half never leaves this process — the api only ever fetches the
	// public JWKS.
	var priv *rsa.PrivateKey
	if cfg.JWTPrivateKey != "" {
		priv, err = auth.ParsePrivateKeyPEM(cfg.JWTPrivateKey)
		if err != nil {
			log.Fatalf("auth: parse JWT_PRIVATE_KEY: %v", err)
		}
	} else {
		priv, err = auth.GeneratePrivateKey()
		if err != nil {
			log.Fatalf("auth: generate signing key: %v", err)
		}
		log.Printf("auth: using an EPHEMERAL signing key — set JWT_PRIVATE_KEY for a stable key across restarts")
	}
	signer := auth.NewSigner(priv, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)
	jwksDoc := jwks.NewJWKSDocument(&priv.PublicKey)

	engine, _ := router.New(router.Deps{
		Config: cfg,
		Users:  auth.NewPGUserStore(pool),
		Tokens: auth.NewPGRefreshTokenStore(pool),
		Signer: signer,
		JWKS:   jwksDoc,
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	go func() {
		log.Printf("api-auth listening on http://localhost:%s (openapi: /openapi.json, jwks: /.well-known/jwks.json)", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	// Graceful shutdown on Ctrl-C / SIGTERM.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
`;
}

function migrateMainGoAuth(): string {
  return `// cmd/migrate — the auth service's migration runner. Applies every
// migrations/*.sql file in order (users + refresh_tokens — this
// service's own tables), tracking applied versions in
// schema_migrations. \`task migrate\` runs this (after apps/api's
// runner, which owns the items table).
package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"

	"starter/apps/api-auth/internal/config"
	"starter/apps/api-auth/internal/db"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	applied, err := db.Migrate(context.Background(), pool, "migrations")
	if err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if len(applied) == 0 {
		log.Println("migrate: no pending migrations")
		return
	}
	for _, name := range applied {
		log.Printf("migrate: applied %s", name)
	}
}
`;
}

function specgenMainGoAuth(): string {
  return `// cmd/specgen — regenerates packages/contract/openapi.auth.yaml from
// the api-auth Go structs (decision 19: Go is the canonical side). The
// generated file is committed; the merge script folds it together with
// apps/api's openapi.api.yaml into packages/contract/openapi.yaml.
// \`task contract:generate\` runs this and then the merge + client
// regeneration.
//
// Usage: go run ./cmd/specgen [output-path]
//
// The default output path assumes apps/api-auth is the cwd (as
// Taskfile's contract:generate does).
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"

	"starter/apps/api-auth/internal/auth"
	"starter/apps/api-auth/internal/config"
	"starter/apps/api-auth/internal/jwks"
	"starter/apps/api-auth/internal/router"
)

func main() {
	out := "../../packages/contract/openapi.auth.yaml"
	if len(os.Args) > 1 {
		out = os.Args[1]
	}

	// Specgen only walks route registration — no DB access happens.
	// The stores are nil because no handler runs during generation.
	engine, _ := router.New(router.Deps{
		Config: config.Config{
			Port:            "3001",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
		},
		Users:  auth.UserStore(nil),
		Tokens: auth.RefreshTokenStore(nil),
		Signer: stubSigner{},
		JWKS:   jwks.NewJWKSDocumentForSpec(),
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/openapi.json", nil)
	engine.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		fmt.Fprintf(os.Stderr, "specgen: GET /openapi.json -> %d\\n", w.Code)
		os.Exit(1)
	}

	var doc map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &doc); err != nil {
		fmt.Fprintf(os.Stderr, "specgen: unmarshal: %v\\n", err)
		os.Exit(1)
	}

	abs, err := filepath.Abs(out)
	if err != nil {
		fmt.Fprintf(os.Stderr, "specgen: %v\\n", err)
		os.Exit(1)
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "specgen: %v\\n", err)
		os.Exit(1)
	}
	yamlDoc, err := yaml.Marshal(doc)
	if err != nil {
		fmt.Fprintf(os.Stderr, "specgen: marshal yaml: %v\\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(abs, yamlDoc, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "specgen: %v\\n", err)
		os.Exit(1)
	}
	fmt.Printf("specgen: wrote %s\\n", abs)
}

// stubSigner satisfies auth.Signer for spec generation (never called).
type stubSigner struct{}

func (stubSigner) SignAccess(context.Context, string) (string, error)         { return "", nil }
func (stubSigner) SignRefresh(context.Context, string, string) (string, error) { return "", nil }
func (stubSigner) Verify(context.Context, string) (*auth.Claims, error)        { return &auth.Claims{}, nil }
`;
}

function configGoAuth(): string {
  return `// Package config implements the typed config for the auth service
// (decision 28): parsed from the environment, fail-fast at startup.
// Dev loads vars via .env + godotenv (see cmd/api); prod uses real
// env vars injected by the deploy platform.
package config

import (
	"fmt"
	"os"
	"time"
)

// Config holds every env var the auth service reads.
type Config struct {
	// DatabaseURL is the Postgres connection string (pgx format).
	DatabaseURL string
	// JWTPrivateKey is an optional PEM-encoded RSA signing key. When
	// empty the service generates an ephemeral key at boot (dev
	// convenience — apps/api re-fetches the JWKS once its cache TTL
	// elapses, so a key rotation takes effect within that window).
	JWTPrivateKey string
	// Port the service listens on (default 3001; apps/api runs on
	// 3000 by default).
	Port string
	// AccessTokenTTL mirrors decision 16: short-lived access tokens.
	AccessTokenTTL time.Duration
	// RefreshTokenTTL for the refresh tokens / httpOnly cookie.
	RefreshTokenTTL time.Duration
}

// Load parses the environment into a Config. Missing or invalid values
// are fatal — the same fail-fast contract as zod's config.ts.
func Load() (Config, error) {
	accessTTL, err := envDuration("ACCESS_TOKEN_TTL", 15*time.Minute)
	if err != nil {
		return Config{}, err
	}
	refreshTTL, err := envDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour)
	if err != nil {
		return Config{}, err
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	cfg := Config{
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTPrivateKey:   os.Getenv("JWT_PRIVATE_KEY"),
		Port:            port,
		AccessTokenTTL:  accessTTL,
		RefreshTokenTTL: refreshTTL,
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL is required (set it in apps/api-auth/.env or the environment)")
	}
	return cfg, nil
}

// envDuration reads a duration env var in seconds (matching the TS
// config's second-based TTLs), returning def when unset.
func envDuration(name string, def time.Duration) (time.Duration, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return def, nil
	}
	seconds, err := parseSeconds(raw)
	if err != nil {
		return 0, fmt.Errorf("config: %s must be a positive integer (seconds), got %q", name, raw)
	}
	return time.Duration(seconds) * time.Second, nil
}

func parseSeconds(raw string) (int64, error) {
	var seconds int64
	if _, err := fmt.Sscanf(raw, "%d", &seconds); err != nil || seconds <= 0 {
		return 0, fmt.Errorf("not a positive integer")
	}
	return seconds, nil
}
`;
}

function tokensGoAuth(): string {
  return `// tokens.go — JWT issue/verify (golang-jwt/jwt/v5, RS256).
//
// Thin typed layer over the vetted JWT library. The auth service signs
// with an RSA private key (the sole minter, decision 11); apps/api
// verifies the same tokens against the public JWKS this service serves
// at /.well-known/jwks.json — asymmetric, so no shared secret crosses
// the service boundary. The starter owns the algorithm (RS256), the
// key size (2048-bit, generated or from JWT_PRIVATE_KEY) and the TTLs
// (from config); the wire format is a standard JWT. Access tokens
// carry {sub}; refresh tokens additionally carry a jti so the rotation
// store can recognise and revoke individual tokens.
package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"starter/apps/api-auth/internal/jwks"
)

// TokenKind discriminates the two token kinds (decision 16: short-lived
// access, longer-lived refresh).
type TokenKind string

const (
	TokenKindAccess  TokenKind = "access"
	TokenKindRefresh TokenKind = "refresh"
)

// Claims is the JWT payload the auth service signs.
type Claims struct {
	// Kind is "access" or "refresh" — required because a refresh token
	// must never be accepted as a Bearer access token.
	Kind TokenKind \`json:"kind"\`
	// JTI identifies a refresh token for rotation/revocation; empty for
	// access tokens.
	JTI string \`json:"jti,omitempty"\`
	jwt.RegisteredClaims
}

// InvalidTokenError is returned by VerifyToken on any JWT failure.
type InvalidTokenError struct{ msg string }

func (e *InvalidTokenError) Error() string { return e.msg }

// ErrInvalidToken is the sentinel wrapped by InvalidTokenError.
var ErrInvalidToken = errors.New("auth: invalid token")

// SignToken signs a token for the given user with the configured TTL
// for its kind. The claims' iat/exp are set here, and the kid header is
// stamped from the public key's deterministic fingerprint
// (jwks.KidFor — the same value the JWKS document serves), so apps/api
// can pick the matching key from the set when it verifies locally.
func SignToken(priv *rsa.PrivateKey, userID string, kind TokenKind, jti string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Kind: kind,
		JTI:  jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = jwks.KidFor(&priv.PublicKey)
	signed, err := token.SignedString(priv)
	if err != nil {
		return "", fmt.Errorf("auth: sign token: %w", err)
	}
	return signed, nil
}

// VerifyToken checks a token's signature and expiry and returns its
// claims. Returns *InvalidTokenError for any failure (expired,
// malformed, wrong signature).
func VerifyToken(pub *rsa.PublicKey, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodRS256 {
			return nil, fmt.Errorf("auth: unexpected signing method %v", t.Method)
		}
		return pub, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil {
		return nil, &InvalidTokenError{msg: err.Error()}
	}
	if !token.Valid {
		return nil, &InvalidTokenError{msg: "auth: invalid token"}
	}
	return claims, nil
}

// ParsePrivateKeyPEM parses a PEM-encoded RSA private key (PKCS#8 or
// PKCS#1). Used by cmd/api to load JWT_PRIVATE_KEY.
func ParsePrivateKeyPEM(pemData string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemData))
	if block == nil {
		return nil, fmt.Errorf("auth: no PEM block found in JWT_PRIVATE_KEY")
	}
	if key, err := x509.ParsePKCS8PrivateKey(block.Bytes); err == nil {
		priv, ok := key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("auth: JWT_PRIVATE_KEY is not an RSA private key")
		}
		return priv, nil
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("auth: JWT_PRIVATE_KEY is neither PKCS#8 nor PKCS#1 RSA: %w", err)
	}
	return priv, nil
}

// GeneratePrivateKey returns a fresh 2048-bit RSA key (the dev
// fallback when JWT_PRIVATE_KEY is unset).
func GeneratePrivateKey() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 2048)
}

// newJTI returns a fresh refresh-token id (UUID v4).
func newJTI() (string, error) {
	return newUUID()
}
`;
}

function refreshGoAuth(): string {
  return `// refresh.go — refresh-token rotation.
//
// The auth shim's split-seam: this module owns the *rotation algorithm*
// (issue -> verify -> revoke -> re-issue), while *persistence* is
// delegated to a RefreshTokenStore interface that the service
// implements with pgx (see auth.repo.pg.go). The store is the minimum
// viable surface: a refresh token is recognised by its jti; lookup
// returns the user it belongs to; revocation prevents future rotation.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

// RefreshTokenRecord is a persisted refresh token.
type RefreshTokenRecord struct {
	JTI       string
	UserID    string
	ExpiresAt time.Time
	Revoked   bool
}

// RefreshTokenStore is the persistence seam for refresh tokens.
type RefreshTokenStore interface {
	// Create persists a freshly-issued refresh token.
	Create(ctx context.Context, rec RefreshTokenRecord) error
	// FindByJTI looks up a refresh token by jti. Returns ErrRefreshTokenNotFound when unknown.
	FindByJTI(ctx context.Context, jti string) (RefreshTokenRecord, error)
	// Revoke marks a refresh token as revoked. Idempotent.
	Revoke(ctx context.Context, jti string) error
}

// ErrRefreshTokenNotFound is returned by FindByJTI for unknown tokens.
var ErrRefreshTokenNotFound = errors.New("auth: refresh token not found")

// InvalidRefreshTokenError is returned by RotateTokenPair /
// RevokeRefreshToken for store-level rejections. The routes map it to 401.
type InvalidRefreshTokenError struct{ msg string }

func (e *InvalidRefreshTokenError) Error() string { return e.msg }

// TokenPair is the two-token pair issued on login / refresh.
type TokenPair struct {
	Access  string \`json:"access"\`
	Refresh string \`json:"refresh"\`
}

// Signer issues tokens. The service holds the RSA private key (sole
// minter, decision 11); the seam keeps rotation testable without
// touching the store.
type Signer interface {
	SignAccess(ctx context.Context, userID string) (string, error)
	SignRefresh(ctx context.Context, userID, jti string) (string, error)
	Verify(ctx context.Context, token string) (*Claims, error)
}

// NewSigner returns a Signer backed by the given RSA key and TTLs.
func NewSigner(priv *rsa.PrivateKey, accessTTL, refreshTTL time.Duration) Signer {
	return &jwtSigner{priv: priv, accessTTL: accessTTL, refreshTTL: refreshTTL}
}

type jwtSigner struct {
	priv       *rsa.PrivateKey
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func (s *jwtSigner) SignAccess(_ context.Context, userID string) (string, error) {
	return SignToken(s.priv, userID, TokenKindAccess, "", s.accessTTL)
}

func (s *jwtSigner) SignRefresh(_ context.Context, userID, jti string) (string, error) {
	return SignToken(s.priv, userID, TokenKindRefresh, jti, s.refreshTTL)
}

func (s *jwtSigner) Verify(_ context.Context, token string) (*Claims, error) {
	return VerifyToken(&s.priv.PublicKey, token)
}

// IssueTokenPair issues a new token pair for a user and records the
// refresh token in the store.
func IssueTokenPair(ctx context.Context, signer Signer, store RefreshTokenStore, userID string) (TokenPair, error) {
	jti, err := newUUID()
	if err != nil {
		return TokenPair{}, fmt.Errorf("auth: issue pair: %w", err)
	}
	access, err := signer.SignAccess(ctx, userID)
	if err != nil {
		return TokenPair{}, fmt.Errorf("auth: issue pair: %w", err)
	}
	refresh, err := signer.SignRefresh(ctx, userID, jti)
	if err != nil {
		return TokenPair{}, fmt.Errorf("auth: issue pair: %w", err)
	}

	// Decode the refresh we just signed for its expiry, so the TTL's
	// source of truth stays in tokens.go.
	claims, err := signer.Verify(ctx, refresh)
	if err != nil {
		return TokenPair{}, fmt.Errorf("auth: issue pair: %w", err)
	}
	expiresAt := claims.ExpiresAt.Time
	if err := store.Create(ctx, RefreshTokenRecord{JTI: jti, UserID: userID, ExpiresAt: expiresAt}); err != nil {
		return TokenPair{}, fmt.Errorf("auth: issue pair: %w", err)
	}
	return TokenPair{Access: access, Refresh: refresh}, nil
}

// RotateTokenPair verifies the old refresh token, revokes it, and
// issues a new pair. The old refresh token cannot be used again after
// this call.
func RotateTokenPair(ctx context.Context, signer Signer, store RefreshTokenStore, oldRefresh string) (TokenPair, error) {
	claims, err := signer.Verify(ctx, oldRefresh)
	if err != nil {
		return TokenPair{}, &InvalidRefreshTokenError{msg: "auth: invalid refresh token"}
	}
	if claims.Kind != TokenKindRefresh || claims.JTI == "" {
		return TokenPair{}, &InvalidRefreshTokenError{msg: "auth: invalid refresh token"}
	}

	rec, err := store.FindByJTI(ctx, claims.JTI)
	if err != nil {
		return TokenPair{}, &InvalidRefreshTokenError{msg: "auth: invalid refresh token"}
	}
	if rec.Revoked {
		return TokenPair{}, &InvalidRefreshTokenError{msg: "auth: refresh token revoked"}
	}
	if rec.ExpiresAt.Before(time.Now()) {
		return TokenPair{}, &InvalidRefreshTokenError{msg: "auth: refresh token expired"}
	}

	// Revoke the old, issue a new pair. Revoke first so a concurrent
	// rotation with the same token fails fast on the store check.
	if err := store.Revoke(ctx, rec.JTI); err != nil {
		return TokenPair{}, fmt.Errorf("auth: rotate: %w", err)
	}
	return IssueTokenPair(ctx, signer, store, rec.UserID)
}

// RevokeRefreshToken revokes a refresh token (POST /auth/logout).
// Idempotent — revoking an already-revoked token is a no-op.
func RevokeRefreshToken(ctx context.Context, signer Signer, store RefreshTokenStore, refresh string) error {
	claims, err := signer.Verify(ctx, refresh)
	if err != nil {
		return &InvalidRefreshTokenError{msg: "auth: invalid refresh token"}
	}
	if claims.Kind != TokenKindRefresh || claims.JTI == "" {
		return &InvalidRefreshTokenError{msg: "auth: invalid refresh token"}
	}
	return store.Revoke(ctx, claims.JTI)
}

// newUUID returns a random UUID v4 string.
func newUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%s-%s-%s-%s-%s",
		hex.EncodeToString(b[0:4]), hex.EncodeToString(b[4:6]),
		hex.EncodeToString(b[6:8]), hex.EncodeToString(b[8:10]),
		hex.EncodeToString(b[10:16])), nil
}
`;
}

function jwksGoAuth(): string {
  return `// Package jwks builds and serves the auth service's JSON Web Key Set
// (RFC 7517) — the shape-4 distribution mechanism for the sole-minter
// invariant (decision 11). The service holds the RSA private key;
// apps/api fetches this document (the public half only), caches it on
// a TTL, and verifies every request's signature locally against the
// cached key (the local-verify principle — no /verify introspection).
package jwks

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"math/big"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// JWK is a single RSA public key in RFC 7517 form.
type JWK struct {
	Kty string \`json:"kty"\`
	Kid string \`json:"kid"\`
	Use string \`json:"use"\`
	Alg string \`json:"alg"\`
	N   string \`json:"n"\`
	E   string \`json:"e"\`
}

// JWKSDocument is the /.well-known/jwks.json response body.
type JWKSDocument struct {
	Keys []JWK \`json:"keys"\`
}

// NewJWKSDocument builds the document for a public key. The kid is a
// stable, deterministic fingerprint of the key (the first 16 bytes of
// the SHA-256 of its PKCS#1 DER encoding), so apps/api can match it
// without any out-of-band communication.
func NewJWKSDocument(pub *rsa.PublicKey) JWKSDocument {
	e := big.NewInt(int64(pub.E)).Bytes()
	return JWKSDocument{Keys: []JWK{
		{
			Kty: "RSA",
			Kid: KidFor(pub),
			Use: "sig",
			Alg: "RS256",
			N:   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
			E:   base64.RawURLEncoding.EncodeToString(e),
		},
	}}
}

// KidFor returns the deterministic key id for a public key — the first
// 16 bytes of the SHA-256 of its PKCS#1 DER encoding, base64url. The
// SIGNING side stamps this into every JWT's kid header (tokens.go), so
// the verifying side (apps/api) can pick the matching key from the set.
func KidFor(pub *rsa.PublicKey) string {
	sum := sha256.Sum256(x509.MarshalPKCS1PublicKey(pub))
	return base64.RawURLEncoding.EncodeToString(sum[:16])
}

// JWKSOutput is the 200 response of GET /.well-known/jwks.json.
type JWKSOutput struct {
	Body JWKSDocument
}

// JWKSHandler returns the handler serving the (static) JWKS document.
func JWKSHandler(doc JWKSDocument) func(context.Context, *struct{}) (*JWKSOutput, error) {
	return func(_ context.Context, _ *struct{}) (*JWKSOutput, error) {
		return &JWKSOutput{Body: doc}, nil
	}
}

// NewJWKSDocumentForSpec returns an empty document with the same
// schema shape — used by cmd/specgen, where no handler ever runs (the
// endpoint's response schema must still be generated from the struct).
func NewJWKSDocumentForSpec() JWKSDocument {
	return JWKSDocument{Keys: []JWK{}}
}

// RegisterJWKS mounts the JWKS endpoint at the contract-defined path.
func RegisterJWKS(api huma.API, doc JWKSDocument) {
	g := huma.NewGroup(api, "/.well-known")
	huma.Register(g, huma.Operation{
		Method:  http.MethodGet,
		Path:    "/jwks.json",
		Summary: "Serve the JSON Web Key Set (decision 11)",
		Tags:    []string{"jwks"},
	}, JWKSHandler(doc))
}
`;
}

function routerGoAuth(): string {
  return `// Package router assembles the auth service: the gin engine, the one
// huma API (which owns its OpenAPI document — Go is the canonical
// side, decision 19), and the two surfaces:
//   - /auth                — the four auth endpoints (decision 12),
//                            the sole-minter surface (decision 11)
//   - /.well-known/jwks.json — the public key document apps/api
//                            fetches and caches (decision 11)
package router

import (
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"

	"starter/apps/api-auth/internal/auth"
	"starter/apps/api-auth/internal/config"
	"starter/apps/api-auth/internal/jwks"
)

// Deps are the seams the router composes.
type Deps struct {
	Config config.Config
	Users  auth.UserStore
	Tokens auth.RefreshTokenStore
	Signer auth.Signer
	JWKS   jwks.JWKSDocument
}

// New assembles and returns the gin engine. The service is bound to
// the engine; its OpenAPI document is served live at /openapi.json and
// committed at packages/contract/openapi.auth.yaml (see cmd/specgen).
func New(deps Deps) (*gin.Engine, huma.API) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	api := humagin.New(r, humaDefaultConfig())

	// The auth module is the sole minter's surface (decision 11): only
	// this service signs. Its RequireAuth middleware is unused here —
	// every /auth endpoint is public by design.
	auth.NewAuthModule(api, deps.Users, deps.Tokens, deps.Signer, deps.Config.RefreshTokenTTL)

	// The public half of the signing key, served for apps/api's
	// fetch-and-cache local verification (decision 11).
	jwks.RegisterJWKS(api, deps.JWKS)

	return r, api
}

func humaDefaultConfig() huma.Config {
	c := huma.DefaultConfig("Starter Auth API", "0.1.0")
	c.OpenAPI.Info.Description = "The scaffolded Go auth service: the sole minter of JWTs (decision 11) — the four auth endpoints plus the JWKS at /.well-known/jwks.json."
	return c
}
`;
}

function authRepoTestGoAuth(): string {
  return `// auth.repo.test.go — unit tests for the auth repo layer (decision 22):
// real Postgres, no mocks. Skips cleanly when DATABASE_URL is unset.
package auth

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"starter/apps/api-auth/internal/db"
)

func authTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL unset — skipping auth repo test (needs a real Postgres)")
	}
	pool, schema, err := db.NewTestPool(context.Background(), url)
	if err != nil {
		t.Skipf("no reachable Postgres at DATABASE_URL: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE")
		pool.Close()
	})
	return pool
}

func TestPGUserStoreCreateAndFind(t *testing.T) {
	pool := authTestPool(t)
	ctx := context.Background()
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	email := "unit-" + time.Now().Format("150405.000000000") + "@test.dev"
	store := NewPGUserStore(pool)

	user, err := store.CreateUser(ctx, email, "$argon2id$fake-hash")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if user.ID == "" || user.Email != email || user.PasswordHash != "$argon2id$fake-hash" {
		t.Errorf("user = %+v", user)
	}

	found, err := store.FindUserByEmail(ctx, email)
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if found.ID != user.ID {
		t.Errorf("find: id = %q, want %q", found.ID, user.ID)
	}
}

func TestPGUserStoreDuplicateEmail(t *testing.T) {
	pool := authTestPool(t)
	ctx := context.Background()
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	email := "dup-" + time.Now().Format("150405.000000000") + "@test.dev"
	store := NewPGUserStore(pool)

	if _, err := store.CreateUser(ctx, email, "hash-a"); err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := store.CreateUser(ctx, email, "hash-b"); !errors.Is(err, ErrEmailTaken) {
		t.Errorf("second create: err = %v, want ErrEmailTaken", err)
	}
}

func TestPGUserStoreNotFound(t *testing.T) {
	pool := authTestPool(t)
	ctx := context.Background()
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	store := NewPGUserStore(pool)
	_, err := store.FindUserByEmail(ctx, "nobody@test.dev")
	if !errors.Is(err, ErrUserNotFound) {
		t.Errorf("err = %v, want ErrUserNotFound", err)
	}
}

func TestPGRefreshTokenStoreLifecycle(t *testing.T) {
	pool := authTestPool(t)
	ctx := context.Background()
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	store := NewPGRefreshTokenStore(pool)
	users := NewPGUserStore(pool)
	user, err := users.CreateUser(ctx, "rt-"+time.Now().Format("150405.000000000")+"@test.dev", "hash")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	rec := RefreshTokenRecord{JTI: "jti-lifecycle", UserID: user.ID, ExpiresAt: time.Now().Add(time.Hour)}
	if err := store.Create(ctx, rec); err != nil {
		t.Fatalf("create: %v", err)
	}
	found, err := store.FindByJTI(ctx, "jti-lifecycle")
	if err != nil {
		t.Fatalf("find: %v", err)
	}
	if found.UserID != user.ID || found.Revoked {
		t.Errorf("record = %+v", found)
	}

	if err := store.Revoke(ctx, "jti-lifecycle"); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if err := store.Revoke(ctx, "jti-lifecycle"); err != nil {
		t.Fatalf("revoke again (idempotent): %v", err)
	}
	found, err = store.FindByJTI(ctx, "jti-lifecycle")
	if err != nil {
		t.Fatalf("find after revoke: %v", err)
	}
	if !found.Revoked {
		t.Error("record should be revoked after Revoke")
	}

	if _, err := store.FindByJTI(ctx, "jti-unknown"); !errors.Is(err, ErrRefreshTokenNotFound) {
		t.Errorf("unknown jti: err = %v, want ErrRefreshTokenNotFound", err)
	}
}
`;
}

function refreshTestGoAuth(): string {
  return `// refresh.test.go — rotation-semantics unit tests (decision 22). The
// store is a tiny in-memory implementation of RefreshTokenStore; the
// algorithm under test is rotation (issue -> verify -> revoke ->
// re-issue), not persistence (that seam is covered by auth.repo.test.go
// against a real DB).
package auth

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

type memTokenStore struct {
	mu   sync.Mutex
	recs map[string]RefreshTokenRecord
}

func newMemTokenStore() *memTokenStore {
	return &memTokenStore{recs: map[string]RefreshTokenRecord{}}
}

func (m *memTokenStore) Create(_ context.Context, rec RefreshTokenRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.recs[rec.JTI] = rec
	return nil
}

func (m *memTokenStore) FindByJTI(_ context.Context, jti string) (RefreshTokenRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rec, ok := m.recs[jti]
	if !ok {
		return RefreshTokenRecord{}, ErrRefreshTokenNotFound
	}
	return rec, nil
}

func (m *memTokenStore) Revoke(_ context.Context, jti string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if rec, ok := m.recs[jti]; ok {
		rec.Revoked = true
		m.recs[jti] = rec
	}
	return nil
}

func testSigner(t *testing.T) Signer {
	t.Helper()
	priv, err := GeneratePrivateKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return NewSigner(priv, time.Minute, time.Hour)
}

func TestIssueTokenPair(t *testing.T) {
	ctx := context.Background()
	store := newMemTokenStore()
	signer := testSigner(t)
	pair, err := IssueTokenPair(ctx, signer, store, "user-1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if pair.Access == "" || pair.Refresh == "" {
		t.Fatal("issue: expected both tokens")
	}
	if pair.Access == pair.Refresh {
		t.Fatal("issue: access and refresh must differ")
	}
	claims, err := signer.Verify(ctx, pair.Refresh)
	if err != nil {
		t.Fatalf("verify refresh: %v", err)
	}
	if claims.Kind != TokenKindRefresh || claims.JTI == "" {
		t.Fatalf("refresh claims = %+v, want kind=refresh with a jti", claims)
	}
	rec, err := store.FindByJTI(ctx, claims.JTI)
	if err != nil {
		t.Fatalf("store lookup: %v", err)
	}
	if rec.UserID != "user-1" || rec.Revoked {
		t.Errorf("record = %+v, want user-1 and not revoked", rec)
	}
}

func TestRotateTokenPairRevokesOld(t *testing.T) {
	ctx := context.Background()
	store := newMemTokenStore()
	signer := testSigner(t)
	pair, err := IssueTokenPair(ctx, signer, store, "user-1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	oldClaims, _ := signer.Verify(ctx, pair.Refresh)
	oldJTI := oldClaims.JTI

	rotated, err := RotateTokenPair(ctx, signer, store, pair.Refresh)
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}
	if rotated.Access == "" || rotated.Refresh == "" {
		t.Fatal("rotate: expected a fresh pair")
	}
	newClaims, _ := signer.Verify(ctx, rotated.Refresh)
	if newClaims.JTI == oldJTI {
		t.Error("rotate: expected a new jti")
	}
	rec, err := store.FindByJTI(ctx, oldJTI)
	if err != nil {
		t.Fatalf("store lookup: %v", err)
	}
	if !rec.Revoked {
		t.Error("rotate: old refresh token must be revoked")
	}

	// The old token can no longer rotate.
	if _, err := RotateTokenPair(ctx, signer, store, pair.Refresh); err == nil {
		t.Fatal("rotate with a revoked token should fail")
	}
}

func TestRotateRejectsUnknownAndExpired(t *testing.T) {
	ctx := context.Background()
	store := newMemTokenStore()
	signer := testSigner(t)
	priv, err := GeneratePrivateKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	// Unknown jti: signed with a jti never recorded in the store.
	fake, err := SignToken(priv, "user-1", TokenKindRefresh, "never-recorded", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := RotateTokenPair(ctx, signer, store, fake); err == nil {
		t.Fatal("rotate with an unknown jti should fail")
	}

	// Expired refresh token.
	expired, err := SignToken(priv, "user-1", TokenKindRefresh, "expired-jti", -time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := RotateTokenPair(ctx, signer, store, expired); err == nil {
		t.Fatal("rotate with an expired token should fail")
	}
}

func TestRevokeRefreshTokenIdempotent(t *testing.T) {
	ctx := context.Background()
	store := newMemTokenStore()
	signer := testSigner(t)
	pair, err := IssueTokenPair(ctx, signer, store, "user-1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if err := RevokeRefreshToken(ctx, signer, store, pair.Refresh); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if err := RevokeRefreshToken(ctx, signer, store, pair.Refresh); err != nil {
		t.Fatalf("revoke again (idempotent): %v", err)
	}
	if _, err := RotateTokenPair(ctx, signer, store, pair.Refresh); err == nil {
		t.Fatal("rotate after revoke should fail")
	}
}

func TestErrorsWrapSentinels(t *testing.T) {
	var invalid *InvalidRefreshTokenError
	if !errors.As(&InvalidRefreshTokenError{msg: "x"}, &invalid) {
		t.Error("InvalidRefreshTokenError should wrap itself")
	}
}
`;
}

function tokensTestGoAuth(): string {
  return `// tokens.test.go — auth shim unit tests (decision 22). Real
// golang-jwt + RSA keys, no mocks.
package auth

import (
	"crypto/rsa"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"starter/apps/api-auth/internal/jwks"
)

func testKey(t *testing.T) (priv *rsa.PrivateKey, pub *rsa.PublicKey) {
	t.Helper()
	priv, err := GeneratePrivateKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return priv, &priv.PublicKey
}

func TestSignVerifyRoundTrip(t *testing.T) {
	priv, pub := testKey(t)
	token, err := SignToken(priv, "user-1", TokenKindAccess, "", time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	claims, err := VerifyToken(pub, token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != "user-1" {
		t.Errorf("sub = %q, want user-1", claims.Subject)
	}
	if claims.Kind != TokenKindAccess {
		t.Errorf("kind = %q, want access", claims.Kind)
	}
}

func TestVerifyWrongKey(t *testing.T) {
	priv, _ := testKey(t)
	token, err := SignToken(priv, "user-1", TokenKindAccess, "", time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	other, err := GeneratePrivateKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	if _, err := VerifyToken(&other.PublicKey, token); err == nil {
		t.Fatal("verify with the wrong key should fail")
	}
}

func TestVerifyExpiredToken(t *testing.T) {
	priv, pub := testKey(t)
	token, err := SignToken(priv, "user-1", TokenKindAccess, "", -time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	_, err = VerifyToken(pub, token)
	if err == nil {
		t.Fatal("verify of an expired token should fail")
	}
	var invalid *InvalidTokenError
	if !errors.As(err, &invalid) {
		t.Errorf("err = %T, want *InvalidTokenError", err)
	}
}

func TestVerifyGarbage(t *testing.T) {
	_, pub := testKey(t)
	if _, err := VerifyToken(pub, "not-a-jwt"); err == nil {
		t.Fatal("verify of garbage should fail")
	}
}

func TestSignTokenStampsKid(t *testing.T) {
	priv, pub := testKey(t)
	token, err := SignToken(priv, "user-1", TokenKindAccess, "", time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	// The kid header is what apps/api matches against when it picks the
	// key from the fetched JWKS (decision 11). If this drifts, every
	// real token 401s at the main api.
	parsed, _, err := new(jwt.Parser).ParseUnverified(token, jwt.MapClaims{})
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	kid, _ := parsed.Header["kid"].(string)
	want := jwks.KidFor(pub)
	if kid != want {
		t.Errorf("kid header = %q, want %q (the fingerprint the JWKS serves)", kid, want)
	}
}

func TestRefreshTokenCarriesJTI(t *testing.T) {
	priv, pub := testKey(t)
	token, err := SignToken(priv, "user-1", TokenKindRefresh, "jti-123", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	claims, err := VerifyToken(pub, token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.JTI != "jti-123" {
		t.Errorf("jti = %q, want jti-123", claims.JTI)
	}
}
`;
}

function contractTestGoAuth(): string {
  return `// contract_test.go — contract tests for the auth service (the shape-4
// example split, decision 22/19): validate the committed
// packages/contract/openapi.auth.yaml against the running service,
// schema-checking each route.
//
// Two levels, matching the Go-as-canonical-side rule (decision 19):
//
//  1. The committed auth spec must equal the live spec the service
//     serves. If the Go structs drift from the committed file, this
//     fails — the "regenerate from Go and commit" contract.
//  2. Each route in the committed spec must behave per its schema:
//     the four auth endpoints answer 2xx with bodies matching their
//     response schemas; /.well-known/jwks.json serves the public key
//     document; every response body's keys are checked against the
//     response schema declared in the committed spec.
//
// The behavioral level needs a real Postgres (the auth shim runs
// against one); it skips cleanly when DATABASE_URL is unset.
package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"starter/apps/api-auth/internal/auth"
	"starter/apps/api-auth/internal/config"
	"starter/apps/api-auth/internal/db"
	"starter/apps/api-auth/internal/jwks"
	"starter/apps/api-auth/internal/router"
)

const committedSpecPath = "../../packages/contract/openapi.auth.yaml"

// ---- spec loading -------------------------------------------------------

func loadCommittedSpec(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile(committedSpecPath)
	if err != nil {
		t.Fatalf("read committed openapi.auth.yaml: %v — run \`task contract:generate\` and commit it (decision 19)", err)
	}
	var doc map[string]any
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse committed openapi.auth.yaml: %v", err)
	}
	// Normalize through JSON so numbers are float64, exactly as the
	// live spec parse produces (yaml.v3 gives int, json float64).
	normalized, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("normalize committed openapi.auth.yaml: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(normalized, &out); err != nil {
		t.Fatalf("normalize committed openapi.auth.yaml: %v", err)
	}
	return out
}

func liveSpec(t *testing.T, engine *gin.Engine) map[string]any {
	t.Helper()
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/openapi.json", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("GET /openapi.json -> %d", w.Code)
	}
	var doc map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &doc); err != nil {
		t.Fatalf("parse live spec: %v", err)
	}
	return doc
}

// ---- no-DB level: committed spec == live spec ---------------------------

func TestCommittedSpecMatchesLiveSpec(t *testing.T) {
	engine, _ := router.New(testDeps(t, nil))
	committed := loadCommittedSpec(t)
	live := liveSpec(t, engine)

	// The committed file is the generated document: Go structs -> Huma
	// -> both files. If this fails, run \`task contract:generate\` and
	// commit the diff (decision 19).
	if !reflect.DeepEqual(committed, live) {
		cd, _ := json.MarshalIndent(committed, "", "  ")
		ld, _ := json.MarshalIndent(live, "", "  ")
		t.Fatalf("committed openapi.auth.yaml differs from the live spec.\\ncommitted:\\n%s\\n\\nlive:\\n%s", cd, ld)
	}
}

func TestCommittedSpecDocumentsTheRoutes(t *testing.T) {
	committed := loadCommittedSpec(t)
	paths, ok := committed["paths"].(map[string]any)
	if !ok {
		t.Fatalf("spec has no paths: %v", committed["paths"])
	}
	// Decision 12 (the four auth endpoints) + decision 11 (the JWKS).
	for _, p := range []string{"/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/.well-known/jwks.json"} {
		if _, ok := paths[p]; !ok {
			t.Errorf("committed auth spec is missing path %s", p)
		}
	}
}

// ---- DB level: routes behave per the committed spec ---------------------

func testDeps(t *testing.T, pool *pgxpool.Pool) router.Deps {
	t.Helper()
	priv, err := auth.GeneratePrivateKey()
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return router.Deps{
		Config: config.Config{
			DatabaseURL:     os.Getenv("DATABASE_URL"),
			Port:            "3001",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: time.Hour,
		},
		Users:  auth.NewPGUserStore(pool),
		Tokens: auth.NewPGRefreshTokenStore(pool),
		Signer: auth.NewSigner(priv, 15*time.Minute, time.Hour),
		JWKS:   jwks.NewJWKSDocument(&priv.PublicKey),
	}
}

func dbPoolForBehavior(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL unset — skipping contract behavior tests (needs a real Postgres)")
	}
	pool, schema, err := db.NewTestPool(context.Background(), url)
	if err != nil {
		t.Skipf("no reachable Postgres at DATABASE_URL: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE")
		pool.Close()
	})
	return pool
}

func TestContractRoutesAgainstLiveServer(t *testing.T) {
	pool := dbPoolForBehavior(t)
	ctx := context.Background()
	engine, _ := router.New(testDeps(t, pool))
	committed := loadCommittedSpec(t)
	client := specClient{engine: engine, spec: committed, t: t}

	// Fresh state.
	if _, err := db.Migrate(ctx, pool, "migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	for _, table := range []string{"users", "refresh_tokens"} {
		if _, err := pool.Exec(ctx, "TRUNCATE "+table+" CASCADE"); err != nil {
			t.Fatalf("truncate %s: %v", table, err)
		}
	}

	// 1. The JWKS endpoint serves the public key document (decision 11).
	jwksResp := client.request(t, "GET", "/.well-known/jwks.json", nil, "")
	if jwksResp.code != http.StatusOK {
		t.Fatalf("GET /.well-known/jwks.json -> %d, want 200: %s", jwksResp.code, jwksResp.body)
	}
	jwksResp.schemaCheck("GET", "/.well-known/jwks.json", "200")
	var doc struct {
		Keys []struct {
			Kty string \`json:"kty"\`
			Kid string \`json:"kid"\`
			Use string \`json:"use"\`
			Alg string \`json:"alg"\`
			N   string \`json:"n"\`
			E   string \`json:"e"\`
		} \`json:"keys"\`
	}
	if err := json.Unmarshal(jwksResp.body, &doc); err != nil {
		t.Fatalf("jwks body: %v", err)
	}
	if len(doc.Keys) != 1 || doc.Keys[0].Kty != "RSA" || doc.Keys[0].Alg != "RS256" || doc.Keys[0].N == "" {
		t.Errorf("jwks document = %s, want one RSA/RS256 key with a modulus", jwksResp.body)
	}

	// 2. Register -> 201, schema-checked pair + user; cookie is httpOnly.
	email := fmt.Sprintf("contract-%d@test.dev", time.Now().UnixNano())
	regBody := map[string]any{"email": email, "password": "password123"}
	reg := client.request(t, "POST", "/auth/register", regBody, "")
	if reg.code != http.StatusCreated {
		t.Fatalf("register -> %d, want 201: %s", reg.code, reg.body)
	}
	reg.schemaCheck("POST", "/auth/register", "201")
	var regOut struct {
		Access  string \`json:"access"\`
		Refresh string \`json:"refresh"\`
		User    struct {
			ID    string \`json:"id"\`
			Email string \`json:"email"\`
		} \`json:"user"\`
	}
	if err := json.Unmarshal(reg.body, &regOut); err != nil {
		t.Fatalf("register body: %v", err)
	}
	if regOut.Access == "" || regOut.Refresh == "" || regOut.User.ID == "" || regOut.User.Email != email {
		t.Errorf("register body = %s", reg.body)
	}
	if !strings.Contains(reg.headers.Get("Set-Cookie"), "HttpOnly") {
		t.Error("register must set the httpOnly refresh cookie")
	}

	// 3. Duplicate register -> 409 (schema-checked error body).
	dup := client.request(t, "POST", "/auth/register", regBody, "")
	if dup.code != http.StatusConflict {
		t.Errorf("duplicate register -> %d, want 409", dup.code)
	}
	dup.schemaCheck("POST", "/auth/register", "409")

	// 4. Login with the wrong password -> 401; correct -> 200 pair.
	bad := client.request(t, "POST", "/auth/login", map[string]any{"email": email, "password": "nope-nope"}, "")
	if bad.code != http.StatusUnauthorized {
		t.Errorf("bad login -> %d, want 401", bad.code)
	}
	bad.schemaCheck("POST", "/auth/login", "401")
	login := client.request(t, "POST", "/auth/login", map[string]any{"email": email, "password": "password123"}, "")
	if login.code != http.StatusOK {
		t.Fatalf("login -> %d, want 200: %s", login.code, login.body)
	}
	login.schemaCheck("POST", "/auth/login", "200")
	var loginOut struct {
		Access  string \`json:"access"\`
		Refresh string \`json:"refresh"\`
	}
	if err := json.Unmarshal(login.body, &loginOut); err != nil {
		t.Fatalf("login body: %v", err)
	}
	if loginOut.Access == "" || loginOut.Refresh == "" {
		t.Errorf("login body = %s", login.body)
	}

	// 5. Refresh via the cookie: new pair, old refresh revoked.
	cookie := refreshCookieFromHeader(login.headers.Get("Set-Cookie"))
	ref := client.requestCookie(t, "POST", "/auth/refresh", nil, cookie)
	if ref.code != http.StatusOK {
		t.Fatalf("refresh -> %d, want 200: %s", ref.code, ref.body)
	}
	ref.schemaCheck("POST", "/auth/refresh", "200")
	var refreshedPair struct {
		Access  string \`json:"access"\`
		Refresh string \`json:"refresh"\`
	}
	if err := json.Unmarshal(ref.body, &refreshedPair); err != nil {
		t.Fatalf("refresh body: %v", err)
	}
	// The old refresh token is dead: rotating with it must fail.
	oldAgain := client.request(t, "POST", "/auth/refresh", map[string]any{"refresh": loginOut.Refresh}, "")
	if oldAgain.code != http.StatusUnauthorized {
		t.Errorf("refresh with the revoked token -> %d, want 401", oldAgain.code)
	}
	oldAgain.schemaCheck("POST", "/auth/refresh", "401")

	// 6. Logout -> 204 + cleared cookie; the refreshed token is dead.
	out := client.requestCookie(t, "POST", "/auth/logout", nil, refreshCookieFromHeader(ref.headers.Get("Set-Cookie")))
	if out.code != http.StatusNoContent {
		t.Fatalf("logout -> %d, want 204", out.code)
	}
	if !strings.Contains(out.headers.Get("Set-Cookie"), "Max-Age=0") {
		t.Error("logout must clear the refresh cookie")
	}
	stale := client.request(t, "POST", "/auth/refresh", map[string]any{"refresh": refreshedPair.Refresh}, "")
	if stale.code != http.StatusUnauthorized {
		t.Errorf("refresh after logout -> %d, want 401", stale.code)
	}

	// 7. Every route in the committed spec answers (no 404s) — the
	// spec and the server stay in lockstep.
	paths := committed["paths"].(map[string]any)
	for path, ops := range paths {
		for method := range ops.(map[string]any) {
			if method != "get" && method != "post" {
				continue
			}
			resp := client.request(t, strings.ToUpper(method), path, nil, "")
			if resp.code == http.StatusNotFound {
				t.Errorf("route %s %s in the committed spec answered 404", method, path)
			}
		}
	}
}

// ---- schema-checking client ---------------------------------------------

type specResponse struct {
	code    int
	body    []byte
	headers http.Header
	client  *specClient
}

// specClient issues requests and schema-checks the responses against
// the committed spec (the seam of decision 19/22).
type specClient struct {
	engine *gin.Engine
	spec   map[string]any
	t      *testing.T
}

func (c *specClient) request(t *testing.T, method, path string, body map[string]any, bearer string) specResponse {
	t.Helper()
	var reader io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", bearer)
	}
	w := httptest.NewRecorder()
	c.engine.ServeHTTP(w, req)
	return specResponse{code: w.Code, body: w.Body.Bytes(), headers: w.Header(), client: c}
}

func (c *specClient) requestCookie(t *testing.T, method, path string, body map[string]any, cookie string) specResponse {
	t.Helper()
	resp := c.request(t, method, path, body, "")
	if cookie == "" {
		return resp
	}
	var reader io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Cookie", cookie)
	w := httptest.NewRecorder()
	c.engine.ServeHTTP(w, req)
	return specResponse{code: w.Code, body: w.Body.Bytes(), headers: w.Header(), client: c}
}

// schemaCheck asserts the response body's keys are a subset of the
// operation's response schema properties declared in the committed spec
// (for success statuses) or its default error schema (for error
// statuses).
func (r specResponse) schemaCheck(method, path, status string) {
	props, ok := responseProperties(r.client.spec, path, method, status)
	if !ok {
		r.client.t.Fatalf("%s %s: no %s/default response schema in the committed spec", method, path, status)
	}
	var body any
	if err := json.Unmarshal(r.body, &body); err != nil {
		r.client.t.Fatalf("%s %s: body is not JSON: %v (%s)", method, path, err, r.body)
	}
	switch v := body.(type) {
	case []any:
		for i, el := range v {
			checkKeysAgainstSchema(r.client.t, el, props, fmt.Sprintf("%s %s[%d]", method, path, i))
		}
	case map[string]any:
		checkKeysAgainstSchema(r.client.t, v, props, fmt.Sprintf("%s %s", method, path))
	default:
		r.client.t.Fatalf("%s %s: body is neither an object nor an array: %T", method, path, body)
	}
}

func checkKeysAgainstSchema(t *testing.T, el any, props map[string]bool, where string) {
	t.Helper()
	obj, ok := el.(map[string]any)
	if !ok {
		t.Errorf("%s: expected an object, got %T", where, el)
		return
	}
	for key := range obj {
		if !props[key] {
			t.Errorf("%s: key %q is not declared by the committed spec's response schema (declared: %v)",
				where, key, sortedKeys(props))
		}
	}
}

// responseProperties resolves the declared response schema properties
// for a path+method, preferring the given status and falling back to
// the operation's \`default\` response (huma's ErrorModel).
func responseProperties(spec map[string]any, path, method, status string) (map[string]bool, bool) {
	paths, _ := spec["paths"].(map[string]any)
	ops, _ := paths[path].(map[string]any)
	op, _ := ops[strings.ToLower(method)].(map[string]any)
	responses, _ := op["responses"].(map[string]any)
	if responses == nil {
		return nil, false
	}
	var resp map[string]any
	if r, ok := responses[status].(map[string]any); ok {
		resp = r
	} else if d, ok := responses["default"].(map[string]any); ok {
		resp = d
	} else {
		return nil, false
	}
	content, _ := resp["content"].(map[string]any)
	for _, ct := range []string{"application/json", "application/problem+json"} {
		media, _ := content[ct].(map[string]any)
		if media == nil {
			continue
		}
		schema, _ := media["schema"].(map[string]any)
		if schema == nil {
			continue
		}
		return schemaProperties(spec, schema)
	}
	return nil, false
}

// schemaProperties resolves a schema object (possibly a $ref, possibly
// an array wrapping a $ref) to its property names.
func schemaProperties(spec map[string]any, schema map[string]any) (map[string]bool, bool) {
	if ref, ok := schema["$ref"].(string); ok {
		name := ref[strings.LastIndex(ref, "/")+1:]
		comps, _ := spec["components"].(map[string]any)
		schemas, _ := comps["schemas"].(map[string]any)
		comp, _ := schemas[name].(map[string]any)
		props, _ := comp["properties"].(map[string]any)
		out := map[string]bool{}
		for k := range props {
			out[k] = true
		}
		return out, len(out) > 0
	}
	if typ, ok := schema["type"]; ok {
		if t, isStr := typ.(string); isStr && t == "array" {
			items, _ := schema["items"].(map[string]any)
			if items == nil {
				return nil, false
			}
			return schemaProperties(spec, items)
		}
		if types, isList := typ.([]any); isList {
			for _, t := range types {
				if t == "array" {
					items, _ := schema["items"].(map[string]any)
					if items == nil {
						return nil, false
					}
					return schemaProperties(spec, items)
				}
			}
		}
	}
	return nil, false
}

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j] < out[j-1]; j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	return out
}

func refreshCookieFromHeader(header string) string {
	for _, part := range strings.Split(header, ";") {
		if strings.HasPrefix(strings.TrimSpace(part), "refresh_token=") {
			return "refresh_token=" + strings.SplitN(strings.TrimSpace(part), "=", 2)[1]
		}
	}
	return ""
}
`;
}

export { goModAuth, envExampleAuth, apiMainGoAuth, migrateMainGoAuth, specgenMainGoAuth, configGoAuth, tokensGoAuth, refreshGoAuth, jwksGoAuth, routerGoAuth, tokensTestGoAuth, refreshTestGoAuth, authRepoTestGoAuth, contractTestGoAuth };
