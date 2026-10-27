# Self-hosting

Briefly runs as one container plus PostgreSQL. Files are stored on a Docker volume by default, or in any S3-compatible bucket.

## 1. Configure

```bash
git clone https://github.com/iamyahyr/briefly.git && cd briefly
cp .env.example .env
```

Required in `.env`:

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`. Changing it signs everyone out and makes existing client links impossible to copy again from the dashboard (they keep working).
- `APP_URL` — the public URL, e.g. `https://briefs.example.com`. Used in client links and auth callbacks.
- `POSTGRES_PASSWORD` — optional but recommended; used by Compose for the bundled database.

## 2. Start

```bash
docker compose up -d
```

Migrations run automatically on start (set `RUN_MIGRATIONS_ON_START=false` to manage them yourself). Check `http://localhost:3000/api/health`.

Create your account, then set `DISABLE_SIGNUP=true` and run `docker compose up -d` again if the instance is just for you.

## 3. HTTPS

Put Briefly behind a reverse proxy that terminates TLS and forwards the original host. With [Caddy](https://caddyserver.com):

```
briefs.example.com {
  reverse_proxy localhost:3000
}
```

Make sure the proxy sends `X-Forwarded-For` (used for rate limiting) and `X-Forwarded-Host`.

## Storage on S3, R2 or MinIO

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # omit for AWS
S3_REGION=auto
S3_BUCKET=briefly
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_FORCE_PATH_STYLE=true                                 # MinIO and most self-hosted services
```

The bucket must be **private**; Briefly streams files through its own authorised routes. To try it locally: `docker compose --profile s3 up -d` starts MinIO on port 9000 (console on 9001) — create the bucket there first.

## Email

Without SMTP, password-reset links are printed in the server log (`docker compose logs app`). To send them by email:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM="Briefly <no-reply@example.com>"
```

## Backups

Back up both the database and the uploads:

```bash
docker compose exec db pg_dump -U briefly briefly > briefly-$(date +%F).sql
docker run --rm -v briefly_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

## Upgrading

```bash
git pull
docker compose up -d --build
```

Or use the published image (`ghcr.io/iamyahyr/briefly:<version>`) and pin a version in `docker-compose.yml`. Read the [changelog](../CHANGELOG.md) before major upgrades.

## Running without Docker

```bash
pnpm install --frozen-lockfile
NEXT_OUTPUT=standalone pnpm build
cp -r .next/static .next/standalone/.next/ && cp -r public drizzle .next/standalone/
cd .next/standalone && node server.js
```

Set the same environment variables as above.
