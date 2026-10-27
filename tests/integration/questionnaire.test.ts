import { beforeEach, describe, expect, it } from "vitest";
import { resolveToken } from "@/server/dal/access";
import { getBriefDetail, markBriefCompleted, reopenBrief } from "@/server/dal/briefs";
import { listNotifications, unreadCount } from "@/server/dal/notifications";
import { getAnswers, removeFile, saveDraft, submitBrief, uploadFile } from "@/server/dal/questionnaire";
import { listBriefUploads } from "@/server/dal/uploads";
import { createSharedBrief, pdfBuffer, pngBuffer, resetDatabase } from "./helpers";

const REQUIRED = {
  business_name: "Cafetería Nube",
  description: "Café de especialidad y repostería casera.",
  website_goals: ["calls", "menu"],
  target_audience: "Vecinos y oficinistas.",
  services: [{ title: "Desayunos", description: "" }],
  languages: ["es", "en"],
};

async function setup() {
  const shared = await createSharedBrief();
  const brief = (await resolveToken(shared.token))!;
  return { ...shared, publicBrief: brief };
}

describe("questionnaire drafts", () => {
  beforeEach(resetDatabase);

  it("saves partial answers, keeps them across visits and tracks progress", async () => {
    const { publicBrief, token } = await setup();
    const { progress } = await saveDraft(publicBrief, { business_name: "Nube", contact_email: "hola@nu" }, 1);
    expect(progress).toBeGreaterThan(0);

    const again = (await resolveToken(token))!;
    expect(again.currentStep).toBe(1);
    expect(await getAnswers(again.id)).toEqual({ business_name: "Nube", contact_email: "hola@nu" });
  });

  it("removes answers that are cleared", async () => {
    const { publicBrief } = await setup();
    await saveDraft(publicBrief, { business_name: "Nube" }, 0);
    await saveDraft(publicBrief, { business_name: "   " }, 0);
    expect(await getAnswers(publicBrief.id)).toEqual({});
  });

  it("rejects unknown fields and wrong shapes", async () => {
    const { publicBrief } = await setup();
    await expect(saveDraft(publicBrief, { is_admin: true }, 0)).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(saveDraft(publicBrief, { colors: "red" }, 0)).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(saveDraft(publicBrief, { business_name: "x".repeat(500) }, 0)).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});

describe("submission", () => {
  beforeEach(resetDatabase);

  it("reports missing required answers with the step to fix", async () => {
    const { publicBrief } = await setup();
    await saveDraft(publicBrief, { business_name: "Nube" }, 0);
    const result = await submitBrief(publicBrief);
    expect(result).toMatchObject({ ok: false, firstInvalidSection: 0, errors: { description: "required" } });
  });

  it("rejects badly formatted answers on submit even though drafts accepted them", async () => {
    const { publicBrief } = await setup();
    await saveDraft(publicBrief, { ...REQUIRED, contact_email: "hola@nube" }, 4);
    const result = await submitBrief(publicBrief);
    expect(result).toMatchObject({ ok: false, errors: { contact_email: "invalid_email" } });
  });

  it("locks the brief, notifies the owner and blocks further edits", async () => {
    const { owner, brief, publicBrief, token } = await setup();
    await saveDraft(publicBrief, REQUIRED, 4);
    expect(await submitBrief(publicBrief)).toEqual({ ok: true });

    const detail = await getBriefDetail(owner, brief.id);
    expect(detail.brief.status).toBe("received");
    expect(detail.brief.submittedAt).toBeInstanceOf(Date);
    expect(await unreadCount(owner)).toBe(1);
    expect((await listNotifications(owner))[0]).toMatchObject({ briefId: brief.id, type: "brief_submitted" });

    const locked = (await resolveToken(token))!;
    expect(locked.status).toBe("received");
    await expect(saveDraft(locked, { business_name: "Changed" }, 0)).rejects.toMatchObject({
      code: "locked",
    });
    await expect(submitBrief(locked)).rejects.toMatchObject({ code: "locked" });
    await expect(
      uploadFile(locked, "logo", { name: "logo.png", buffer: await pngBuffer() }),
    ).rejects.toMatchObject({ code: "locked" });
  });

  it("only one of two simultaneous submissions wins", async () => {
    const { owner, publicBrief } = await setup();
    await saveDraft(publicBrief, REQUIRED, 4);
    const results = await Promise.allSettled([submitBrief(publicBrief), submitBrief(publicBrief)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await unreadCount(owner)).toBe(1);
  });

  it("can be reopened by the owner and submitted again", async () => {
    const { owner, brief, publicBrief, token } = await setup();
    await saveDraft(publicBrief, REQUIRED, 4);
    await submitBrief(publicBrief);
    await markBriefCompleted(owner, brief.id);
    await reopenBrief(owner, brief.id);

    const reopened = (await resolveToken(token))!;
    expect(reopened.status).toBe("waiting");
    await saveDraft(reopened, { business_name: "Nube 2" }, 0);
    expect(await submitBrief(reopened)).toEqual({ ok: true });
  });
});

describe("uploads", () => {
  beforeEach(resetDatabase);

  it("stores allowed files and strips them from other briefs", async () => {
    const { publicBrief } = await setup();
    const other = await setup();
    const { upload } = await uploadFile(publicBrief, "logo", {
      name: "logo.png",
      buffer: await pngBuffer(600),
    });
    expect(upload).toMatchObject({ mimeType: "image/png", hasThumbnail: true });
    expect(await listBriefUploads(publicBrief.id)).toHaveLength(1);

    // A token for another brief cannot delete this file.
    await expect(removeFile(other.publicBrief, upload.id)).rejects.toMatchObject({ code: "not_found" });
    await removeFile(publicBrief, upload.id);
    expect(await listBriefUploads(publicBrief.id)).toHaveLength(0);
  });

  it("rejects disguised files and fields that don't accept files", async () => {
    const { publicBrief } = await setup();
    const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(500)]);
    await expect(uploadFile(publicBrief, "logo", { name: "logo.png", buffer: exe })).rejects.toMatchObject({
      code: "file_type",
    });
    await expect(
      uploadFile(publicBrief, "business_name", { name: "a.png", buffer: await pngBuffer() }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      uploadFile(publicBrief, "photos", { name: "menu.pdf", buffer: pdfBuffer(1000) }),
    ).rejects.toMatchObject({ code: "file_type" });
  });

  it("enforces per-file, per-field and per-brief limits", async () => {
    const { publicBrief } = await setup();
    // Test env: 1 MB per file, 2 MB per brief.
    await expect(
      uploadFile(publicBrief, "catalog_files", { name: "big.pdf", buffer: pdfBuffer(1.5 * 1024 * 1024) }),
    ).rejects.toMatchObject({ code: "file_too_large" });

    const nearlyOneMb = pdfBuffer(900 * 1024);
    await uploadFile(publicBrief, "catalog_files", { name: "1.pdf", buffer: nearlyOneMb });
    await uploadFile(publicBrief, "catalog_files", { name: "2.pdf", buffer: nearlyOneMb });
    await expect(
      uploadFile(publicBrief, "catalog_files", { name: "3.pdf", buffer: nearlyOneMb }),
    ).rejects.toMatchObject({ code: "quota_exceeded" });

    for (let i = 0; i < 3; i++) {
      await uploadFile(publicBrief, "logo", { name: `logo-${i}.png`, buffer: await pngBuffer() });
    }
    await expect(
      uploadFile(publicBrief, "logo", { name: "logo-4.png", buffer: await pngBuffer() }),
    ).rejects.toMatchObject({ code: "too_many_files" });
  });

  it("keeps the original name only as harmless metadata", async () => {
    const { publicBrief } = await setup();
    const { upload } = await uploadFile(publicBrief, "logo", {
      name: "../../../etc/passwd.png",
      buffer: await pngBuffer(),
    });
    expect(upload.originalName).not.toContain("/");
  });
});
