# Contributing to Briefly

Thanks for helping! Briefly aims to be a small, dependable tool that freelancers can self-host without surprises. Contributions of any size are welcome — translations, templates, bug fixes, docs and features from the [roadmap](ROADMAP.md).

> ¿Prefieres escribir en español? Adelante: issues y pull requests en español o inglés son bienvenidos.

## Getting set up

Follow the **Development** section of the [README](README.md#development). In short:

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate && pnpm db:seed
pnpm dev
```

## Good first contributions

- **A new template** (photographer, hair salon, clinic, online shop…) — see [docs/templates.md](docs/templates.md).
- **A new language** — copy `messages/en.json`, translate it and add the locale to `LOCALES` in `src/templates/types.ts`. Templates need the new language too.
- Issues labelled [`good first issue`](https://github.com/iamyahyr/briefly/labels/good%20first%20issue).

For larger changes, please open an issue first so we can agree on the approach.

## Ground rules

- **Data access goes through `src/server/dal/`.** Every owner query must be scoped by `ownerId`; public access must go through `resolveToken()`. Pages, actions and route handlers never query the database directly.
- **Every user-facing string is translated** in both `messages/es.json` and `messages/en.json` (a unit test checks the keys match).
- **Never ask clients for passwords** in templates. Use a `notice` field and coordinate access another way.
- **Templates are append-only once released**: don't rename field keys; bump `version` when you change fields.
- Keep dependencies lean and avoid features that require a paid third-party service.

## Before opening a pull request

```bash
pnpm lint && pnpm typecheck && pnpm format:check
pnpm test
pnpm test:integration   # if you touched the data layer
pnpm test:e2e           # if you touched the questionnaire or review flow
```

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`…).
- Add or update tests for behaviour changes, especially anything related to permissions, links or uploads.
- Check UI changes on a phone-sized screen and in both languages.
- Schema changes need a migration: edit `src/server/db/schema.ts`, then `pnpm db:generate`.

## Licence

By contributing you agree that your contributions are licensed under the [AGPL-3.0](LICENSE).
