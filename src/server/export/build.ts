import { answerToText, type FormatLabels } from "@/lib/answer-format";
import type { BriefStatus } from "@/server/db/schema";
import { isAnswerField, type AnswerMap, type Locale, type TemplateDefinition } from "@/templates/types";

export type ExportFile = {
  id: string;
  fieldKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ExportInput = {
  brief: {
    id: string;
    title: string;
    status: BriefStatus;
    locale: Locale;
    templateVersion: number;
    dueDate: string | null;
    submittedAt: Date | null;
  };
  template: TemplateDefinition;
  client: { name: string; email: string | null; phone: string | null };
  answers: AnswerMap;
  files: ExportFile[];
};

export type ExportStrings = {
  labels: FormatLabels;
  client: string;
  status: string;
  statusValue: string;
  submitted: string;
  files: string;
  noAnswer: string;
  generatedWith: string;
  formatDate: (date: Date) => string;
};

/** Paths used inside the ZIP export; unique even when clients upload files with the same name. */
export function zipFilePaths(files: ExportFile[]): Map<string, string> {
  const paths = new Map<string, string>();
  const used = new Set<string>();
  for (const file of files) {
    const safe = file.originalName.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(-100) || "file";
    let path = `files/${file.fieldKey}/${safe}`;
    for (let i = 2; used.has(path); i++) path = `files/${file.fieldKey}/${i}-${safe}`;
    used.add(path);
    paths.set(file.id, path);
  }
  return paths;
}

const escapeMd = (text: string) => text.replace(/([\\`*_[\]#<>|])/g, "\\$1");

/**
 * Markdown export. `fileLink` decides where file entries point to: the app URL
 * for a standalone .md, or relative paths inside the ZIP.
 */
export function toMarkdown(
  input: ExportInput,
  locale: Locale,
  strings: ExportStrings,
  fileLink: (file: ExportFile) => string,
): string {
  const { brief, template, client, answers, files } = input;
  const lines: string[] = [`# ${escapeMd(brief.title)}`, ""];
  lines.push(`- **${strings.client}:** ${escapeMd(client.name)}`);
  if (client.email) lines.push(`- **Email:** ${client.email}`);
  lines.push(`- **${strings.status}:** ${strings.statusValue}`);
  if (brief.submittedAt) lines.push(`- **${strings.submitted}:** ${strings.formatDate(brief.submittedAt)}`);
  lines.push("");

  template.sections.forEach((section, index) => {
    lines.push(`## ${index + 1}. ${escapeMd(section.title[locale])}`, "");
    for (const field of section.fields) {
      if (field.type === "notice") continue;
      lines.push(`### ${escapeMd(field.label[locale])}`, "");
      if (field.type === "file") {
        const fieldFiles = files.filter((f) => f.fieldKey === field.key);
        if (!fieldFiles.length) lines.push(`_${strings.noAnswer}_`);
        for (const file of fieldFiles)
          lines.push(`- [${escapeMd(file.originalName)}](${encodeURI(fileLink(file))})`);
      } else if (isAnswerField(field)) {
        const text = answerToText(field, answers[field.key], locale, strings.labels);
        lines.push(text ? text : `_${strings.noAnswer}_`);
      }
      lines.push("");
    }
  });

  lines.push("---", `_${strings.generatedWith}_`, "");
  return lines.join("\n");
}

export function toJson(input: ExportInput, locale: Locale, labels: FormatLabels) {
  const { brief, template, client, answers, files } = input;
  return {
    brief: {
      id: brief.id,
      title: brief.title,
      status: brief.status,
      locale: brief.locale,
      template: { key: template.key, version: brief.templateVersion },
      dueDate: brief.dueDate,
      submittedAt: brief.submittedAt?.toISOString() ?? null,
    },
    client,
    sections: template.sections.map((section) => ({
      key: section.key,
      title: section.title[locale],
      fields: section.fields
        .filter((f) => f.type !== "notice")
        .map((field) => ({
          key: field.key,
          type: field.type,
          label: "label" in field ? field.label[locale] : "",
          ...(field.type === "file"
            ? {
                files: files
                  .filter((f) => f.fieldKey === field.key)
                  .map((f) => ({
                    id: f.id,
                    name: f.originalName,
                    mimeType: f.mimeType,
                    sizeBytes: f.sizeBytes,
                  })),
              }
            : {
                value: answers[field.key] ?? null,
                text: isAnswerField(field) ? answerToText(field, answers[field.key], locale, labels) : "",
              }),
        })),
    })),
  };
}
