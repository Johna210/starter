// Materializer: apps/api templates for the Go-monolith (shape 3) base.
//
// The api is Gin + Huma (decision 19): operations are typed Go
// input/output structs; Huma validates, serves, AND generates the
// OpenAPI spec from them. internal/{auth,items} are the modular
// monolith's modules (decision 27). The files below were verified by
// building + testing a materialized project (go vet + go test incl.
// contract tests against a real Postgres).
//
// go.sum is committed so a fresh materialization builds without a
// network round-trip; it was captured with `go mod tidy` and changes
// only when the dependency set in go.mod changes (re-bake then).
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into apps/api. The orchestrator
// (materialize.ts) calls writeGoApi(ctx); template functions are
// private to this module.

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeGoApi(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  await writeFileRecursive(join(targetDir, 'apps/api/go.mod'), goMod());
  await writeFileRecursive(join(targetDir, 'apps/api/go.sum'), goSum());
  await writeFileRecursive(join(targetDir, 'apps/api/.env.example'), goEnvExample());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/api/main.go'), apiMainGo());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/migrate/main.go'), migrateMainGo());
  await writeFileRecursive(join(targetDir, 'apps/api/cmd/specgen/main.go'), specgenMainGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/config/config.go'), configGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/db.go'), dbGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/migrate.go'), migrateGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/db/testpool.go'), dbTestpoolGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/item.go'), itemsItemGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo.go'), itemsRepoGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo.pg.go'), itemsRepoPgGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.routes.go'), itemsRoutesGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/index.go'), itemsIndexGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/items/items.repo_test.go'), itemsRepoTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/passwords.go'), authPasswordsGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/tokens.go'), authTokensGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/refresh.go'), authRefreshGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/auth.repo.go'), authRepoGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/auth.repo.pg.go'), authRepoPgGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/auth.routes.go'), authRoutesGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/auth.middleware.go'), authMiddlewareGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/index.go'), authIndexGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/passwords_test.go'), authPasswordsTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/tokens_test.go'), authTokensTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/refresh_test.go'), authRefreshTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/auth/auth.repo_test.go'), authRepoTestGo());
  await writeFileRecursive(join(targetDir, 'apps/api/internal/router/router.go'), routerGo());
  await writeFileRecursive(join(targetDir, 'apps/api/migrations/0000_items.sql'), migrationsItemsSql());
  await writeFileRecursive(join(targetDir, 'apps/api/migrations/0001_users.sql'), migrationsUsersSql());
  await writeFileRecursive(join(targetDir, 'apps/api/migrations/0002_refresh_tokens.sql'), migrationsRefreshTokensSql());
  await writeFileRecursive(join(targetDir, 'apps/api/contract_test.go'), contractTestGo());
}


