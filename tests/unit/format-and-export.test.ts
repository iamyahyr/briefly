import { describe, expect, it } from "vitest";
import { answerToText, toHref, type FormatLabels } from "@/lib/answer-format";
import {
  toJson,
  toMarkdown,
  zipFilePaths,
  type ExportInput,
  type ExportStrings,
} from "@/server/export/build";
import { localBusiness } from "@/templates/local-business";
import type { FieldDefinition } from "@/templates/types";

const labels: FormatLabels = { day: (d) => d.toUpperCase(), network: (n) => n, closed: "Closed" };
const field = (key: string) => localBusiness.sections.flatMap((s) => s.fields).find((f) => f.key === key)!;

describe("toHref", () => {
  it("only produces http(s) links", () => {
    expect(toHref("cafeterianube.com")).toBe("https://cafeterianube.com");
    expect(toHref("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
    expect(toHref("javascript:alert(1)")).toBeNull();
    expect(toHref("@cafeterianube")).toBeNull();
  });
});

describe("answerToText", () => {
  it("uses option labels in the requested language", () => {
    expect(answerToText(field("website_goals"), ["calls", "Instagram shop"], "es", labels)).toBe(
      "Recibir llamadas o mensajes, Instagram shop",
    );
  });

  it("formats opening hours and skips empty days", () => {
    const hours = {
      mon: { closed: false, ranges: [{ open: "08:00", close: "14:00" }] },
      tue: { closed: false, ranges: [] },
      wed: { closed: false, ranges: [] },
      thu: { closed: false, ranges: [] },
      fri: { closed: false, ranges: [] },
      sat: { closed: false, ranges: [] },
      sun: { closed: true, ranges: [] },
    };
    expect(answerToText(field("opening_hours"), hours, "en", labels)).toBe("MON: 08:00–14:00\nSUN: Closed");
  });

  it("returns an empty string for notices and empty answers", () => {
    expect(answerToText(field("no_passwords_notice") as FieldDefinition, undefined, "en", labels)).toBe("");
    expect(answerToText(field("services"), [{ title: "", description: "" }], "en", labels)).toBe("");
  });
});

const input: ExportInput = {
  brief: {
    id: "b1",
    title: "Web *Nube*",
    status: "received",
    locale: "es",
    templateVersion: 1,
    dueDate: null,
    submittedAt: new Date("2026-10-01T10:00:00Z"),
  },
  template: localBusiness,
  client: { name: "Cafetería Nube", email: "hola@nube.test", phone: null },
  answers: { business_name: "Cafetería Nube", website_goals: ["menu"] },
  files: [
    { id: "f1", fieldKey: "logo", originalName: "logo.png", mimeType: "image/png", sizeBytes: 10 },
    { id: "f2", fieldKey: "logo", originalName: "logo.png", mimeType: "image/png", sizeBytes: 12 },
  ],
};

const strings: ExportStrings = {
  labels,
  client: "Client",
  status: "Status",
  statusValue: "Received",
  submitted: "Submitted",
  files: "Files",
  noAnswer: "No answer",
  generatedWith: "Generated with Briefly",
  formatDate: (d) => d.toISOString(),
};

describe("exports", () => {
  it("builds Markdown with every section and escaped user text", () => {
    const md = toMarkdown(input, "en", strings, (f) => `files/${f.id}`);
    expect(md).toContain("# Web \\*Nube\\*");
    expect(md).toContain("## 1. Your business");
    expect(md).toContain("## 5. Practical details");
    expect(md).toContain("Show menu, catalogue or prices");
    expect(md).toContain("- [logo.png](files/f1)");
    expect(md).not.toContain("Never write passwords");
  });

  it("builds JSON with raw values and readable text", () => {
    const json = toJson(input, "es", labels);
    const goals = json.sections[1]!.fields.find((f) => f.key === "website_goals");
    expect(goals).toMatchObject({ value: ["menu"], text: "Mostrar carta, catálogo o precios" });
    const logo = json.sections[2]!.fields.find((f) => f.key === "logo");
    expect(logo && "files" in logo && logo.files).toHaveLength(2);
  });

  it("gives files unique paths inside the ZIP", () => {
    const paths = zipFilePaths(input.files);
    expect(paths.get("f1")).toBe("files/logo/logo.png");
    expect(paths.get("f2")).toBe("files/logo/2-logo.png");
  });
});
