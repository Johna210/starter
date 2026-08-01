// Materializer: apps/api templates for the Go-microservices shape 4
// (issue #15).
//
// In shape 4 apps/api is the MAIN api but NOT the auth owner: the
// example split (decision 10) moved auth/IAM to apps/api-auth — the
// sole minter (decision 11). This api holds only PUBLIC-key material:
// it fetches apps/api-auth's JWKS (served at /.well-known/jwks.json),
// caches it on a TTL, and verifies every request's signature locally
// against the cached key (the local-verify principle, decision 11).
// There is NO /verify introspection endpoint — verification never
// costs a network hop on the request path.
//
// The modular structure mirrors the Go-monolith (shape 3): a typed
// internal/items module mounted at /items behind the JWKS-verified
// Bearer gate. The auth shim (argon2id + RS256 + rotation) lives in
// apps/api-auth, not here.
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into apps/api for shape 4. Templates shared
// with the Go-monolith (items module, db, migrations) are imported
// from go-api.js; only the shape-4-specific files live here.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';
import {
  dbGo,
  dbTestpoolGo,
  itemsIndexGo,
  itemsItemGo,
  itemsRepoGo,
  itemsRepoPgGo,
  itemsRepoTestGo,
  itemsRoutesGo,
  migrateGo,
  migrationsItemsSql,
} from './go-api.js';

export async function writeGoApiMs(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'apps/api/go.mod'), goModMs());
  await writeFileRecursive(join(targetDir, 'apps/api/go.sum'), goSumMs());
  await writeFileRecursive(join(targetDir, 'apps/api/.env.example'), envExampleMs());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/api/main.go'), apiMainGoMs());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/migrate/main.go'), migrateMainGoMs());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/specgen/main.go'), specgenMainGoMs());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/config/config.go'), configGoMs());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/db.go'), dbGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/migrate.go'), migrateGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/testpool.go'), dbTestpoolGo());

  // The JWKS verifier — this service's only relationship to auth
  // (fetch -> cache on TTL -> verify locally).
  await writeFileRecursive(join(targetDir, 'apps/api/internal/jwks/jwks.go'), jwksGoMs());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/jwks/jwks_test.go'), jwksTestGoMs());

  // The demo domain — same module as the monolith (decision 13/27).
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/item.go'), itemsItemGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo.go'), itemsRepoGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo.pg.go'), itemsRepoPgGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.routes.go'), itemsRoutesGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/index.go'), itemsIndexGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo_test.go'), itemsRepoTestGo());

  await writeFileRecursive(join(targetDir, 'apps/api/internal/router/router.go'), routerGoMs());

  // This service owns the items table only; users + refresh_tokens
  // are apps/api-auth's (each service migrates its own tables).
  await writeFileRecursive(join(targetDir, 'apps/api/migrations/0000_items.sql'), migrationsItemsSql());

  await writeFileRecursive(join(targetDir, 'apps/api/contract_test.go'), contractTestGoMs());
}

function goModMs(): string {
  return `module starter/apps/api

go 1.25.0

require (
	github.com/danielgtaylor/huma/v2 v2.39.1
	github.com/gin-gonic/gin v1.12.0
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/jackc/pgx/v5 v5.10.0
	github.com/joho/godotenv v1.5.1
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
	golang.org/x/crypto v0.54.0 // indirect
	golang.org/x/net v0.57.0 // indirect
	golang.org/x/sync v0.22.0 // indirect
	golang.org/x/sys v0.47.0 // indirect
	golang.org/x/text v0.40.0 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)
`;
}