function goMod(): string {
  return `module starter/apps/api

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

function goSum(): string {
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

function goEnvExample(): string {
  return `# apps/api — env surface (decision 28). Copy to .env for dev; prod
# injects real env vars. Code reads these only through internal/config.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/starter
JWT_SIGNING_KEY=replace-me-with-a-32-plus-char-random-secret
PORT=3000
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=604800
`;
}

function apiMainGo(): string {
  return `// cmd/api — the api's entrypoint. Boots the gin engine on the
// configured port. \`task dev\` runs this.
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

	"starter/apps/api/internal/auth"
	"starter/apps/api/internal/config"
	"starter/apps/api/internal/db"
	"starter/apps/api/internal/items"
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

	engine, _ := router.New(router.Deps{
		Config:    cfg,
		ItemsRepo: items.NewPGItemsRepo(pool),
		Users:     auth.NewPGUserStore(pool),
		Tokens:    auth.NewPGRefreshTokenStore(pool),
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

function migrateMainGo(): string {
  return `// cmd/migrate — the migration runner's entrypoint. Applies every
// migrations/*.sql file in order, tracking applied versions in
// schema_migrations. \`task migrate\` runs this.
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

function specgenMainGo(): string {
  return `// cmd/specgen — regenerates packages/contract/openapi.yaml from the Go
// structs (decision 19: Go is the canonical side). The generated file
// is committed; clients are generated from it. \`task contract:generate\`
// runs this and then regenerates the TS client.
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

	"starter/apps/api/internal/auth"
	"starter/apps/api/internal/config"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/router"
)

func main() {
	out := "../../packages/contract/openapi.yaml"
	if len(os.Args) > 1 {
		out = os.Args[1]
	}

	// Specgen only walks route registration — no DB access happens.
	// The repos are nil because no handler runs during generation.
	engine, _ := router.New(router.Deps{
		Config: config.Config{
			JWTSigningKey:   "specgen-only-key-that-is-at-least-32-chars-long!",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
		},
		ItemsRepo: itemsRepoStub{},
		Users:     auth.UserStore(nil),
		Tokens:    auth.RefreshTokenStore(nil),
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

function configGo(): string {
  return `// Package config implements the zod-equivalent for the Go api
// (decision 28): a typed config parsed from the environment, fail-fast
// at startup. Code never reads os.Getenv directly — always through this
// typed struct. Dev loads vars via .env + godotenv (see cmd/api);
// prod uses real env vars injected by the deploy platform. Both fill
// the environment, so this package doesn't care which one ran.
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
	// JWTSigningKey is the HS256 signing secret (sole minter invariant,
	// decision 11). Must be at least 32 chars (256 bits of entropy).
	JWTSigningKey string
	// Port the api listens on.
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
		port = "3000"
	}

	cfg := Config{
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTSigningKey:   os.Getenv("JWT_SIGNING_KEY"),
		Port:            port,
		AccessTokenTTL:  accessTTL,
		RefreshTokenTTL: refreshTTL,
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL is required (set it in apps/api/.env or the environment)")
	}
	if len(cfg.JWTSigningKey) < 32 {
		return Config{}, fmt.Errorf("config: JWT_SIGNING_KEY must be at least 32 characters (256 bits); generate one with \`openssl rand -base64 48\`")
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

function dbGo(): string {
  return `// Package db owns the Postgres connection pool and the migration
// runner. The api talks to Postgres exclusively through pgx.
package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool opens a pgx connection pool. The caller must Close() it.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: open pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: ping %q: %w", databaseURL, err)
	}
	return pool, nil
}
`;
}

function migrateGo(): string {
  return `package db

import (
	"context"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Migrate applies every .sql file in dir that hasn't been applied yet,
// in filename order, each inside its own transaction. Applied versions
// are tracked in the schema_migrations table (created on demand), so
// the runner is idempotent. Returns the names of the migrations it
// applied.
func Migrate(ctx context.Context, pool *pgxpool.Pool, dir string) ([]string, error) {
	if _, err := pool.Exec(ctx, \`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)\`); err != nil {
		return nil, fmt.Errorf("db: create schema_migrations: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("db: read migrations dir %q: %w", dir, err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	var applied []string
	for _, name := range files {
		var exists bool
		if err := pool.QueryRow(ctx,
			"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)",
			name).Scan(&exists); err != nil {
			return nil, fmt.Errorf("db: check migration %s: %w", name, err)
		}
		if exists {
			continue
		}

		sql, err := os.ReadFile(dir + "/" + name)
		if err != nil {
			return nil, fmt.Errorf("db: read migration %s: %w", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return nil, fmt.Errorf("db: begin %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, string(sql)); err != nil {
			_ = tx.Rollback(ctx)
			return nil, fmt.Errorf("db: apply %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx,
			"INSERT INTO schema_migrations (version) VALUES ($1)", name); err != nil {
			_ = tx.Rollback(ctx)
			return nil, fmt.Errorf("db: record %s: %w", name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("db: commit %s: %w", name, err)
		}
		applied = append(applied, name)
	}
	return applied, nil
}
`;
}

function itemsItemGo(): string {
  return `// Package items is the demo domain (decision 13) — the one disposable
// domain every scaffolded project ships to prove the stack composes.
// The Item struct here is the schema: Huma codegens the committed
// packages/contract/openapi.yaml from it (Go is the canonical side,
// decision 19).
package items

import "time"

// Item is a row of the items table, serialized exactly as the wire
// format declares (json tags are the schema names).
type Item struct {
	ID        string    \`json:"id"\`
	Name      string    \`json:"name" maxLength:"200"\`
	CreatedAt time.Time \`json:"created_at"\`
}
`;
}

function itemsRepoGo(): string {
  return `// items.repo.go declares the typed ItemsRepo interface — the modular
// monolith's split-seam (decision 27). The monolith ships one PG-backed
// implementation (items.repo.pg.go); a microservices shape would
// promote this interface across an HTTP boundary. Routes depend on the
// interface, never the implementation.
package items

import "context"

// ErrNotFound is returned by repo methods when a row is missing.
var ErrNotFound = &notFoundError{}

type notFoundError struct{}

func (*notFoundError) Error() string { return "items: not found" }

// ItemsRepo is the persistence seam for the items domain.
type ItemsRepo interface {
	// List returns every item, newest first.
	List(ctx context.Context) ([]Item, error)
	// Create inserts an item with the given name and returns it.
	Create(ctx context.Context, name string) (Item, error)
}
`;
}

function itemsRepoPgGo(): string {
  return `// items.repo.pg.go is the Postgres implementation of ItemsRepo (pgx).
package items

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PGItemsRepo implements ItemsRepo over Postgres.
type PGItemsRepo struct {
	pool *pgxpool.Pool
}

// NewPGItemsRepo wires the repo to a pgx pool.
func NewPGItemsRepo(pool *pgxpool.Pool) *PGItemsRepo {
	return &PGItemsRepo{pool: pool}
}

// List returns every item, newest first.
func (r *PGItemsRepo) List(ctx context.Context) ([]Item, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT id::text, name, created_at FROM items ORDER BY created_at DESC")
	if err != nil {
		return nil, fmt.Errorf("items: list: %w", err)
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var it Item
		if err := rows.Scan(&it.ID, &it.Name, &it.CreatedAt); err != nil {
			return nil, fmt.Errorf("items: scan: %w", err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// Create inserts an item with the given name and returns it.
func (r *PGItemsRepo) Create(ctx context.Context, name string) (Item, error) {
	var it Item
	err := r.pool.QueryRow(ctx,
		"INSERT INTO items (name) VALUES ($1) RETURNING id::text, name, created_at",
		name).Scan(&it.ID, &it.Name, &it.CreatedAt)
	if err != nil {
		return Item{}, fmt.Errorf("items: create: %w", err)
	}
	return it, nil
}
`;
}

function itemsRoutesGo(): string {
  return `// items.routes.go defines the GET/POST /items operations as typed
// Huma structs. These structs are the source of the OpenAPI document
// (decision 19: Go is the canonical side) — the wire format, validation
// and generated clients all flow from them.
package items

import (
	"context"
	"strings"

	"github.com/danielgtaylor/huma/v2"
)

// ItemsListInput is the (empty) input of GET /items.
type ItemsListInput struct{}

// ItemsListOutput is the list of items.
type ItemsListOutput struct {
	Body []Item
}

// ItemCreateInput is the body of POST /items. Validation mirrors the
// zod schema of the TS shapes (decision 13/14): a non-empty name.
type ItemCreateInput struct {
	Body struct {
		Name string \`json:"name" minLength:"1" maxLength:"200" doc:"Name of the item"\`
	}
}

// ItemCreateOutput is the created item.
type ItemCreateOutput struct {
	Body Item
}

// ListItemsHandler returns the handler for GET /items.
func ListItemsHandler(repo ItemsRepo) func(context.Context, *ItemsListInput) (*ItemsListOutput, error) {
	return func(ctx context.Context, _ *ItemsListInput) (*ItemsListOutput, error) {
		items, err := repo.List(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to list items", err)
		}
		return &ItemsListOutput{Body: items}, nil
	}
}

// CreateItemHandler returns the handler for POST /items.
func CreateItemHandler(repo ItemsRepo) func(context.Context, *ItemCreateInput) (*ItemCreateOutput, error) {
	return func(ctx context.Context, in *ItemCreateInput) (*ItemCreateOutput, error) {
		name := strings.TrimSpace(in.Body.Name)
		if name == "" {
			// Huma's minLength covers body-less POSTs only when a
			// content-type is present; the explicit check keeps the
			// empty-name case honest for every client.
			return nil, huma.Error422UnprocessableEntity("name must not be empty")
		}
		item, err := repo.Create(ctx, name)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to create item", err)
		}
		return &ItemCreateOutput{Body: item}, nil
	}
}
`;
}

function itemsIndexGo(): string {
  return `// index.go composes the items module: the /items prefix, the auth
// gate, and the two operations. This is the modular monolith's
// mountable unit (decision 27) — router.go mounts it; a microservices
// shape would extract it wholesale.
package items

import (
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// NewItemsModule mounts the items module at /items. requireAuth gates
// both operations (decision 13: /items is protected by auth).
func NewItemsModule(api huma.API, repo ItemsRepo, requireAuth func(huma.Context, func(huma.Context))) {
	g := huma.NewGroup(api, "/items")
	g.UseMiddleware(requireAuth)

	// Both operations declare the bearerAuth security requirement so
	// the committed spec honestly documents the gate (decision 13).
	huma.Register(g, huma.Operation{
		Method:   http.MethodGet,
		Path:     "",
		Summary:  "List items",
		Tags:     []string{"items"},
		Security: bearerAuth,
	}, ListItemsHandler(repo))

	huma.Register(g, huma.Operation{
		Method:   http.MethodPost,
		Path:     "",
		Summary:  "Create an item",
		Tags:     []string{"items"},
		Security: bearerAuth,
	}, CreateItemHandler(repo))
}

// bearerAuth is the security requirement shared by the protected
// operations; the scheme itself is registered in router.New.
var bearerAuth = []map[string][]string{{"bearerAuth": {}}}
`;
}

function authPasswordsGo(): string {
  return `// passwords.go — argon2id password hashing (decision 12).
//
// Thin typed layer over golang.org/x/crypto/argon2 (the reference
// argon2 implementation). The starter owns the *parameters*: the same
// values the TS shapes use (@node-rs/argon2 defaults tuned to the
// OWASP 2024 minimum for argon2id) — a project shouldn't have to think
// about argon2 tuning.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2 parameters owned by the starter (decision 12). Memory cost is
// in KiB: 19 MiB (OWASP 2024 minimum for argon2id).
const (
	argon2Memory      = 19 * 1024
	argon2Iterations  = 2
	argon2Parallelism = 1
	argon2KeyLength   = 32
	argon2SaltLength  = 16
)

// HashPassword hashes a plaintext password into a self-describing
// PHC-formatted string (salt + parameters included). The same input
// produces a different hash on each call.
func HashPassword(plaintext string) (string, error) {
	salt := make([]byte, argon2SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("auth: generate salt: %w", err)
	}
	key := argon2.IDKey([]byte(plaintext), salt, argon2Iterations, argon2Memory, argon2Parallelism, argon2KeyLength)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argon2Memory, argon2Iterations, argon2Parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key)), nil
}

// VerifyPassword checks a plaintext password against a stored PHC hash.
// Returns false (not an error) for any failure — wrong password,
// malformed hash, unsupported parameters — so the caller doesn't need
// a try/catch to handle user errors.
func VerifyPassword(hash, plaintext string) bool {
	params, salt, expected, err := decodePHC(hash)
	if err != nil {
		return false
	}
	key := argon2.IDKey([]byte(plaintext), salt, params.iterations, params.memory, params.parallelism, argon2KeyLength)
	return subtle.ConstantTimeCompare(key, expected) == 1
}

type argon2Params struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
}

// decodePHC parses the $argon2id$v=19$m=...,t=...,p=...$salt$hash form.
func decodePHC(hash string) (argon2Params, []byte, []byte, error) {
	parts := strings.Split(hash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return argon2Params{}, nil, nil, fmt.Errorf("auth: malformed hash")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return argon2Params{}, nil, nil, fmt.Errorf("auth: unsupported argon2 version")
	}
	var p argon2Params
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.memory, &p.iterations, &p.parallelism); err != nil {
		return argon2Params{}, nil, nil, fmt.Errorf("auth: malformed parameters")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return argon2Params{}, nil, nil, fmt.Errorf("auth: malformed salt")
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return argon2Params{}, nil, nil, fmt.Errorf("auth: malformed hash")
	}
	return p, salt, key, nil
}
`;
}

function authTokensGo(): string {
  return `// tokens.go — JWT issue/verify (golang-jwt/jwt/v5, HS256).
//
// Thin typed layer over the vetted JWT library. The starter owns the
// algorithm (HS256 for the symmetric signing key) and the TTLs (from
// config); the wire format is a standard JWT. Access tokens carry
// {sub}; refresh tokens additionally carry a jti so the rotation store
// can recognise and revoke individual tokens (mirroring the TS shapes).
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenKind discriminates the two token kinds (decision 16: short-lived
// access, longer-lived refresh).
type TokenKind string

const (
	TokenKindAccess  TokenKind = "access"
	TokenKindRefresh TokenKind = "refresh"
)

// Claims is the JWT payload the starter signs.
type Claims struct {
	// Kind is "access" or "refresh" — required because a refresh token
	// must never be accepted as a Bearer access token.
	Kind TokenKind \`json:"kind"\`
	// JTI identifies a refresh token for rotation/revocation; empty for
	// access tokens.
	JTI string \`json:"jti,omitempty"\`
	jwt.RegisteredClaims
}

// InvalidTokenError is returned by VerifyToken on any JWT failure. The
// api maps it to 401.
type InvalidTokenError struct{ msg string }

func (e *InvalidTokenError) Error() string { return e.msg }

// ErrInvalidToken is the sentinel wrapped by InvalidTokenError.
var ErrInvalidToken = errors.New("auth: invalid token")

// SignToken signs a token for the given user with the configured TTL
// for its kind. The claims' iat/exp are set here.
func SignToken(key []byte, userID string, kind TokenKind, jti string, ttl time.Duration) (string, error) {
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
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(key)
	if err != nil {
		return "", fmt.Errorf("auth: sign token: %w", err)
	}
	return signed, nil
}

// VerifyToken checks a token's signature and expiry and returns its
// claims. Returns *InvalidTokenError for any failure (expired,
// malformed, wrong signature).
func VerifyToken(key []byte, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("auth: unexpected signing method %v", t.Method)
		}
		return key, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, &InvalidTokenError{msg: err.Error()}
	}
	if !token.Valid {
		return nil, &InvalidTokenError{msg: "auth: invalid token"}
	}
	return claims, nil
}

// newJTI returns a fresh refresh-token id (UUID v4).
func newJTI() (string, error) {
	return newUUID()
}
`;
}

function authRefreshGo(): string {
  return `// refresh.go — refresh-token rotation.
//
// The auth shim's split-seam: this module owns the *rotation algorithm*
// (issue -> verify -> revoke -> re-issue), while *persistence* is
// delegated to a RefreshTokenStore interface that the api implements
// with pgx (see auth.repo.pg.go). The store is the minimum viable
// surface: a refresh token is recognised by its jti; lookup returns the
// user it belongs to; revocation prevents future rotation.
package auth

import (
	"context"
	"crypto/rand"
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
// RevokeRefreshToken for store-level rejections. The api maps it to 401.
type InvalidRefreshTokenError struct{ msg string }

func (e *InvalidRefreshTokenError) Error() string { return e.msg }

// TokenPair is the two-token pair issued on login / refresh
// (mirrors the TS TokenPair: { access, refresh }).
type TokenPair struct {
	Access  string \`json:"access"\`
	Refresh string \`json:"refresh"\`
}

// Signer issues tokens. Implemented by config-backed functions; the
// seam keeps rotation testable without touching the store.
type Signer interface {
	SignAccess(ctx context.Context, userID string) (string, error)
	SignRefresh(ctx context.Context, userID, jti string) (string, error)
	Verify(ctx context.Context, token string) (*Claims, error)
}

// NewSigner returns a Signer backed by the given key and TTLs.
func NewSigner(key []byte, accessTTL, refreshTTL time.Duration) Signer {
	return &jwtSigner{key: key, accessTTL: accessTTL, refreshTTL: refreshTTL}
}

type jwtSigner struct {
	key        []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func (s *jwtSigner) SignAccess(_ context.Context, userID string) (string, error) {
	return SignToken(s.key, userID, TokenKindAccess, "", s.accessTTL)
}

func (s *jwtSigner) SignRefresh(_ context.Context, userID, jti string) (string, error) {
	return SignToken(s.key, userID, TokenKindRefresh, jti, s.refreshTTL)
}

func (s *jwtSigner) Verify(_ context.Context, token string) (*Claims, error) {
	return VerifyToken(s.key, token)
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

function authRepoGo(): string {
  return `// auth.repo.go declares the persistence seams of the auth module:
// UserStore and RefreshTokenStore. The modular monolith structure
// (decision 27): routes depend on these interfaces, the PG-backed
// implementations live in auth.repo.pg.go.
package auth

import (
	"context"
	"errors"
	"time"
)

// User is a row of the users table.
type User struct {
	ID           string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

// ErrUserNotFound is returned by FindUserByEmail for unknown emails.
var ErrUserNotFound = errors.New("auth: user not found")

// ErrEmailTaken is returned by CreateUser for duplicate emails.
var ErrEmailTaken = errors.New("auth: email already registered")

// UserStore persists users.
type UserStore interface {
	// CreateUser inserts a user. Returns ErrEmailTaken on a duplicate email.
	CreateUser(ctx context.Context, email, passwordHash string) (User, error)
	// FindUserByEmail looks up a user by email. Returns ErrUserNotFound when unknown.
	FindUserByEmail(ctx context.Context, email string) (User, error)
}
`;
}

function authRepoPgGo(): string {
  return `// auth.repo.pg.go is the Postgres implementation of the auth module's
// stores (pgx), mirroring the TS shapes' auth.repo.drizzle.ts.
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGUserStore implements UserStore over Postgres.
type PGUserStore struct {
	pool *pgxpool.Pool
}

// NewPGUserStore wires the store to a pgx pool.
func NewPGUserStore(pool *pgxpool.Pool) *PGUserStore {
	return &PGUserStore{pool: pool}
}

// CreateUser inserts a user. Returns ErrEmailTaken on a duplicate email.
func (s *PGUserStore) CreateUser(ctx context.Context, email, passwordHash string) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		"INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id::text, email, password_hash, created_at",
		email, passwordHash).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
			return User{}, ErrEmailTaken
		}
		return User{}, fmt.Errorf("auth: create user: %w", err)
	}
	return u, nil
}

// FindUserByEmail looks up a user by email.
func (s *PGUserStore) FindUserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		"SELECT id::text, email, password_hash, created_at FROM users WHERE email = $1",
		email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("auth: find user: %w", err)
	}
	return u, nil
}

// PGRefreshTokenStore implements RefreshTokenStore over Postgres.
type PGRefreshTokenStore struct {
	pool *pgxpool.Pool
}

// NewPGRefreshTokenStore wires the store to a pgx pool.
func NewPGRefreshTokenStore(pool *pgxpool.Pool) *PGRefreshTokenStore {
	return &PGRefreshTokenStore{pool: pool}
}

// Create persists a freshly-issued refresh token.
func (s *PGRefreshTokenStore) Create(ctx context.Context, rec RefreshTokenRecord) error {
	_, err := s.pool.Exec(ctx,
		"INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES ($1, $2, $3)",
		rec.JTI, rec.UserID, rec.ExpiresAt)
	if err != nil {
		return fmt.Errorf("auth: create refresh token: %w", err)
	}
	return nil
}

// FindByJTI looks up a refresh token by jti.
func (s *PGRefreshTokenStore) FindByJTI(ctx context.Context, jti string) (RefreshTokenRecord, error) {
	var rec RefreshTokenRecord
	var revokedAt *time.Time
	err := s.pool.QueryRow(ctx,
		"SELECT jti, user_id::text, expires_at, revoked_at FROM refresh_tokens WHERE jti = $1",
		jti).Scan(&rec.JTI, &rec.UserID, &rec.ExpiresAt, &revokedAt)
	rec.Revoked = revokedAt != nil
	if errors.Is(err, pgx.ErrNoRows) {
		return RefreshTokenRecord{}, ErrRefreshTokenNotFound
	}
	if err != nil {
		return RefreshTokenRecord{}, fmt.Errorf("auth: find refresh token: %w", err)
	}
	return rec, nil
}

// Revoke marks a refresh token as revoked. Idempotent.
func (s *PGRefreshTokenStore) Revoke(ctx context.Context, jti string) error {
	if _, err := s.pool.Exec(ctx,
		"UPDATE refresh_tokens SET revoked_at = now() WHERE jti = $1 AND revoked_at IS NULL",
		jti); err != nil {
		return fmt.Errorf("auth: revoke refresh token: %w", err)
	}
	return nil
}
`;
}

function authRoutesGo(): string {
  return `// auth.routes.go — the four auth endpoints (decision 12):
// register, login, refresh, logout. In shape 3 the auth shim is
// embedded in the monolith (internal/auth), mounted at /auth.
//
// Cookie contract (decision 16): the refresh token travels in an
// httpOnly cookie (set on register/login, rotated on refresh, cleared
// on logout); the access token is returned in the body only.
package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"
)

// refreshCookieName is the single source of truth for the cookie name.
const refreshCookieName = "refresh_token"

// AuthUser is the public user shape returned to clients.
type AuthUser struct {
	ID    string \`json:"id"\`
	Email string \`json:"email"\`
}

// AuthTokens is the token pair returned in bodies.
type AuthTokens struct {
	Access  string \`json:"access"\`
	Refresh string \`json:"refresh"\`
}

// AuthRegisterInput validates the register body (mirrors the TS zod
// schema: email + password min 8).
type AuthRegisterInput struct {
	Body struct {
		Email    string \`json:"email" format:"email" maxLength:"256"\`
		Password string \`json:"password" minLength:"8" maxLength:"256"\`
	}
}

// AuthRegisterOutput is the 201 register response: the token pair plus
// the created user, and the httpOnly refresh cookie.
type AuthRegisterOutput struct {
	Body struct {
		Access  string   \`json:"access"\`
		Refresh string   \`json:"refresh"\`
		User    AuthUser \`json:"user"\`
	}
	SetCookie string \`header:"Set-Cookie"\`
}

// AuthCredentialsInput validates the login body.
type AuthCredentialsInput struct {
	Body struct {
		Email    string \`json:"email" format:"email" maxLength:"256"\`
		Password string \`json:"password" minLength:"1" maxLength:"256"\`
	}
}

// AuthTokensOutput is the token pair response (login/refresh).
type AuthTokensOutput struct {
	Body      AuthTokens
	SetCookie string \`header:"Set-Cookie"\`
}

// AuthRefreshInput reads the refresh token from the httpOnly cookie,
// falling back to an optional JSON body (mirrors the TS shapes'
// getCookie fallback).
type AuthRefreshInput struct {
	Body *struct {
		Refresh *string \`json:"refresh,omitempty"\`
	}
	RefreshToken string \`cookie:"refresh_token"\`
}

// AuthLogoutInput is the same surface as AuthRefreshInput.
type AuthLogoutInput = AuthRefreshInput

// AuthLogoutOutput is the 204 logout response (cookie cleared).
type AuthLogoutOutput struct {
	SetCookie string \`header:"Set-Cookie"\`
}

// AuthRoutes holds the deps the four handlers share.
type AuthRoutes struct {
	Users      UserStore
	Tokens     RefreshTokenStore
	Signer     Signer
	RefreshTTL time.Duration
}

// NewAuthRoutes wires the deps once.
func NewAuthRoutes(users UserStore, tokens RefreshTokenStore, signer Signer, refreshTTL time.Duration) *AuthRoutes {
	return &AuthRoutes{Users: users, Tokens: tokens, Signer: signer, RefreshTTL: refreshTTL}
}

// RegisterHandler returns the handler for POST /auth/register.
func (a *AuthRoutes) RegisterHandler() func(context.Context, *AuthRegisterInput) (*AuthRegisterOutput, error) {
	return func(ctx context.Context, in *AuthRegisterInput) (*AuthRegisterOutput, error) {
		email := strings.ToLower(strings.TrimSpace(in.Body.Email))
		passwordHash, err := HashPassword(in.Body.Password)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to hash password", err)
		}
		user, err := a.Users.CreateUser(ctx, email, passwordHash)
		if err != nil {
			if errors.Is(err, ErrEmailTaken) {
				return nil, huma.Error409Conflict("email already registered")
			}
			return nil, huma.Error500InternalServerError("failed to create user", err)
		}
		pair, err := IssueTokenPair(ctx, a.Signer, a.Tokens, user.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to issue tokens", err)
		}
		out := &AuthRegisterOutput{}
		out.Body.Access = pair.Access
		out.Body.Refresh = pair.Refresh
		out.Body.User = AuthUser{ID: user.ID, Email: user.Email}
		out.SetCookie = setRefreshCookie(pair.Refresh, a.RefreshTTL)
		return out, nil
	}
}

// LoginHandler returns the handler for POST /auth/login.
func (a *AuthRoutes) LoginHandler() func(context.Context, *AuthCredentialsInput) (*AuthTokensOutput, error) {
	return func(ctx context.Context, in *AuthCredentialsInput) (*AuthTokensOutput, error) {
		email := strings.ToLower(strings.TrimSpace(in.Body.Email))
		user, err := a.Users.FindUserByEmail(ctx, email)
		if err != nil || !VerifyPassword(user.PasswordHash, in.Body.Password) {
			// Same 401 for unknown email and wrong password: don't
			// leak which part failed.
			return nil, huma.Error401Unauthorized("invalid email or password")
		}
		pair, err := IssueTokenPair(ctx, a.Signer, a.Tokens, user.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError("failed to issue tokens", err)
		}
		out := &AuthTokensOutput{}
		out.Body.Access = pair.Access
		out.Body.Refresh = pair.Refresh
		out.SetCookie = setRefreshCookie(pair.Refresh, a.RefreshTTL)
		return out, nil
	}
}

// RefreshHandler returns the handler for POST /auth/refresh.
func (a *AuthRoutes) RefreshHandler() func(context.Context, *AuthRefreshInput) (*AuthTokensOutput, error) {
	return func(ctx context.Context, in *AuthRefreshInput) (*AuthTokensOutput, error) {
		refresh := in.RefreshToken
		if in.Body != nil && in.Body.Refresh != nil && strings.TrimSpace(*in.Body.Refresh) != "" {
			refresh = *in.Body.Refresh
		}
		if refresh == "" {
			return nil, huma.Error401Unauthorized("missing refresh token")
		}
		pair, err := RotateTokenPair(ctx, a.Signer, a.Tokens, refresh)
		if err != nil {
			return nil, mapRefreshError(err)
		}
		out := &AuthTokensOutput{}
		out.Body.Access = pair.Access
		out.Body.Refresh = pair.Refresh
		out.SetCookie = setRefreshCookie(pair.Refresh, a.RefreshTTL)
		return out, nil
	}
}

// LogoutHandler returns the handler for POST /auth/logout (204).
func (a *AuthRoutes) LogoutHandler() func(context.Context, *AuthLogoutInput) (*AuthLogoutOutput, error) {
	return func(ctx context.Context, in *AuthLogoutInput) (*AuthLogoutOutput, error) {
		refresh := in.RefreshToken
		if in.Body != nil && in.Body.Refresh != nil && strings.TrimSpace(*in.Body.Refresh) != "" {
			refresh = *in.Body.Refresh
		}
		if refresh != "" {
			if err := RevokeRefreshToken(ctx, a.Signer, a.Tokens, refresh); err != nil {
				return nil, mapRefreshError(err)
			}
		}
		// Clearing the cookie is idempotent — logout succeeds even
		// without a valid refresh token.
		return &AuthLogoutOutput{SetCookie: clearRefreshCookie()}, nil
	}
}

// mapRefreshError maps rotation/revocation rejections to 401.
func mapRefreshError(err error) error {
	if err != nil {
		var invalid *InvalidRefreshTokenError
		if errors.As(err, &invalid) {
			return huma.Error401Unauthorized("invalid refresh token")
		}
		return huma.Error500InternalServerError("failed to rotate refresh token", err)
	}
	return nil
}

func setRefreshCookie(token string, ttl time.Duration) string {
	return fmt.Sprintf("%s=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=%d",
		refreshCookieName, token, int(ttl.Seconds()))
}

func clearRefreshCookie() string {
	return fmt.Sprintf("%s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0", refreshCookieName)
}
`;
}

function authMiddlewareGo(): string {
  return `// auth.middleware.go — requireAuth: the Bearer access-token gate for
// protected modules. The api owns the signing key (sole minter,
// decision 11); the middleware only verifies.
package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
)

// RequireAuth returns a huma middleware that requires a valid Bearer
// access token on every operation of the group it guards. Refresh
// tokens are rejected (a refresh token is never a valid access token).
func RequireAuth(api huma.API, signer Signer) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		header := ctx.Header("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			_ = huma.WriteErr(api, ctx, http.StatusUnauthorized, "unauthorized")
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := signer.Verify(ctx.Context(), token)
		if err != nil || claims.Kind != TokenKindAccess {
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

function authIndexGo(): string {
  return `// index.go composes the auth module: the /auth prefix and the four
// endpoints (decision 12). The module owns its stores and the signer
// (sole minter, decision 11: apps/api holds the signing key).
package auth

import (
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
)

// NewAuthModule mounts the auth module at /auth on the api and returns
// the RequireAuth middleware for other modules to use.
func NewAuthModule(api huma.API, users UserStore, tokens RefreshTokenStore, signer Signer, refreshTTL time.Duration) func(huma.Context, func(huma.Context)) {
	routes := NewAuthRoutes(users, tokens, signer, refreshTTL)

	g := huma.NewGroup(api, "/auth")

	huma.Register(g, huma.Operation{
		Method:        http.MethodPost,
		Path:          "/register",
		Summary:       "Register a new user",
		Tags:          []string{"auth"},
		DefaultStatus: http.StatusCreated,
	}, routes.RegisterHandler())

	huma.Register(g, huma.Operation{
		Method:  http.MethodPost,
		Path:    "/login",
		Summary: "Log in and receive a token pair",
		Tags:    []string{"auth"},
	}, routes.LoginHandler())

	huma.Register(g, huma.Operation{
		Method:  http.MethodPost,
		Path:    "/refresh",
		Summary: "Rotate the refresh token and issue a new pair",
		Tags:    []string{"auth"},
	}, routes.RefreshHandler())

	huma.Register(g, huma.Operation{
		Method:  http.MethodPost,
		Path:    "/logout",
		Summary: "Revoke the refresh token and clear the cookie",
		Tags:    []string{"auth"},
	}, routes.LogoutHandler())

	return RequireAuth(api, signer)
}
`;
}

function routerGo(): string {
  return `// Package router assembles the api: the gin engine, the one huma API
// (which owns the OpenAPI document — Go is the canonical side, decision
// 19), and the modular monolith's modules (decision 27):
//   - /auth   — the embedded auth shim (decision 12)
//   - /items  — the demo domain, behind requireAuth (decision 13)
package router

import (
	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"

	"starter/apps/api/internal/auth"
	"starter/apps/api/internal/config"
	"starter/apps/api/internal/items"
)

// Deps are the module seams the router composes.
type Deps struct {
	Config    config.Config
	ItemsRepo items.ItemsRepo
	Users     auth.UserStore
	Tokens    auth.RefreshTokenStore
}

// New assembles and returns the gin engine. The api is bound to the
// engine; its OpenAPI document is served live at /openapi.json|yaml and
// committed at packages/contract/openapi.yaml (see cmd/specgen).
func New(deps Deps) (*gin.Engine, huma.API) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	cfg := deps.Config
	api := humagin.New(r, humaDefaultConfig())

	// The signer is the sole minter (decision 11): only this module
	// signs; everyone else verifies.
	signer := auth.NewSigner([]byte(cfg.JWTSigningKey), cfg.AccessTokenTTL, cfg.RefreshTokenTTL)

	requireAuth := auth.NewAuthModule(api, deps.Users, deps.Tokens, signer, cfg.RefreshTokenTTL)
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
		Description:  "A short-lived access token (decision 16), minted by /auth/login or /auth/register.",
	}

	return r, api
}

func humaDefaultConfig() huma.Config {
	c := huma.DefaultConfig("Starter API", "0.1.0")
	c.OpenAPI.Info.Description = "The scaffolded Go api: auth shim + items demo (decision 12/13)."
	return c
}
`;
}

function migrationsItemsSql(): string {
  return `-- The one disposable demo domain (decision 13): a single table that
-- exercises the whole stack end-to-end on day one.
CREATE TABLE items (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
`;
}

function migrationsUsersSql(): string {
  return `-- Auth shim users (decision 12): email + argon2id hash.
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
`;
}

function migrationsRefreshTokensSql(): string {
  return `-- Refresh-token rotation store (decision 12): tokens are recognised by
-- jti; revocation prevents future rotation.
CREATE TABLE refresh_tokens (
    jti        text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
`;
}

function itemsRepoTestGo(): string {
  return `// items.repo_test.go — unit tests for the items repo layer (decision
// 22): tested in isolation against its real dependency (a test DB).
// Skips cleanly when DATABASE_URL is unset, mirroring the TS shapes'
// describeDb skip pattern.
//
// Every test run works in its own Postgres schema (search_path), so
// parallel packages (auth, contract) never see each other's rows.
package items

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"starter/apps/api/internal/db"
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL unset — skipping items repo test (needs a real Postgres)")
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

func TestPGItemsRepoRoundTrip(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()

	// Fresh schema for this test run: migrate, then assert against it.
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if _, err := pool.Exec(ctx, "TRUNCATE items"); err != nil {
		t.Fatalf("truncate: %v", err)
	}

	repo := NewPGItemsRepo(pool)

	// Empty list first.
	items, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 0 {
		t.Fatalf("expected empty list, got %d items", len(items))
	}

	// Create round-trips the row with an id + timestamp.
	created, err := repo.Create(ctx, "first item")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if created.ID == "" {
		t.Error("create: expected a generated id")
	}
	if created.Name != "first item" {
		t.Errorf("create: name = %q, want %q", created.Name, "first item")
	}
	if created.CreatedAt.IsZero() {
		t.Error("create: expected created_at to be set")
	}

	// List returns it.
	items, err = repo.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("list: expected 1 item, got %d", len(items))
	}
	if items[0].ID != created.ID || items[0].Name != "first item" {
		t.Errorf("list: got %+v, want the created item", items[0])
	}
}

func TestPGItemsRepoNewestFirst(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	if _, err := db.Migrate(ctx, pool, "../../migrations"); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	repo := NewPGItemsRepo(pool)
	first, err := repo.Create(ctx, "older")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	second, err := repo.Create(ctx, "newer")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	items, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("list: expected 2 items, got %d", len(items))
	}
	if items[0].ID != second.ID || items[1].ID != first.ID {
		t.Errorf("list: expected newest-first order, got %q then %q", items[0].ID, items[1].ID)
	}
}
`;
}

function authPasswordsTestGo(): string {
  return `// passwords.test.go — auth shim unit tests (decision 22). Real
// golang.org/x/crypto/argon2, no mocks.
package auth

import (
	"strings"
	"testing"
)

func TestHashPasswordProducesPHCString(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$v=") {
		t.Errorf("hash = %q, want a $argon2id$ PHC string", hash)
	}
	// The starter owns the parameters (decision 12).
	if !strings.Contains(hash, "m=19456,t=2,p=1") {
		t.Errorf("hash = %q, want the starter's argon2id params (m=19456,t=2,p=1)", hash)
	}
}

