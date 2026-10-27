import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { templates } from "@/templates/registry";
import { ERROR_CODES } from "@/templates/schema-builder";
import { LOCALES } from "@/templates/types";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("Spanish and English define exactly the same keys", () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
  });

  it("every validation error code has a message", () => {
    for (const code of ERROR_CODES) expect(en.errors).toHaveProperty(code);
  });
});

describe("templates", () => {
  it.each(templates.map((t) => [t.key, t] as const))("%s is complete in every language", (_, template) => {
    const seen = new Set<string>();
    for (const locale of LOCALES) {
      expect(template.name[locale]).toBeTruthy();
      for (const section of template.sections) {
        expect(section.title[locale]).toBeTruthy();
        for (const field of section.fields) {
          if (field.type === "notice") expect(field.text[locale]).toBeTruthy();
          else expect(field.label[locale]).toBeTruthy();
          if ("options" in field) for (const o of field.options) expect(o.label[locale]).toBeTruthy();
        }
      }
    }
    for (const field of template.sections.flatMap((s) => s.fields)) {
      expect(seen.has(field.key), `duplicate key ${field.key}`).toBe(false);
      seen.add(field.key);
      expect(field.key).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