// goSumMs is the committed go.sum for apps/api (shape 4). Captured
// with `go mod tidy` against the dependency set in go.mod (this
// service dropped x/crypto — no argon2 here; that lives in
// apps/api-auth). Re-bake it when go.mod changes.
function goSumMs(): string {
  return `github.com/bytedance/gopkg v0.1.4 h1:oZnQwnX82KAIWb7033bEwtxvTqXcYMxDBaQxo5JJHWM=
github.com/bytedance/gopkg v0.1.4/go.mod h1:v1zWfPm21Fb+OsyXN2VAHdL6TBb2L88anLQgdyje6R4=
github.com/bytedance/sonic v1.15.2 h1:90H+rcF/FwLXwfB1cudOLq/je83n683Utf4Cbp0xHCo=
github.com/bytedance/sonic v1.15.2/go.mod h1:mT2NbXunuaEbnZ+mRIX/vYqKISmgEuHFDI4UzmKx2SA=
github.com/bytedance/sonic/loader v0.5.1 h1:Ygpfa9zwRCCKSlrp5bBP/b/Xzc3VxsAW+5NIYXrOOpI=
github.com/bytedance/sonic/loader v0.5.1/go.mod h1:AR4NYCk5DdzZizZ5djGqQ92eEhCCcdf5x77udYiSJRo=
github.com/cloudwego/base64x v0.1.7 h1:NppS+Fgzg5ovhn4NkUXaDT3x9jldgH5ToMCqzBSi2zI=
github.com/cloudwego/base64x v0.1.7/go.mod h1:Cu1PV9zfrSf7ET2tIbWbbEy7jO7HHJ13q4X2SQ8aWYg=
github.com/danielgtaylor/huma/v2 v2.39.1 h1:0kwF4ltQoYZ+IU55VPy+BcGekzgF44R64daTGde1H+g=
github.com/danielgtaylor/huma/v2 v2.39.1/go.mod h1:zcnQ38duIJ3VUHwFaBoZ6x8T+KN/mr33oyqxcj0HTug=
github.com/davecgh/go-spew v1.1.0/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/davecgh/go-spew v1.1.1 h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/fxamacker/cbor/v2 v2.9.2 h1:X4Ksno9+x3cz0TZv69ec1hxP/+tymuR8PXQJyDwfh78=
github.com/fxamacker/cbor/v2 v2.9.2/go.mod h1:vM4b+DJCtHn+zz7h3FFp/hDAI9WNWCsZj23V5ytsSxQ=
github.com/gabriel-vasile/mimetype v1.4.13 h1:46nXokslUBsAJE/wMsp5gtO500a4F3Nkz9Ufpk2AcUM=
github.com/gabriel-vasile/mimetype v1.4.13/go.mod h1:d+9Oxyo1wTzWdyVUPMmXFvp4F9tea18J8ufA774AB3s=
github.com/gin-contrib/sse v1.1.1 h1:uGYpNwTacv5R68bSGMapo62iLTRa9l5zxGCps4hK6ko=
github.com/gin-contrib/sse v1.1.1/go.mod h1:QXzuVkA0YO7o/gun03UI1Q+FTI8ZV/n5t03kIQAI89s=
github.com/gin-gonic/gin v1.12.0 h1:b3YAbrZtnf8N//yjKeU2+MQsh2mY5htkZidOM7O0wG8=
github.com/gin-gonic/gin v1.12.0/go.mod h1:VxccKfsSllpKshkBWgVgRniFFAzFb9csfngsqANjnLc=
github.com/go-chi/chi/v5 v5.3.1 h1:3j4HZLGZQ3JpMCrPJF/Jl3mYJfWLKBfNJ6quurUGCf8=
github.com/go-chi/chi/v5 v5.3.1/go.mod h1:R+tYY2hNuVUUjxoPtqUdgBqevM9s9njzkTLutVsOCto=
github.com/go-playground/assert/v2 v2.2.0 h1:JvknZsQTYeFEAhQwI4qEt9cyV5ONwRHC+lYKSsYSR8s=
github.com/go-playground/assert/v2 v2.2.0/go.mod h1:VDjEfimB/XKnb+ZQfWdccd7VUvScMdVu0Titje2rxJ4=
github.com/go-playground/locales v0.14.1 h1:EWaQ/wswjilfKLTECiXz7Rh+3BjFhfDFKv/oXslEjJA=
github.com/go-playground/locales v0.14.1/go.mod h1:hxrqLVvrK65+Rwrd5Fc6F2O76J/NuW9t0sjnWqG1slY=
github.com/go-playground/universal-translator v0.18.1 h1:Bcnm0ZwsGyWbCzImXv+pAJnYK9S473LQFuzCbDbfSFY=
github.com/go-playground/universal-translator v0.18.1/go.mod h1:xekY+UJKNuX9WP91TpwSH2VMlDf28Uj24BCp08ZFTUY=
github.com/go-playground/validator/v10 v10.30.3 h1:4MU6YkEwx7GbcPJOZxrtbu+QfF3pJLJuaYTeAH0DYy8=
github.com/go-playground/validator/v10 v10.30.3/go.mod h1:4Axh7oCNGcoGkqLoE4YWt6n20mcEIsPRlB7vPk3lpyc=
github.com/goccy/go-json v0.10.6 h1:p8HrPJzOakx/mn/bQtjgNjdTcN+/S6FcG2CTtQOrHVU=
github.com/goccy/go-json v0.10.6/go.mod h1:oq7eo15ShAhp70Anwd5lgX2pLfOS3QCiwU/PULtXL6M=
github.com/goccy/go-yaml v1.19.2 h1:PmFC1S6h8ljIz6gMRBopkjP1TVT7xuwrButHID66PoM=
github.com/goccy/go-yaml v1.19.2/go.mod h1:XBurs7gK8ATbW4ZPGKgcbrY1Br56PdM69F7LkFRi1kA=
github.com/golang-jwt/jwt/v5 v5.3.1 h1:kYf81DTWFe7t+1VvL7eS+jKFVWaUnK9cB1qbwn63YCY=
github.com/golang-jwt/jwt/v5 v5.3.1/go.mod h1:fxCRLWMO43lRc8nhHWY6LGqRcf+1gQWArsqaEUEa5bE=
github.com/google/go-cmp v0.7.0 h1:wk8382ETsv4JYUZwIsn6YpYiWiBsYLSJiTsyBybVuN8=
github.com/google/go-cmp v0.7.0/go.mod h1:pXiqmnSA92OHEEa9HXL2W4E7lf9JzCmGVUdgjX3N/iU=
github.com/google/gofuzz v1.0.0/go.mod h1:dBl0BpW6vV/+mYPU4Po3pmUjxk6FQPldtuIdl/M65Eg=
github.com/google/uuid v1.6.0 h1:NIvaJDMOsjHA8n1jAhLSgzrAzy1Hgr+hNrb57e+94F0=
github.com/google/uuid v1.6.0/go.mod h1:TIyPZe4MgqvfeYDBFedMoGGpEw/LqOeaOT+nhxU+yHo=
github.com/jackc/pgpassfile v1.0.0 h1:/6Hmqy13Ss2zCq62VdNG8tM1wchn8zjSGOBJ6icpsIM=
github.com/jackc/pgpassfile v1.0.0/go.mod h1:CEx0iS5ambNFdcRtxPj5JhEz+xB6uRky5eyVu/W2HEg=
github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 h1:iCEnooe7UlwOQYpKFhBabPMi4aNAfoODPEFNiAnClxo=
github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761/go.mod h1:5TJZWKEWniPve33vlWYSoGYefn3gLQRzjfDlhSJ9ZKM=
github.com/jackc/pgx/v5 v5.10.0 h1:VhSvgU2jSli8o3AqIEOTJr7rZwAEUVo4E4XhR94Zfr0=
github.com/jackc/pgx/v5 v5.10.0/go.mod h1:mal1tBGAFfLHvZzaYh77YS/eC6IX9OWbRV1QIIM0Jn4=
github.com/jackc/puddle/v2 v2.2.2 h1:PR8nw+E/1w0GLuRFSmiioY6UooMp6KJv0/61nB7icHo=
github.com/jackc/puddle/v2 v2.2.2/go.mod h1:vriiEXHvEE654aYKXXjOvZM39qJ0q+azkZFrfEOc3H4=
github.com/joho/godotenv v1.5.1 h1:7eLL/+HRGLY0ldzfGMeQkb7vMd0as4CfYvUVzLqw0N0=
github.com/joho/godotenv v1.5.1/go.mod h1:f4LDr5Voq0i2e/R5DDNOoa2zzDfwtkZa6DnEwAbqwq4=
github.com/json-iterator/go v1.1.12 h1:PV8peI4a0ysnczrg+LtxykD8LfKY9ML6u2jnxaEnrnM=
github.com/json-iterator/go v1.1.12/go.mod h1:e30LSqwooZae/UwlEbR2852Gd8hjQvJoHmT4TnhNGBo=
github.com/klauspost/cpuid/v2 v2.4.0 h1:S6Hrbc7+ywsr0r+RLapfGBHfyefhCTwEh3A0tV913Dw=
github.com/klauspost/cpuid/v2 v2.4.0/go.mod h1:19jmZ9mjzoF//ddRSUsv0zfBTJWh3QJh9FNxZTMrGxU=
github.com/kr/pretty v0.3.1 h1:flRD4NNwYAUpkphVc1HcthR4KEIFJ65n8Mw5qdRn3LE=
github.com/kr/pretty v0.3.1/go.mod h1:hoEshYVHaxMs3cyo3Yncou5ZscifuDolrwPKZanG3xk=
github.com/kr/text v0.2.0 h1:5Nx0Ya0ZqY2ygV366QzturHI13Jq95ApcVaJBhpS+AY=
github.com/kr/text v0.2.0/go.mod h1:eLer722TekiGuMkidMxC/pM04lWEeraHUUmBw8l2grE=
github.com/leodido/go-urn v1.4.0 h1:WT9HwE9SGECu3lg4d/dIA+jxlljEa1/ffXKmRjqdmIQ=
github.com/leodido/go-urn v1.4.0/go.mod h1:bvxc+MVxLKB4z00jd1z+Dvzr47oO32F/QSNjSBOlFxI=
github.com/mattn/go-isatty v0.0.23 h1:cYwCQTQf3HB6xUC+BtyCLZNr7IzbOmoZbmssVNzSyiQ=
github.com/mattn/go-isatty v0.0.23/go.mod h1:nMCL3Zebbrt45jsMDgnfIwz6ydEQApk5oEI3HqDio6A=
github.com/modern-go/concurrent v0.0.0-20180228061459-e0a39a4cb421/go.mod h1:6dJC0mAP4ikYIbvyc7fijjWJddQyLn8Ig3JB5CqoB9Q=
github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd h1:TRLaZ9cD/w8PVh93nsPXa1VrQ6jlwL5oN8l14QlcNfg=
github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd/go.mod h1:6dJC0mAP4ikYIbvyc7fijjWJddQyLn8Ig3JB5CqoB9Q=
github.com/modern-go/reflect2 v1.0.2 h1:xBagoLtFs94CBntxluKeaWgTMpvLxC4ur3nMaC9Gz0M=
github.com/modern-go/reflect2 v1.0.2/go.mod h1:yWuevngMOJpCy52FWWMvUC8ws7m/LJsjYzDa0/r8luk=
github.com/pelletier/go-toml/v2 v2.4.3 h1:GTRvJQutkOSftxIFD5xw9aepkYNuPWmVJpffdDPYVpY=
github.com/pelletier/go-toml/v2 v2.4.3/go.mod h1:2gIqNv+qfxSVS7cM2xJQKtLSTLUE9V8t9Stt+h56mCY=
github.com/pmezard/go-difflib v1.0.0 h1:4DBwDE0NGyQoBHbLQYPwSUPoCMWR5BEzIk/f1lZbAQM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/quic-go/go-ossfuzz-seeds v0.1.0 h1:APacT+iIaNF6fd8AGEiN3bT/Jtkd2jz4v4TzM7MFjy0=
github.com/quic-go/go-ossfuzz-seeds v0.1.0/go.mod h1:3IOHRbJIc+L6YKMwfDtJAM9Vj9k0YY4muhuyUYk5tbk=
github.com/quic-go/qpack v0.6.0 h1:g7W+BMYynC1LbYLSqRt8PBg5Tgwxn214ZZR34VIOjz8=
github.com/quic-go/qpack v0.6.0/go.mod h1:lUpLKChi8njB4ty2bFLX2x4gzDqXwUpaO1DP9qMDZII=
github.com/quic-go/quic-go v0.60.0 h1:xcQioE8OM66UQLeUMHltK1CCcOu3JbVB4JAQdDQSB+0=
github.com/quic-go/quic-go v0.60.0/go.mod h1:wpKpjmPpftl30sL6pFh7REVpjbcCVy4zt2vDyK1TuJk=
github.com/rogpeppe/go-internal v1.14.1 h1:UQB4HGPB6osV0SQTLymcB4TgvyWu6ZyliaW0tI/otEQ=
github.com/rogpeppe/go-internal v1.14.1/go.mod h1:MaRKkUm5W0goXpeCfT7UZI6fk/L7L7so1lCWt35ZSgc=
github.com/stretchr/objx v0.1.0/go.mod h1:HFkY916IF+rwdDfMAkV7OtwuqBVzrE8GR6GFx+wExME=
github.com/stretchr/objx v0.4.0/go.mod h1:YvHI0jy2hoMjB+UWwv71VJQ9isScKT/TqJzVSSt89Yw=
github.com/stretchr/objx v0.5.0/go.mod h1:Yh+to48EsGEfYuaHDzXPcE3xhTkx73EhmCGUpEOglKo=
github.com/stretchr/objx v0.5.2/go.mod h1:FRsXN1f5AsAjCGJKqEizvkpNtU+EGNCLh3NxZ/8L+MA=
github.com/stretchr/testify v1.3.0/go.mod h1:M5WIy9Dh21IEIfnGCwXGc5bZfKNJtfHm1UVUgZn+9EI=
github.com/stretchr/testify v1.7.0/go.mod h1:6Fq8oRcR53rry900zMqJjRRixrwX3KX962/h/Wwjteg=
github.com/stretchr/testify v1.7.1/go.mod h1:6Fq8oRcR53rry900zMqJjRRixrwX3KX962/h/Wwjteg=
github.com/stretchr/testify v1.8.0/go.mod h1:yNjHg4UonilssWZ8iaSj1OCr/vHnekPRkoO+kdMU+MU=
github.com/stretchr/testify v1.8.4/go.mod h1:sz/lmYIOXD/1dqDmKjjqLyZ2RngseejIcXlSw2iwfAo=
github.com/stretchr/testify v1.10.0/go.mod h1:r2ic/lqez/lEtzL7wO/rwa5dbSLXVDPFyf8C91i36aY=
github.com/stretchr/testify v1.11.1 h1:7s2iGBzp5EwR7/aIZr8ao5+dra3wiQyKjjFuvgVKu7U=
github.com/stretchr/testify v1.11.1/go.mod h1:wZwfW3scLgRK+23gO65QZefKpKQRnfz6sD981Nm4B6U=
github.com/twitchyliquid64/golang-asm v0.15.1 h1:SU5vSMR7hnwNxj24w34ZyCi/FmDZTkS4MhqMhdFk5YI=
github.com/twitchyliquid64/golang-asm v0.15.1/go.mod h1:a1lVb/DtPvCB8fslRZhAngC2+aY1QWCk3Cedj/Gdt08=
github.com/ugorji/go/codec v1.3.1 h1:waO7eEiFDwidsBN6agj1vJQ4AG7lh2yqXyOXqhgQuyY=
github.com/ugorji/go/codec v1.3.1/go.mod h1:pRBVtBSKl77K30Bv8R2P+cLSGaTtex6fsA2Wjqmfxj4=
github.com/x448/float16 v0.8.4 h1:qLwI1I70+NjRFUR3zs1JPUCgaCXSh3SW62uAKT1mSBM=
github.com/x448/float16 v0.8.4/go.mod h1:14CWIYCyZA/cWjXOioeEpHeN/83MdbZDRQHoFcYsOfg=
go.mongodb.org/mongo-driver/v2 v2.8.0 h1:CxWDGQYY8QQwNjAl/aq2sfWakdnWZynnqJ9F4DhHbP8=
go.mongodb.org/mongo-driver/v2 v2.8.0/go.mod h1:yOI9kBsufol30iFsl1slpdq1I0eHPzybRWdyYUs8K/0=
go.uber.org/mock v0.6.0 h1:hyF9dfmbgIX5EfOdasqLsWD6xqpNZlXblLB/Dbnwv3Y=
go.uber.org/mock v0.6.0/go.mod h1:KiVJ4BqZJaMj4svdfmHM0AUx4NJYO8ZNpPnZn1Z+BBU=
golang.org/x/arch v0.29.0 h1:8sSET5wB0+exBm0FGmOtdHMqjlRdV2DRD3/IV6OZgho=
golang.org/x/arch v0.29.0/go.mod h1:0X+GdSIP+kL5wPmpK7sdkEVTt2XoYP0cSjQSbZBwOi8=
golang.org/x/crypto v0.54.0 h1:YLIA59K4fiNzHzjnZt2tUJQjQtUWfWbeHBqKtk3eScw=
golang.org/x/crypto v0.54.0/go.mod h1:KWL8ny2AZdGR2cWmzeHrp2azQPGogOv+HeQaVEXC2dk=
golang.org/x/net v0.57.0 h1:K5+3DljvIuDG9/Jv9rvyMywYNFCQ9RSUY6OOTTkT+tE=
golang.org/x/net v0.57.0/go.mod h1:KpXc8iv+r3XplLAG/f7Jsf9RPszJzdR0f58q9vGOuEU=
golang.org/x/sync v0.22.0 h1:SZjpbeLmrCk4xhRSZFNZW5gFUeCeFgjekvI/+gfScek=
golang.org/x/sync v0.22.0/go.mod h1:9xrNwdLfx4jkKbNva9FpL6vEN7evnE43NNNJQ2LF3+0=
golang.org/x/sys v0.47.0 h1:o7XGOvZQCADBQQ4Y7VNq2dRWQR7JmOUW8Kxx4ZsNgWs=
golang.org/x/sys v0.47.0/go.mod h1:4GL1E5IUh+htKOUEOaiffhrAeqysfVGipDYzABqnCmw=
golang.org/x/text v0.40.0 h1:Ub2Z6/xjgF1WrYQz2nuITOEegKFtiIy+rieRJ5lHZKs=
golang.org/x/text v0.40.0/go.mod h1:hpnzDAfGV753zIKo+wk3u1bVKCGPbrnF7+7LBF/UHVY=
google.golang.org/protobuf v1.36.11 h1:fV6ZwhNocDyBLK0dj+fg8ektcVegBBuEolpbTQyBNVE=
google.golang.org/protobuf v1.36.11/go.mod h1:HTf+CrKn2C3g5S8VImy6tdcUvCska2kB7j23XfzDpco=
gopkg.in/check.v1 v0.0.0-20161208181325-20d25e280405/go.mod h1:Co6ibVJAznAaIkqp8huTwlJQCZ016jof/cbN4VW5Yz0=
gopkg.in/check.v1 v1.0.0-20201130134442-10cb98267c6c h1:Hei/4ADfdWqJk1ZMxUNpqntNwaWcugrBjAiHlqqRiVk=
gopkg.in/check.v1 v1.0.0-20201130134442-10cb98267c6c/go.mod h1:JHkPIbrfpd72SG/EVd6muEfDQjcINNoR0C8j2r3qZ4Q=
gopkg.in/yaml.v3 v3.0.0-20200313102051-9f266ea9e77c/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
gopkg.in/yaml.v3 v3.0.1 h1:fxVm/GzAzEWqLHuvctI91KS9hhNmmWOoWu0XTYJS7CA=
gopkg.in/yaml.v3 v3.0.1/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
`;
}

