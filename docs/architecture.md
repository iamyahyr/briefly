# Architecture

Briefly is a single Next.js application backed by PostgreSQL and a file store. There is no separate API service and no background worker.

```
Browser (freelancer) ──► Next.js pages & server actions ──► DAL ──► PostgreSQL
Browser (client)     ──► /b/[token] + /api/public/[token]/… ──┘  └──► Storage (disk or S3)
```

## Layout

| Path                           | Purpose                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(main)`               | Landing, auth pages and the signed-in app (dashboard, clients, briefs, settings). Root layout uses the visitor's language. |
| `src/app/(public)/b/[token]`   | The client questionnaire. A separate root layout so the page language follows the brief.                                   |
| `src/app/api`                  | Route handlers: auth, file downloads, public uploads, exports, health check.                                               |
| `src/server/dal`               | **Data access layer.** The only code that talks to the database.                                                           |
| `src/server/actions`           | Server actions used by forms. Thin: authenticate, call the DAL, revalidate.                                                |
| `src/server/security`          | Tokens, file validation, rate limiting.                                                                                    |
| `src/server/storage`           | `StorageDriver` interface with local-disk and S3 implementations.                                                          |
| `src/server/export`            | Markdown / JSON builders shared by the export endpoint.                                                                    |
| `src/templates`                | Declarative templates and the Zod schema builder.                                                                          |
| `src/components/questionnaire` | The client questionnaire (stepper, autosave, field inputs).                                                                |
| `messages/`                    | UI translations (`es`, `en`).                                                                                              |
| `drizzle/`                     | SQL migrations, applied automatically on start.                                                                            |

## Rendering model

Almost every page is per-user, so the app uses request-time rendering (`cacheComponents: false`) instead of Cache Components. Mutations use server actions plus `revalidatePath`. Uploads and downloads use route handlers so they can stream and report progress.

## Data model

- `user`, `session`, `account`, `verification`, `rate_limit` — managed by Better Auth.
- `clients` — belongs to an owner.
- `briefs` — belongs to an owner and a client. Stores `template_snapshot` (a frozen copy of the template), `status`, `current_step` and a cached `progress` percentage.
- `brief_access` — private links: `token_hash` (SHA-256, unique) and `token_ciphertext` (AES-256-GCM, so the owner can copy the link again), optional `expires_at`, `revoked_at`.
- `answers` — one row per `(brief_id, field_key)` with a JSON value. Empty answers are deleted rather than stored.
- `uploads` — file metadata; the bytes live in storage under random keys.
- `notifications` — in-app notifications (currently “brief submitted”).
- `workspace_settings` — branding shown on questionnaires.

### Brief lifecycle

```
draft ──(link created)──► waiting ──(client submits)──► received ──(owner)──► completed
                              ▲                              │                    │
                              └──────────(owner reopens)─────┴────────────────────┘
```

Only `waiting` briefs accept answers or uploads; the check happens on the server for every write, and submission uses a conditional update so double submits can't both succeed.

## Templates and validation

Templates are TypeScript objects (`src/templates/*.ts`). `schema-builder.ts` turns them into Zod schemas that run **both in the browser and on the server**:

- `draft` mode (autosave): only shape and length are checked, so half-typed values are kept.
- `submit` mode (next step, final submission): required fields and formats (email, URL, phone, date).

Schemas are strict: unknown keys are rejected, so the browser can't store arbitrary data.

## Security

- **Authorization**: every DAL function for owners takes the user id and filters by it; missing or foreign resources throw `not_found` (rendered as 404 — existence is never revealed). Pages, actions and route handlers call `requireUser()` themselves; `proxy.ts` only does an optimistic redirect.
- **Client links**: 32 random bytes (base64url). Lookups use the SHA-256 hash; revoked, expired or malformed tokens are indistinguishable from unknown ones. `Referrer-Policy: no-referrer` on `/b/*` prevents leaking the token.
- **Uploads**: type detected from bytes with an allow-list per field (`image`, `svg`, `pdf`); per-file, per-field and per-brief limits; raster images are re-encoded with sharp (EXIF/GPS stripped, orientation applied) and thumbnailed; original names are sanitised metadata only. Files are served through authorised routes with `nosniff` and a sandboxing CSP; SVGs are always downloaded, never rendered inline as documents.
- **Abuse**: public endpoints are rate-limited per token and IP (in memory — put a proxy limiter in front when running several replicas). Better Auth rate-limits sign-in and sign-up.
- **No passwords in briefs**: templates show a warning instead of asking for credentials.

## Testing

- `tests/unit` — schema builder, security helpers, formatting/exports, translation completeness.
- `tests/integration` — the DAL against a real PostgreSQL: isolation between users, link lifecycle, drafts, submission, uploads and quotas.
- `tests/e2e` — Playwright: freelancer creates a brief, client completes it on a phone (including upload and reload), freelancer reviews and exports.
