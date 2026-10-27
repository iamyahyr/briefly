import { beforeEach, describe, expect, it } from "vitest";
import { createAccessLink, revokeAccessLinks } from "@/server/dal/access";
import {
  createBrief,
  deleteBrief,
  getBriefDetail,
  listBriefs,
  markBriefCompleted,
  reopenBrief,
  updateBrief,
} from "@/server/dal/briefs";
import { deleteClient, getClient, listClients, updateClient } from "@/server/dal/clients";
import { uploadFile } from "@/server/dal/questionnaire";
import { getOwnedUpload } from "@/server/dal/uploads";
import { resolveToken } from "@/server/dal/access";
import { createSharedBrief, createUser, pngBuffer, resetDatabase } from "./helpers";

const notFound = expect.objectContaining({ code: "not_found" });

describe("owner isolation (user A vs user B)", () => {
  beforeEach(resetDatabase);

  it("B cannot list, read, edit or delete A's clients", async () => {
    const { owner: a, client } = await createSharedBrief();
    const b = await createUser("Intruder");

    expect(await listClients(b)).toEqual([]);
    await expect(getClient(b, client.id)).rejects.toEqual(notFound);
    await expect(updateClient(b, client.id, { name: "Hacked" })).rejects.toEqual(notFound);
    await expect(deleteClient(b, client.id)).rejects.toEqual(notFound);
    expect((await getClient(a, client.id)).name).toBe("Cafetería Nube");
  });

  it("B cannot read, change, share or delete A's briefs", async () => {
    const { brief } = await createSharedBrief();
    const b = await createUser("Intruder");

    expect(await listBriefs(b)).toEqual([]);
    await expect(getBriefDetail(b, brief.id)).rejects.toEqual(notFound);
    await expect(updateBrief(b, brief.id, { title: "x", locale: "en" })).rejects.toEqual(notFound);
    await expect(createAccessLink(b, brief.id, null)).rejects.toEqual(notFound);
    await expect(revokeAccessLinks(b, brief.id)).rejects.toEqual(notFound);
    await expect(markBriefCompleted(b, brief.id)).rejects.toEqual(notFound);
    await expect(reopenBrief(b, brief.id)).rejects.toEqual(notFound);
    await expect(deleteBrief(b, brief.id)).rejects.toEqual(notFound);
  });

  it("B cannot create a brief for A's client", async () => {
    const { client } = await createSharedBrief();
    const b = await createUser("Intruder");
    await expect(
      createBrief(b, { clientId: client.id, title: "x", templateKey: "local-business", locale: "es" }),
    ).rejects.toEqual(notFound);
  });

  it("B cannot download A's files", async () => {
    const { token } = await createSharedBrief();
    const brief = (await resolveToken(token))!;
    const { upload } = await uploadFile(brief, "logo", { name: "logo.png", buffer: await pngBuffer() });
    const b = await createUser("Intruder");

    await expect(getOwnedUpload(b, upload.id)).rejects.toEqual(notFound);
    expect((await getOwnedUpload(brief.ownerId, upload.id)).id).toBe(upload.id);
  });

  it("treats malformed ids as not found instead of crashing", async () => {
    const a = await createUser();
    await expect(getBriefDetail(a, "not-a-uuid")).rejects.toEqual(notFound);
    await expect(getClient(a, "' or 1=1 --")).rejects.toEqual(notFound);
  });
});