func TestVerifyPasswordRoundTrip(t *testing.T) {
	hash, err := HashPassword("s3cret-password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !VerifyPassword(hash, "s3cret-password") {
		t.Error("verify: correct password should verify")
	}
	if VerifyPassword(hash, "wrong-password") {
		t.Error("verify: wrong password should fail")
	}
}

func TestHashPasswordSaltsEveryCall(t *testing.T) {
	a, err := HashPassword("same input")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	b, err := HashPassword("same input")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if a == b {
		t.Error("same input should produce different hashes (random salt)")
	}
	if !VerifyPassword(a, "same input") || !VerifyPassword(b, "same input") {
		t.Error("both hashes should verify")
	}
}

func TestVerifyPasswordGarbageHash(t *testing.T) {
	// Malformed input returns false, never an error.
	if VerifyPassword("not a hash", "anything") {
		t.Error("garbage hash should fail verification")
	}
}
`;
}

function authTokensTestGo(): string {
  return `// tokens.test.go — auth shim unit tests (decision 22). Real
// golang-jwt, no mocks.
package auth

import (
	"errors"
	"testing"
	"time"
)

var testKey = []byte("test-signing-key-that-is-at-least-32-characters!")

func TestSignVerifyRoundTrip(t *testing.T) {
	token, err := SignToken(testKey, "user-1", TokenKindAccess, "", time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	claims, err := VerifyToken(testKey, token)
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
	token, err := SignToken(testKey, "user-1", TokenKindAccess, "", time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	wrongKey := []byte("another-key-that-is-also-at-least-32-chars!")
	if _, err := VerifyToken(wrongKey, token); err == nil {
		t.Fatal("verify with the wrong key should fail")
	}
}

func TestVerifyExpiredToken(t *testing.T) {
	token, err := SignToken(testKey, "user-1", TokenKindAccess, "", -time.Minute)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	_, err = VerifyToken(testKey, token)
	if err == nil {
		t.Fatal("verify of an expired token should fail")
	}
	var invalid *InvalidTokenError
	if !errors.As(err, &invalid) {
		t.Errorf("err = %T, want *InvalidTokenError", err)
	}
}

func TestVerifyGarbage(t *testing.T) {
	if _, err := VerifyToken(testKey, "not-a-jwt"); err == nil {
		t.Fatal("verify of garbage should fail")
	}
}

func TestRefreshTokenCarriesJTI(t *testing.T) {
	token, err := SignToken(testKey, "user-1", TokenKindRefresh, "jti-123", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	claims, err := VerifyToken(testKey, token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.JTI != "jti-123" {
		t.Errorf("jti = %q, want jti-123", claims.JTI)
	}
}
`;
}

function authRefreshTestGo(): string {
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
	return NewSigner(testKey, time.Minute, time.Hour)
}

func TestIssueTokenPair(t *testing.T) {
	ctx := context.Background()
	store := newMemTokenStore()
	pair, err := IssueTokenPair(ctx, testSigner(t), store, "user-1")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if pair.Access == "" || pair.Refresh == "" {
		t.Fatal("issue: expected both tokens")
	}
	if pair.Access == pair.Refresh {
		t.Fatal("issue: access and refresh must differ")
	}
	claims, err := testSigner(t).Verify(ctx, pair.Refresh)
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

	// Unknown jti: signed with a jti never recorded in the store.
	fake, err := SignToken(testKey, "user-1", TokenKindRefresh, "never-recorded", time.Hour)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := RotateTokenPair(ctx, signer, store, fake); err == nil {
		t.Fatal("rotate with an unknown jti should fail")
	}

	// Expired refresh token.
	expired, err := SignToken(testKey, "user-1", TokenKindRefresh, "expired-jti", -time.Minute)
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

function authRepoTestGo(): string {
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

	"starter/apps/api/internal/db"
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

function dbTestpoolGo(): string {
  return `package db

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewTestPool opens a pool scoped to a freshly created, randomly named
// schema, so tests in different packages never share rows. Returns the
// pool and the schema name (the caller drops the schema on cleanup).
func NewTestPool(ctx context.Context, url string) (*pgxpool.Pool, string, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, "", fmt.Errorf("db: parse url: %w", err)
	}
	schema := "test_" + randomSuffix()
	if cfg.ConnConfig.RuntimeParams == nil {
		cfg.ConnConfig.RuntimeParams = map[string]string{}
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, "", fmt.Errorf("db: open pool: %w", err)
	}
	if _, err := pool.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		pool.Close()
		return nil, "", fmt.Errorf("db: create schema: %w", err)
	}
	return pool, schema, nil
}

func randomSuffix() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "fallback"
	}
	return hex.EncodeToString(b)
}
`;
}

function contractTestGo(): string {
  return `// contract_test.go — contract tests for the polyglot spine (decision
