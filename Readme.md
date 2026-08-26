# Server with TypeScript, PostgreSQL, Prisma and Zod validation

Express backend template. Runtime is **Bun**. Database is **PostgreSQL** via Prisma.

## Prerequisites

- **Bun**
- **Docker** (local Postgres / pgAdmin) or your own **PostgreSQL** 16+

## How to run

### 1. Install

```bash
bun install
```

### 2. Environment files

The app loads `.env` first, then overrides with `.env.development` or `.env.production` (see `src/config/index.ts`). Docker Compose also reads `.env` automatically.

```bash
cp .env.example .env
cp .env.development.example .env.development
```

For production deploys, also copy `.env.production.example` → `.env.production` and fill real values.

Set `PROJECT_SLUG` in `.env` (lowercase, digits, hyphens). It is the Compose project name, Postgres database name, and the prefix for container names.

| File | Purpose |
|------|---------|
| `.env` | Common vars — names, ports, Docker credentials, Firebase, mail, storage |
| `.env.development` | Dev overrides — JWT, `BASE_URL_*` (no Docker `DATABASE_URL` needed) |
| `.env.production` | Prod overrides — explicit `DATABASE_URL`, JWT, `BASE_URL_*` |

In development, `DATABASE_URL` is built from `PROJECT_SLUG`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_PORT` in `.env` when unset. Production always uses `DATABASE_URL` from `.env.production`.

### 3. Local database (Docker)

```bash
bun run docker:up
```

Or:

```bash
docker compose --profile local up -d
```

Ports and credentials come from `.env` (`PORT`, `POSTGRES_PORT`, `PGADMIN_PORT`, `POSTGRES_*`, `PGADMIN_*`).

### 4. Database migrate

```bash
bun run pm          # prisma migrate dev
bun run pgen        # prisma generate
```

### 5. Run development

```bash
bun run start:dev
```

### Production build

```bash
cp .env.production.example .env.production   # if not already created
bun run build
bun run start:prod
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run start:dev` | Dev server with watch (Bun) |
| `bun run start:prod` | Run compiled `dist/server.js` |
| `bun run build` | TypeScript compile |
| `bun run prod:build` | Install, migrate deploy, generate, build |
| `bun run docker:up` | Start local Postgres + pgAdmin |
| `bun run docker:down` | Stop local Docker stack |
| `bun run pm` | `prisma migrate dev` |
| `bun run pgen` | `prisma generate` |
| `bun run studio` | Prisma Studio on port `7548` |
| `bun run check:types` | TypeScript check |
| `bun run dbpush` | `prisma db push` |
| `bun run pm:reset` | `prisma migrate reset` |

## Technology used

- PostgreSQL (Database)
- Prisma ORM
- Express
- TypeScript
- Bun
- Zod (Validation)
- Session cookies
- Bcrypt (Hashing)

Happy Coding
