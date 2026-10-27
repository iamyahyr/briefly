# Writing a template

A template is a TypeScript object describing the questionnaire: sections (one per step) made of fields. The same definition drives the client questionnaire, validation, the review screen and the exports — you don't write any UI.

## 1. Create the file

`src/templates/photographer.ts`:

```ts
import type { TemplateDefinition } from "./types";

export const photographer: TemplateDefinition = {
  key: "photographer",
  version: 1,
  name: { es: "Web para fotógrafo", en: "Photographer website" },
  description: {
    es: "Portfolio, servicios y reservas de sesiones.",
    en: "Portfolio, services and session bookings.",
  },
  sections: [
    {
      key: "about",
      title: { es: "Sobre ti", en: "About you" },
      fields: [
        {
          key: "studio_name",
          type: "text",
          required: true,
          label: { es: "Nombre profesional", en: "Professional name" },
        },
        {
          key: "specialties",
          type: "multiselect",
          allowOther: true,
          label: { es: "Especialidades", en: "Specialties" },
          options: [
            { value: "weddings", label: { es: "Bodas", en: "Weddings" } },
            { value: "portraits", label: { es: "Retratos", en: "Portraits" } },
          ],
        },
        {
          key: "portfolio",
          type: "file",
          accept: ["image"],
          maxFiles: 20,
          label: { es: "Fotos para el portfolio", en: "Portfolio photos" },
        },
      ],
    },
  ],
};
```

## 2. Register it

Add it to `src/templates/registry.ts`:

```ts
export const templates: TemplateDefinition[] = [localBusiness, photographer];
```

That's it — it now appears in **New brief**. Run `pnpm test` to check that every label exists in every language and that keys are unique.

## Field types

| `type`                          | Value stored                                        | Options                                               |
| ------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `text`, `textarea`              | string                                              | `maxLength`, `rows` (textarea)                        |
| `email`, `phone`, `url`, `date` | string                                              | format checked on submit                              |
| `select`                        | string                                              | `options`                                             |
| `multiselect`                   | string[]                                            | `options`, `allowOther`                               |
| `weekly-hours`                  | `{ mon: { closed, ranges: [{ open, close }] }, … }` | —                                                     |
| `social-links`                  | `{ instagram: "…", … }`                             | `networks` (keys under `fields.networks` in messages) |
| `colors`                        | string[] of `#rrggbb`                               | `max`                                                 |
| `references`                    | `[{ url, note }]`                                   | `count`                                               |
| `list`                          | `[{ title, description }]`                          | `itemLabel`, `descriptionLabel`, `max`                |
| `file`                          | uploads (not an answer)                             | `accept: ("image" \| "svg" \| "pdf")[]`, `maxFiles`   |
| `notice`                        | —                                                   | `tone: "info" \| "warning"`, `text`                   |

Every field also accepts `required`, `help` and `placeholder` (localized).

## Rules

- **Keys are forever.** `key` is how answers are stored. Once a template is released, don't rename or reuse keys; add new ones instead and bump `version`.
- **Briefs keep their snapshot.** Changing a template never alters briefs already created.
- **Never ask for passwords.** If the website will need access to a service, ask which services exist and add a `notice` saying access will be arranged separately.
- **Keep it short.** Each section is one step on a phone screen; 3–8 fields per section works well. Prefer `select`/`multiselect` over free text when you can.
- **Translate everything** in every supported language.
