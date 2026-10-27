import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { answers, briefs, notifications } from "@/server/db/schema";
import {
  completion,
  isEmptyValue,
  templateSchema,
  validateForSubmit,
  type FieldErrors,
} from "@/templates/schema-builder";
import { allFields } from "@/templates/schema-builder";
import type { AnswerMap, AnswerValue, FileField } from "@/templates/types";
import type { PublicBrief } from "./access";
import { DomainError } from "./errors";
import { deleteBriefUpload, fileCountsByField, storeUpload } from "./uploads";

/**
 * Data access for the public questionnaire. Every function receives a brief
 * already resolved from a valid token (see resolveToken).
 */

function assertEditable(brief: PublicBrief) {
  if (brief.status !== "waiting") throw new DomainError("locked");
}

export async function getAnswers(briefId: string): Promise<AnswerMap> {
  const rows = await db.select().from(answers).where(eq(answers.briefId, briefId));
  return Object.fromEntries(rows.map((r) => [r.fieldKey, r.value]));
}

async function refreshProgress(brief: PublicBrief, extra: { currentStep?: number } = {}) {
  const [answerMap, fileCounts] = await Promise.all([getAnswers(brief.id), fileCountsByField(brief.id)]);
  const progress = completion(brief.template, answerMap, fileCounts);
  await db
    .update(briefs)
    .set({ progress, ...extra })
    .where(and(eq(briefs.id, brief.id), eq(briefs.status, "waiting")));
  return progress;
}

/** Autosave. Accepts partial answers; only shape and length are validated here. */
export async function saveDraft(brief: PublicBrief, values: unknown, currentStep: number) {
  assertEditable(brief);
  const parsed = templateSchema(brief.template, "draft").safeParse(values);
  if (!parsed.success) throw new DomainError("invalid_input");

  const step = Math.max(0, Math.min(Math.trunc(currentStep) || 0, brief.template.sections.length));
  const entries = Object.entries(parsed.data as AnswerMap).filter(
    (entry): entry is [string, AnswerValue] => entry[1] !== undefined,
  );

  await db.transaction(async (tx) => {
    for (const [fieldKey, value] of entries) {
      if (isEmptyValue(value)) {
        await tx.delete(answers).where(and(eq(answers.briefId, brief.id), eq(answers.fieldKey, fieldKey)));
      } else {
        await tx
          .insert(answers)
          .values({ briefId: brief.id, fieldKey, value })
          .onConflictDoUpdate({
            target: [answers.briefId, answers.fieldKey],
            set: { value, updatedAt: sql`now()` },
          });
      }
    }
  });

  return { progress: await refreshProgress(brief, { currentStep: step }) };
}

export type SubmitResult =
  { ok: true } | { ok: false; errors: FieldErrors; firstInvalidSection: number | null };

/** Final submission: validates everything, locks the brief and notifies the owner. */
export async function submitBrief(brief: PublicBrief): Promise<SubmitResult> {
  assertEditable(brief);
  const [answerMap, fileCounts] = await Promise.all([getAnswers(brief.id), fileCountsByField(brief.id)]);
  const { errors, firstInvalidSection } = validateForSubmit(brief.template, answerMap, fileCounts);
  if (Object.keys(errors).length) return { ok: false, errors, firstInvalidSection };

  const progress = completion(brief.template, answerMap, fileCounts);
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(briefs)
      .set({ status: "received", submittedAt: new Date(), progress })
      .where(and(eq(briefs.id, brief.id), eq(briefs.status, "waiting")))
      .returning({ id: briefs.id });
    // Someone else (double click, second tab) already submitted.
    if (!updated.length) throw new DomainError("locked");
    await tx
      .insert(notifications)
      .values({ ownerId: brief.ownerId, briefId: brief.id, type: "brief_submitted" });
  });
  return { ok: true };
}

function fileField(brief: PublicBrief, fieldKey: string): FileField {
  const field = allFields(brief.template).find((f) => f.key === fieldKey);
  if (!field || field.type !== "file") throw new DomainError("invalid_input");
  return field;
}

export async function uploadFile(
  brief: PublicBrief,
  fieldKey: string,
  file: { name: string; buffer: Buffer },
) {
  assertEditable(brief);
  const field = fileField(brief, fieldKey);
  const meta = await storeUpload({
    ownerId: brief.ownerId,
    briefId: brief.id,
    fieldKey,
    accept: field.accept,
    maxFiles: field.maxFiles,
    file,
  });
  const progress = await refreshProgress(brief);
  return { upload: meta, progress };
}

export async function removeFile(brief: PublicBrief, uploadId: string) {
  assertEditable(brief);
  await deleteBriefUpload(brief.id, uploadId);
  return { progress: await refreshProgress(brief) };
}
