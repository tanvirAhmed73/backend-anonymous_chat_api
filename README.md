# Anonymous Chat API (Backend)

Real-time group chat: **NestJS**, **PostgreSQL** (Drizzle), **Redis**, **Socket.IO**. HTTP API under `/api/v1`; WebSocket namespace `/chat`.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Docker** and Docker Compose (for Postgres + Redis locally)

## Quick start (local)

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

Wait until both services are healthy (`docker compose ps`).

### 2. Environment

```bash
cp .env.example .env
```

Adjust `DATABASE_URL`, `REDIS_URL`, and `PORT` if needed. Defaults match `docker-compose.yml`.

### 3. Install and migrate

```bash
npm install
npm run db:migrate
```

### 4. Run the API

```bash
npm run start:dev
```

The HTTP server listens on `PORT` (default **3000**).

- **REST base URL:** `http://localhost:3000/api/v1`
- **WebSocket:** `ws://localhost:3000/chat?token=<sessionToken>&roomId=<roomId>`  
  (Use `wss://` in production when TLS terminates correctly.)

### Quick smoke test

```bash
# Login (no auth header)
curl -s -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_user"}'

# Use returned sessionToken as Bearer for subsequent calls
```

See the interview brief / Postman collection you were given for full contract tests.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Dev server with reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app (`node dist/main`) |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run test` | Unit tests |
| `npm run test:e2e` | HTTP e2e (WebSockets disabled via env — see below) |
| `npm run lint` | ESLint |

## Testing notes

- **`DISABLE_WEBSOCKET=true`** — Skips loading the Socket.IO module. Used by default in **`test/jest-e2e-setup.ts`** so HTTP e2e does not require extra Redis/WebSocket teardown. **Unset** for normal runs so `/chat` is available.
- Full-stack manual checks need Postgres, Redis, migrated DB, and a Socket.IO client (see contract).

## Deployment

Deploy this repo to any platform that provides:

1. **Node** process running `npm run build` then `npm run start:prod` (or `node dist/main`).
2. **PostgreSQL** — set `DATABASE_URL`.
3. **Redis** — set `REDIS_URL` (required for sessions, presence, Socket.IO adapter, and `chat:events` pub/sub).
4. **WebSockets** — enable sticky sessions if you run **multiple** HTTP/WebSocket instances behind a load balancer (same requirement as Socket.IO horizontal scaling).

Example paths:

- **[Render](https://render.com):** Web Service + PostgreSQL + Redis; set env vars; use `npm ci && npm run build && npm run db:migrate && npm run start:prod` or split migrate as a release command.
- **Railway / Fly.io / AWS:** Same shape — managed Postgres + Redis (or ElastiCache) + env configuration.

### Deployed application URL

After you deploy, add your public base URL here (for reviewers):

`<!-- Example: https://your-service.onrender.com -->`

---

Design and scaling notes are in **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
