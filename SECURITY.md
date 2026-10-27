# Security policy

Briefly handles client data and files, so security reports are taken seriously.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through
[GitHub security advisories](https://github.com/iamyahyr/briefly/security/advisories/new).

Include the steps to reproduce, the affected version or commit and the impact you expect. You should get a first answer within a few days. Once a fix is released you'll be credited in the advisory unless you prefer otherwise.

## Supported versions

Only the latest release receives security fixes.

## Security model (summary)

- Owner data is only reachable through the data access layer, which scopes every query by the signed-in user. Other users' resources return 404.
- Client links use 256-bit random tokens. Only a SHA-256 hash is used for lookups; an AES-GCM encrypted copy lets the owner copy the link again. Links can expire and be revoked.
- Uploads are validated by content (magic bytes) against an allow-list, size- and count-limited, re-encoded to strip metadata, stored under random keys and always served with `nosniff`, a sandboxing CSP and — for SVG — as downloads.
- Public endpoints are rate-limited; submitted briefs are locked server-side.
- Templates must never ask for passwords.

More detail in [docs/architecture.md](docs/architecture.md#security).