function envExampleMs(): string {
  return `# apps/api — env surface (decision 28). Copy to .env for dev; prod
# injects real env vars. Code reads these only through internal/config.
#
# Shape 4 (Go-microservices): apps/api is NOT a minter (decision 11) —
# it holds no signing key. It fetches apps/api-auth's JWKS from
# API_AUTH_URL, caches it for JWKS_CACHE_TTL seconds, and verifies
# every request's signature locally against the cached key.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
# Base URL of apps/api-auth (the sole minter). Defaults to :3001.
API_AUTH_URL=http://localhost:3001
# How long the fetched JWKS is trusted before a re-fetch (seconds).
JWKS_CACHE_TTL=300
PORT=3000
`;
}

function apiMainGoMs(): string {
  return `// cmd/api — the main api's entrypoint. Boots the gin engine on the
// configured port (default 3000). \`task dev:api\` runs this.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"starter/apps/api/internal/config"
	"starter/apps/api/internal/db"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/jwks"
	"starter/apps/api/internal/router"
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

	// The only auth this service does: fetch apps/api-auth's JWKS,
	// cache it, verify locally (decision 11's local-verify principle).
	// No signing key, no /verify introspection.
	verifier := jwks.NewVerifier(cfg.APIAuthURL, cfg.JWKSCacheTTL)

	engine, _ := router.New(router.Deps{
		Config:    cfg,
		ItemsRepo: items.NewPGItemsRepo(pool),
		Verifier:  verifier,
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	go func() {
		log.Printf("api listening on http://localhost:%s (openapi: /openapi.json)", cfg.Port)
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

function migrateMainGoMs(): string {
  return `// cmd/migrate — the main api's migration runner. Applies every
// migrations/*.sql file in order (the items table — this service's
// own), tracking applied versions in schema_migrations. \`task migrate\`
// runs this (and apps/api-auth's runner for users + refresh_tokens).
package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"

	"starter/apps/api/internal/config"
	"starter/apps/api/internal/db"
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

function specgenMainGoMs(): string {
  return `// cmd/specgen — regenerates packages/contract/openapi.api.yaml from the
// main api's Go structs (decision 19: Go is the canonical side). The
// generated file is committed; the merge script folds it together with
// apps/api-auth's openapi.auth.yaml into packages/contract/openapi.yaml.
// \`task contract:generate\` runs this and then the merge + client
// regeneration.
//
// Usage: go run ./cmd/specgen [output-path]
//
// The default output path assumes apps/api is the cwd (as Taskfile's
// contract:generate does).
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

	"starter/apps/api/internal/config"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/jwks"
	"starter/apps/api/internal/router"
)

func main() {
	out := "../../packages/contract/openapi.api.yaml"
	if len(os.Args) > 1 {
		out = os.Args[1]
	}

	// Specgen only walks route registration — no DB access and no
	// JWKS fetch happens (the verifier fetches lazily at Verify time).
	engine, _ := router.New(router.Deps{
		Config: config.Config{
			APIAuthURL:  "http://localhost:3001",
			JWKSCacheTTL: 5 * time.Minute,
		},
		ItemsRepo: itemsRepoStub{},
		Verifier:  jwks.NewVerifier("http://localhost:3001", 5*time.Minute),
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

// itemsRepoStub satisfies ItemsRepo for spec generation (never called).
type itemsRepoStub struct{}

func (itemsRepoStub) List(context.Context) ([]items.Item, error)         { return nil, nil }
func (itemsRepoStub) Create(context.Context, string) (items.Item, error) { return items.Item{}, nil }
`;
}

function configGoMs(): string {
  return `// Package config implements the typed config for the main api
// (decision 28): parsed from the environment, fail-fast at startup.
// Dev loads vars via .env + godotenv (see cmd/api); prod uses real
// env vars injected by the deploy platform.
//
// Shape 4 (Go-microservices): this service holds NO signing key (the
// sole-minter invariant, decision 11) — it only knows where to fetch
// apps/api-auth's JWKS from and how long to cache it.
package config

import (
	"fmt"
	"os"
	"time"
)

// Config holds every env var the api reads.
type Config struct {
	// DatabaseURL is the Postgres connection string (pgx format).
	DatabaseURL string
	// APIAuthURL is the base URL of apps/api-auth — the source of the
	// JWKS this service fetches and caches (decision 11).
	APIAuthURL string
	// JWKSCacheTTL is how long the fetched JWKS is trusted before the
	// next request re-fetches it (the local-verify cache, decision 11).
	JWKSCacheTTL time.Duration
	// Port the api listens on.
	Port string
}

// Load parses the environment into a Config. Missing or invalid values
// are fatal — the same fail-fast contract as zod's config.ts.
func Load() (Config, error) {
	ttl, err := envDuration("JWKS_CACHE_TTL", 5*time.Minute)
	if err != nil {
		return Config{}, err
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	apiAuthURL := os.Getenv("API_AUTH_URL")
	if apiAuthURL == "" {
		apiAuthURL = "http://localhost:3001"
	}

	cfg := Config{
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		APIAuthURL:   apiAuthURL,
		JWKSCacheTTL: ttl,
		Port:         port,
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL is required (set it in apps/api/.env or the environment)")
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

function jwksGoMs(): string {
  return `// Package jwks is the main api's relationship to auth in shape 4
// (Go-microservices, decision 11): it FETCHES apps/api-auth's JSON Web
// Key Set (the public half of the signing key, served at
// /.well-known/jwks.json), CACHES it on a TTL, and VERIFIES every
// request's signature locally against the cached key — the
// local-verify principle. The private half NEVER lives here: this
// service holds only public-key material (the sole-minter invariant).
// There is no /verify introspection — verification never costs a
// network hop on the request path.
package jwks

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWK mirrors the RFC 7517 key shape served by apps/api-auth.
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

// TokenKind mirrors the token kinds minted by apps/api-auth: a refresh
// token must never be accepted as a Bearer access token.
type TokenKind string

const (
	TokenKindAccess  TokenKind = "access"
	TokenKindRefresh TokenKind = "refresh"
)

// Claims is the subset of the minted JWT payload the api verifies.
type Claims struct {
	Kind TokenKind \`json:"kind"\`
	JTI  string    \`json:"jti,omitempty"\`
	jwt.RegisteredClaims
}

// InvalidTokenError is returned by VerifyAccessToken on any failure.
type InvalidTokenError struct{ msg string }

func (e *InvalidTokenError) Error() string { return e.msg }

// Verifier fetches + caches the JWKS and verifies access tokens
// locally (the local-verify principle, decision 11).
type Verifier struct {
	mu         sync.Mutex
	apiAuthURL string
	ttl        time.Duration
	client     *http.Client
	cached     *JWKSDocument
	fetchedAt  time.Time
}

// NewVerifier wires a verifier to the auth service's base URL.
func NewVerifier(apiAuthURL string, ttl time.Duration) *Verifier {
	return &Verifier{
		apiAuthURL: strings.TrimSuffix(apiAuthURL, "/"),
		ttl:        ttl,
		client:     &http.Client{Timeout: 5 * time.Second},
	}
}

// document returns the cached JWKS, fetching it when stale. On a fetch
// failure the api fails closed — a stale cache is never trusted, and
// the failure is bounded by the cache TTL, not by per-request hops.
func (v *Verifier) document(ctx context.Context) (*JWKSDocument, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.cached != nil && time.Since(v.fetchedAt) < v.ttl {
		return v.cached, nil
	}
	doc, err := v.fetch(ctx)
	if err != nil {
		return nil, err
	}
	v.cached = doc
	v.fetchedAt = time.Now()
	return doc, nil
}

func (v *Verifier) fetch(ctx context.Context) (*JWKSDocument, error) {
	url := v.apiAuthURL + "/.well-known/jwks.json"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("jwks: build request: %w", err)
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("jwks: fetch %s: %w", url, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jwks: fetch %s -> %d", url, resp.StatusCode)
	}
	var doc JWKSDocument
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, fmt.Errorf("jwks: decode %s: %w", url, err)
	}
	if len(doc.Keys) == 0 {
		return nil, fmt.Errorf("jwks: %s returned an empty key set", url)
	}
	return &doc, nil
}

// publicKey converts a JWK to an *rsa.PublicKey.
func (k JWK) publicKey() (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("jwks: decode modulus: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("jwks: decode exponent: %w", err)
	}
	e := 0
	for _, b := range eBytes {
		e = e<<8 | int(b)
	}
	if e == 0 {
		return nil, fmt.Errorf("jwks: invalid exponent")
	}
	return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
}

// VerifyAccessToken verifies a Bearer access token against the cached
// JWKS. The signature, expiry, algorithm, and kind are all checked
// locally; a refresh token is never accepted as an access token.
func (v *Verifier) VerifyAccessToken(ctx context.Context, tokenString string) (*Claims, error) {
	doc, err := v.document(ctx)
	if err != nil {
		return nil, &InvalidTokenError{msg: err.Error()}
	}
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodRS256 {
			return nil, fmt.Errorf("jwks: unexpected signing method %v", t.Method)
		}
		kid, _ := t.Header["kid"].(string)
		for _, k := range doc.Keys {
			if k.Kid == kid {
				return k.publicKey()
			}
		}
		return nil, fmt.Errorf("jwks: no key with kid %q in the cached set", kid)
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil {
		return nil, &InvalidTokenError{msg: err.Error()}
	}
	if !token.Valid {
		return nil, &InvalidTokenError{msg: "jwks: invalid token"}
	}
	if claims.Kind != TokenKindAccess {
		return nil, &InvalidTokenError{msg: "jwks: not an access token"}
	}
	return claims, nil
}

// RequireAuth returns a huma middleware that requires a valid Bearer
// access token on every operation of the group it guards. Refresh
// tokens are rejected (a refresh token is never a valid access token).
func RequireAuth(api huma.API, verifier *Verifier) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		header := ctx.Header("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			_ = huma.WriteErr(api, ctx, http.StatusUnauthorized, "unauthorized")
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := verifier.VerifyAccessToken(ctx.Context(), token)
		if err != nil {
			_ = huma.WriteErr(api, ctx, http.StatusUnauthorized, "unauthorized")
			return
		}
		// The principal is available to handlers via the context.
		next(huma.WithContext(ctx, context.WithValue(ctx.Context(), claimsKey{}, claims.Subject)))
	}
}

// CurrentUserID returns the authenticated user id set by RequireAuth.
// Returns "" when the caller is unauthenticated.
func CurrentUserID(ctx context.Context) string {
	if id, ok := ctx.Value(claimsKey{}).(string); ok {
		return id
	}
	return ""
}

type claimsKey struct{}
`;
}

function jwksTestGoMs(): string {
  return `// jwks.test.go — unit tests for the local-verify mechanism (decision
// 11): fetch apps/api-auth's JWKS, cache on a TTL, verify locally. A
// stub HTTP server plays apps/api-auth's /.well-known/jwks.json; no
// Postgres needed, so these run everywhere.
package jwks

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// testKey generates a fresh RSA key (same size api-auth uses).
func testKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return priv
}

// kidFor derives the kid exactly as apps/api-auth's jwks package does
// (SHA-256 of the PKCS#1 DER, first 16 bytes, base64url) — the
// fingerprint the two services agree on with no out-of-band info.
func kidFor(pub *rsa.PublicKey) string {
	sum := sha256.Sum256(x509.MarshalPKCS1PublicKey(pub))
	return base64.RawURLEncoding.EncodeToString(sum[:16])
}

// jwksBody serializes a public key as the RFC 7517 document api-auth
// serves at /.well-known/jwks.json.
func jwksBody(pub *rsa.PublicKey, kid string) string {
	doc := JWKSDocument{Keys: []JWK{
		{
			Kty: "RSA",
			Kid: kid,
			Use: "sig",
			Alg: "RS256",
			N:   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
			E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes()),
		},
	}}
	raw, _ := json.Marshal(doc)
	return string(raw)
}

// signToken mints an RS256 token the way apps/api-auth would, with the
// kid header the verifier uses to pick the key.
func signToken(t *testing.T, priv *rsa.PrivateKey, kid, kind, sub string, ttl time.Duration) string {
	t.Helper()
	claims := Claims{
		Kind: TokenKind(kind),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   sub,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = kid
	signed, err := tok.SignedString(priv)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

func stubJWKS(t *testing.T, body string, hits *int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		*hits++
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, body)
	}))
}

func TestVerifyAccessTokenRoundTrip(t *testing.T) {
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	claims, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, kid, "access", "user-1", time.Minute))
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != "user-1" {
		t.Errorf("sub = %q, want user-1", claims.Subject)
	}
}

func TestVerifyWrongKey(t *testing.T) {
	priv := testKey(t)
	other := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	// Signed by a DIFFERENT key than the JWKS serves.
	token := signToken(t, other, kidFor(&other.PublicKey), "access", "user-1", time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), token); err == nil {
		t.Fatal("verify with a key not in the JWKS should fail")
	}
}

func TestVerifyExpiredToken(t *testing.T) {
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, kid, "access", "user-1", -time.Minute)); err == nil {
		t.Fatal("verify of an expired token should fail")
	}
}

func TestVerifyRejectsRefreshToken(t *testing.T) {
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, kid, "refresh", "user-1", time.Minute)); err == nil {
		t.Fatal("a refresh token must never verify as an access token")
	}
}

func TestVerifyUnknownKid(t *testing.T) {
	priv := testKey(t)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, "some-other-kid"), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, "mismatched-kid", "access", "user-1", time.Minute)); err == nil {
		t.Fatal("verify with an unknown kid should fail")
	}
}

func TestCacheAvoidsRefetchWithinTTL(t *testing.T) {
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	token := signToken(t, priv, kid, "access", "user-1", time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), token); err != nil {
		t.Fatalf("first verify: %v", err)
	}
	if _, err := v.VerifyAccessToken(context.Background(), token); err != nil {
		t.Fatalf("second verify: %v", err)
	}
	if hits != 1 {
		t.Errorf("expected one JWKS fetch (cached), got %d", hits)
	}
}

func TestCacheRefetchesAfterTTL(t *testing.T) {
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	hits := 0
	srv := stubJWKS(t, jwksBody(&priv.PublicKey, kid), &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, 20*time.Millisecond)
	token := signToken(t, priv, kid, "access", "user-1", time.Minute)
	if _, err := v.VerifyAccessToken(context.Background(), token); err != nil {
		t.Fatalf("first verify: %v", err)
	}
	time.Sleep(40 * time.Millisecond)
	if _, err := v.VerifyAccessToken(context.Background(), token); err != nil {
		t.Fatalf("second verify: %v", err)
	}
	if hits != 2 {
		t.Errorf("expected a re-fetch after the TTL expired, got %d hits", hits)
	}
}

func TestFetchFailureFailsClosed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	if _, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, kid, "access", "user-1", time.Minute)); err == nil {
		t.Fatal("verify must fail closed when the JWKS fetch fails")
	}
}

func TestEmptyKeySetFailsClosed(t *testing.T) {
	hits := 0
	srv := stubJWKS(t, \`{"keys": []}\`, &hits)
	defer srv.Close()

	v := NewVerifier(srv.URL, time.Minute)
	priv := testKey(t)
	kid := kidFor(&priv.PublicKey)
	if _, err := v.VerifyAccessToken(context.Background(), signToken(t, priv, kid, "access", "user-1", time.Minute)); err == nil {
		t.Fatal("verify must fail closed on an empty key set")
	}
}
`;
}

function routerGoMs(): string {
  return `// Package router assembles the main api: the gin engine, the one huma
// API (which owns the OpenAPI document — Go is the canonical side,
// decision 19), and the modules:
//   - /items — the demo domain (decision 13), behind the JWKS-verified
//     Bearer gate (decision 11)
//
// The example split (decision 10) moved auth to apps/api-auth: this
// router mounts no /auth surface and holds no signing key.
package router

import (
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"

	"starter/apps/api/internal/config"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/jwks"
)

// Deps are the module seams the router composes.
type Deps struct {
	Config    config.Config
	ItemsRepo items.ItemsRepo
	Verifier  *jwks.Verifier
}

// New assembles and returns the gin engine. The api is bound to the
// engine; its OpenAPI document is served live at /openapi.json|yaml and
// committed at packages/contract/openapi.api.yaml (see cmd/specgen).
func New(deps Deps) (*gin.Engine, huma.API) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	api := humagin.New(r, humaDefaultConfig())

	// The Bearer gate is JWKS-verified (decision 11): this service
	// holds only public-key material and verifies locally against the
	// fetched-and-cached JWKS — no /verify introspection.
	requireAuth := jwks.RequireAuth(api, deps.Verifier)
	items.NewItemsModule(api, deps.ItemsRepo, requireAuth)

	// Register the bearer security scheme so the spec documents the
	// auth gate on protected operations (decision 13).
	if api.OpenAPI().Components.SecuritySchemes == nil {
		api.OpenAPI().Components.SecuritySchemes = map[string]*huma.SecurityScheme{}
	}
	api.OpenAPI().Components.SecuritySchemes["bearerAuth"] = &huma.SecurityScheme{
		Type:         "http",
		Scheme:       "bearer",
		BearerFormat: "JWT",
		Description:  "A short-lived access token (decision 16), minted by apps/api-auth (the sole minter, decision 11); verified locally against its fetched-and-cached JWKS.",
	}

	return r, api
}

func humaDefaultConfig() huma.Config {
	c := huma.DefaultConfig("Starter API", "0.1.0")
	c.OpenAPI.Info.Description = "The scaffolded Go api: items demo behind a JWKS-verified Bearer gate (decision 13/11). Auth lives on apps/api-auth (the sole minter)."
	return c
}
`;
}

function contractTestGoMs(): string {
  return `// contract_test.go — contract tests for the main api (shape 4,
// decision 22/19): validate the committed packages/contract/openapi.api.yaml
// against the running server, schema-checking each route.
//
// Two levels, matching the Go-as-canonical-side rule (decision 19):
//
//  1. The committed api spec must equal the live spec the server
//     serves. If the Go structs drift from the committed file, this
//     fails — the "regenerate from Go and commit" contract.
//  2. Each route in the committed spec must behave per its schema:
//     /items answers 401 without a Bearer token and 2xx with a token
//     whose signature verifies against the service's JWKS — exercised
//     here against a stub JWKS server that plays apps/api-auth's
//     /.well-known/jwks.json (the real api-auth -> api composition is
//     the one E2E's job). Every response body's keys are checked
//     against the response schema declared in the committed spec.
//
// The behavioral level needs a real Postgres (the items repo runs
// against one); it skips cleanly when DATABASE_URL is unset.
package api_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"gopkg.in/yaml.v3"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"starter/apps/api/internal/config"
	"starter/apps/api/internal/db"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/jwks"
	"starter/apps/api/internal/router"
)

const committedSpecPath = "../../packages/contract/openapi.api.yaml"

// ---- spec loading -------------------------------------------------------

func loadCommittedSpec(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile(committedSpecPath)
	if err != nil {
		t.Fatalf("read committed openapi.api.yaml: %v — run \`task contract:generate\` and commit it (decision 19)", err)
	}
	var doc map[string]any
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse committed openapi.api.yaml: %v", err)
	}
	// Normalize through JSON so numbers are float64, exactly as the
	// live spec parse produces (yaml.v3 gives int, json float64).
	normalized, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("normalize committed openapi.api.yaml: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(normalized, &out); err != nil {
		t.Fatalf("normalize committed openapi.api.yaml: %v", err)
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
	engine, _ := router.New(testDeps(t, nil, jwks.NewVerifier("http://localhost:3001", time.Minute)))
	committed := loadCommittedSpec(t)
	live := liveSpec(t, engine)

	// The committed file is the generated document: Go structs -> Huma
	// -> both files. If this fails, run \`task contract:generate\` and
	// commit the diff (decision 19).
	if !reflect.DeepEqual(committed, live) {
		cd, _ := json.MarshalIndent(committed, "", "  ")
		ld, _ := json.MarshalIndent(live, "", "  ")
		t.Fatalf("committed openapi.api.yaml differs from the live spec.\\ncommitted:\\n%s\\n\\nlive:\\n%s", cd, ld)
	}
}

func TestCommittedSpecDocumentsTheRoutes(t *testing.T) {
	committed := loadCommittedSpec(t)
	paths, ok := committed["paths"].(map[string]any)
	if !ok {
		t.Fatalf("spec has no paths: %v", committed["paths"])
	}
	// Decision 13 (items demo). The auth surface is apps/api-auth's —
	// it must NOT appear in this spec (the example split, decision 10).
	for _, p := range []string{"/items"} {
		if _, ok := paths[p]; !ok {
			t.Errorf("committed api spec is missing path %s", p)
		}
	}
	for _, p := range []string{"/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/.well-known/jwks.json"} {
		if _, ok := paths[p]; ok {
			t.Errorf("committed api spec must not contain %s (that surface is apps/api-auth's)", p)
		}
	}
	// The protected /items operations declare the bearer security
	// requirement (the spec honestly documents the gate, decision 13).
	itemsPath := paths["/items"].(map[string]any)
	for _, m := range []string{"get", "post"} {
		op, _ := itemsPath[m].(map[string]any)
		if op == nil {
			t.Errorf("/items has no %s operation", m)
			continue
		}
		if _, ok := op["security"]; !ok {
			t.Errorf("/items %s does not declare the bearer security requirement", m)
		}
	}
	comps := committed["components"].(map[string]any)
	schemes, _ := comps["securitySchemes"].(map[string]any)
	if schemes == nil || schemes["bearerAuth"] == nil {
		t.Error("spec does not declare the bearerAuth security scheme")
	}
}

// ---- DB level: routes behave per the committed spec ---------------------

// testKey generates the RSA key that plays apps/api-auth's private key.
func testKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return priv
}

// kidFor derives the kid exactly as apps/api-auth's jwks package does.
func kidFor(pub *rsa.PublicKey) string {
	sum := sha256.Sum256(x509.MarshalPKCS1PublicKey(pub))
	return base64.RawURLEncoding.EncodeToString(sum[:16])
}

// stubJWKS serves the public half of a test key at the contract-defined
// path, playing apps/api-auth for the api under test.
func stubJWKS(t *testing.T, priv *rsa.PrivateKey) *httptest.Server {
	t.Helper()
	kid := kidFor(&priv.PublicKey)
	doc := map[string]any{"keys": []map[string]any{
		{
			"kty": "RSA",
			"kid": kid,
			"use": "sig",
			"alg": "RS256",
			"n":   base64.RawURLEncoding.EncodeToString(priv.PublicKey.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(priv.PublicKey.E)).Bytes()),
		},
	}}
	raw, _ := json.Marshal(doc)
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/jwks.json" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, string(raw))
	}))
}

// signAccessToken mints the access token the api must accept: RS256,
// kid matching the served JWKS, kind=access.
func signAccessToken(t *testing.T, priv *rsa.PrivateKey, kind, sub string, ttl time.Duration) string {
	t.Helper()
	claims := jwt.MapClaims{
		"kind": kind,
		"sub":  sub,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(ttl).Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = kidFor(&priv.PublicKey)
	signed, err := tok.SignedString(priv)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return signed
}

func testDeps(t *testing.T, pool *pgxpool.Pool, verifier *jwks.Verifier) router.Deps {
	t.Helper()
	return router.Deps{
		Config: config.Config{
			DatabaseURL:  os.Getenv("DATABASE_URL"),
			APIAuthURL:   "http://localhost:3001",
			JWKSCacheTTL: time.Minute,
			Port:         "0",
		},
		ItemsRepo: items.NewPGItemsRepo(pool),
		Verifier:  verifier,
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

	// The api fetches the JWKS from apps/api-auth's stand-in.
	priv := testKey(t)
	stub := stubJWKS(t, priv)
	defer stub.Close()

	verifier := jwks.NewVerifier(stub.URL, time.Minute)
	engine, _ := router.New(testDeps(t, pool, verifier))
	committed := loadCommittedSpec(t)
	client := specClient{engine: engine, spec: committed, t: t}

	// Fresh state.
	if _, err := db.Migrate(ctx, pool, "migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if _, err := pool.Exec(ctx, "TRUNCATE items CASCADE"); err != nil {
		t.Fatalf("truncate items: %v", err)
	}

	// 1. /items is protected: 401 without a token (schema-checked).
	getItems := client.request(t, "GET", "/items", nil, "")
	if getItems.code != http.StatusUnauthorized {
		t.Errorf("GET /items without token -> %d, want 401", getItems.code)
	}
	getItems.schemaCheck("GET", "/items", "401")
	postItems := client.request(t, "POST", "/items", map[string]any{"name": "contract item"}, "")
	if postItems.code != http.StatusUnauthorized {
		t.Errorf("POST /items without token -> %d, want 401", postItems.code)
	}

	// 2. A refresh-kind token is never an access token (decision 16).
	refreshToken := signAccessToken(t, priv, "refresh", "contract-user", time.Minute)
	withRefresh := client.request(t, "GET", "/items", nil, "Bearer "+refreshToken)
	if withRefresh.code != http.StatusUnauthorized {
		t.Errorf("GET /items with a refresh token -> %d, want 401", withRefresh.code)
	}

	// 3. With a valid access token: empty list, create, list again.
	access := signAccessToken(t, priv, "access", "contract-user", time.Minute)
	empty := client.request(t, "GET", "/items", nil, "Bearer "+access)
	if empty.code != http.StatusOK {
		t.Fatalf("GET /items with token -> %d, want 200", empty.code)
	}
	empty.schemaCheck("GET", "/items", "200")
	var listed []map[string]any
	if err := json.Unmarshal(empty.body, &listed); err != nil {
		t.Fatalf("items list body: %v", err)
	}
	if len(listed) != 0 {
		t.Fatalf("expected an empty list, got %v", listed)
	}
	created := client.request(t, "POST", "/items", map[string]any{"name": "contract item"}, "Bearer "+access)
	if created.code != http.StatusOK {
		t.Fatalf("POST /items -> %d, want 200: %s", created.code, created.body)
	}
	created.schemaCheck("POST", "/items", "200")
	var item map[string]any
	if err := json.Unmarshal(created.body, &item); err != nil {
		t.Fatalf("created item body: %v", err)
	}
	if item["name"] != "contract item" {
		t.Errorf("created item = %v", item)
	}
	listedAgain := client.request(t, "GET", "/items", nil, "Bearer "+access)
	var after []map[string]any
	_ = json.Unmarshal(listedAgain.body, &after)
	if len(after) != 1 || after[0]["id"] != item["id"] {
		t.Errorf("list after create = %v, want the created item", after)
	}

	// 4. Every route in the committed spec answers (no 404s) — the
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
`;
}

export { goModMs, goSumMs, envExampleMs, apiMainGoMs, migrateMainGoMs, specgenMainGoMs, configGoMs, jwksGoMs, jwksTestGoMs, routerGoMs, contractTestGoMs };