// 22/19): validate the committed packages/contract/openapi.yaml against
// the running Go server, schema-checking each route.
//
// Two levels, matching the Go-as-canonical-side rule (decision 19):
//
//  1. The committed spec must equal the live spec the server serves.
//     If the Go structs drift from the committed file, this fails —
//     the "regenerate from Go and commit" contract.
//  2. Each route in the committed spec must behave per its schema:
//     public auth routes answer 2xx with bodies matching their
//     response schemas; /items answers 401 without a Bearer token and
//     2xx with one; every response body's keys are checked against the
//     response schema declared in the committed spec.
//
// The behavioral level needs a real Postgres (the auth shim + items
// repo run against one); it skips cleanly when DATABASE_URL is unset.
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

	"starter/apps/api/internal/auth"
	"starter/apps/api/internal/config"
	"starter/apps/api/internal/db"
	"starter/apps/api/internal/items"
	"starter/apps/api/internal/router"
)

const committedSpecPath = "../../packages/contract/openapi.yaml"

// ---- spec loading -------------------------------------------------------

func loadCommittedSpec(t *testing.T) map[string]any {
	t.Helper()
	raw, err := os.ReadFile(committedSpecPath)
	if err != nil {
		t.Fatalf("read committed openapi.yaml: %v — run \`task contract:generate\` and commit it (decision 19)", err)
	}
	var doc map[string]any
	if err := yaml.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse committed openapi.yaml: %v", err)
	}
	// Normalize through JSON so numbers are float64, exactly as the
	// live spec parse produces (yaml.v3 gives int, json float64).
	normalized, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("normalize committed openapi.yaml: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(normalized, &out); err != nil {
		t.Fatalf("normalize committed openapi.yaml: %v", err)
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
		t.Fatalf("committed openapi.yaml differs from the live spec.\\ncommitted:\\n%s\\n\\nlive:\\n%s", cd, ld)
	}
}

func TestCommittedSpecDocumentsTheRoutes(t *testing.T) {
	committed := loadCommittedSpec(t)
	paths, ok := committed["paths"].(map[string]any)
	if !ok {
		t.Fatalf("spec has no paths: %v", committed["paths"])
	}
	// Decision 13 (items demo) + decision 12 (the four auth endpoints).
	for _, p := range []string{"/items", "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout"} {
		if _, ok := paths[p]; !ok {
			t.Errorf("committed spec is missing path %s", p)
		}
	}
	// The protected /items operations declare the bearer security
	// requirement (the spec honestly documents the gate, decision 13).
	items := paths["/items"].(map[string]any)
	for _, m := range []string{"get", "post"} {
		op, _ := items[m].(map[string]any)
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

func testDeps(t *testing.T, pool *pgxpool.Pool) router.Deps {
	t.Helper()
	return router.Deps{
		Config: config.Config{
			DatabaseURL:     os.Getenv("DATABASE_URL"),
			JWTSigningKey:   "contract-test-signing-key-at-least-32-chars!",
			Port:            "0",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: time.Hour,
		},
		ItemsRepo: items.NewPGItemsRepo(pool),
		Users:     auth.NewPGUserStore(pool),
		Tokens:    auth.NewPGRefreshTokenStore(pool),
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
	for _, table := range []string{"items", "users", "refresh_tokens"} {
		if _, err := pool.Exec(ctx, "TRUNCATE "+table+" CASCADE"); err != nil {
			t.Fatalf("truncate %s: %v", table, err)
		}
	}

	// 1. Register -> 201, schema-checked pair + user; cookie is httpOnly.
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

	// 2. Duplicate register -> 409 (schema-checked error body).
	dup := client.request(t, "POST", "/auth/register", regBody, "")
	if dup.code != http.StatusConflict {
		t.Errorf("duplicate register -> %d, want 409", dup.code)
	}
	dup.schemaCheck("POST", "/auth/register", "409")

	// 3. Login with the wrong password -> 401; correct -> 200 pair.
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

	// 4. /items is protected: 401 without a token, 2xx with one.
	getItems := client.request(t, "GET", "/items", nil, "")
	if getItems.code != http.StatusUnauthorized {
		t.Errorf("GET /items without token -> %d, want 401", getItems.code)
	}
	getItems.schemaCheck("GET", "/items", "401")
	postItems := client.request(t, "POST", "/items", map[string]any{"name": "contract item"}, "")
	if postItems.code != http.StatusUnauthorized {
		t.Errorf("POST /items without token -> %d, want 401", postItems.code)
	}

	// 5. With the access token: empty list, create, list again.
	empty := client.request(t, "GET", "/items", nil, "Bearer "+loginOut.Access)
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
	created := client.request(t, "POST", "/items", map[string]any{"name": "contract item"}, "Bearer "+loginOut.Access)
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
	listedAgain := client.request(t, "GET", "/items", nil, "Bearer "+loginOut.Access)
	var after []map[string]any
	_ = json.Unmarshal(listedAgain.body, &after)
	if len(after) != 1 || after[0]["id"] != item["id"] {
		t.Errorf("list after create = %v, want the created item", after)
	}

	// 6. Refresh via the cookie: new pair, old refresh revoked.
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

	// 7. Logout -> 204 + cleared cookie; the refreshed token is dead.
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

	// 8. Every route in the committed spec answers (no 404s) — the
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
	// import sort would be cleaner; keep it dependency-light for tests.
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

export { goMod, goSum, goEnvExample, apiMainGo, migrateMainGo, specgenMainGo, configGo, dbGo, migrateGo, itemsItemGo, itemsRepoGo, itemsRepoPgGo, itemsRoutesGo, itemsIndexGo, authPasswordsGo, authTokensGo, authRefreshGo, authRepoGo, authRepoPgGo, authRoutesGo, authMiddlewareGo, authIndexGo, routerGo, migrationsItemsSql, migrationsUsersSql, migrationsRefreshTokensSql, itemsRepoTestGo, authPasswordsTestGo, authTokensTestGo, authRefreshTestGo, authRepoTestGo, dbTestpoolGo, contractTestGo };
