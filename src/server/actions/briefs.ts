"use server";

import { revalidatePath } from "next/cache";
import { createAccessLink, revokeAccessLinks } from "@/server/dal/access";
import {
  createBrief,
  deleteBrief,
  markBriefCompleted,
  reopenBrief,
  updateBrief,
  type BriefInput,
  type BriefUpdateInput,
} from "@/server/dal/briefs";
import { createClient } from "@/server/dal/clients";
import { DomainError } from "@/server/dal/errors";
import { markAllRead } from "@/server/dal/notifications";
import { requireUser } from "@/server/session";
import { runAction } from "./result";

type NewBriefInput = Omit<BriefInput, "clientId"> & { clientId?: string; newClientName?: string };

export async function createBriefAction(input: NewBriefInput) {
  const user = await requireUser();
  return runAction(async () => {
    let clientId = input.clientId;
    if (!clientId) {
      if (!input.newClientName?.trim()) throw new DomainError("invalid_input");
      clientId = (await createClient(user.id, { name: input.newClientName })).id;
    }
    const brief = await createBrief(user.id, { ...input, clientId });
    revalidatePath("/dashboard");
    return { id: brief.id };
  });
}

export async function updateBriefAction(id: string, input: BriefUpdateInput) {
  const user = await requireUser();
  return runAction(async () => {
    await updateBrief(user.id, id, input);
    revalidatePath(`/briefs/${id}`);
  });
}

export async function deleteBriefAction(id: string) {
  const user = await requireUser();
  return runAction(async () => {
    await deleteBrief(user.id, id);
    revalidatePath("/dashboard");
  });
}

const EXPIRY_DAYS = new Set([0, 7, 30, 90]);

export async function createLinkAction(briefId: string, expiresInDays: number) {
  const user = await requireUser();
  return runAction(async () => {
    if (!EXPIRY_DAYS.has(expiresInDays)) throw new DomainError("invalid_input");
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null;
    const token = await createAccessLink(user.id, briefId, expiresAt);
    revalidatePath(`/briefs/${briefId}`);
    return { token };
  });
}

export async function revokeLinkAction(briefId: string) {
  const user = await requireUser();
  return runAction(async () => {
    await revokeAccessLinks(user.id, briefId);
    revalidatePath(`/briefs/${briefId}`);
  });
}

export async function completeBriefAction(briefId: string) {
  const user = await requireUser();
  return runAction(async () => {
    await markBriefCompleted(user.id, briefId);
    revalidatePath(`/briefs/${briefId}`);
  });
}

export async function reopenBriefAction(briefId: string) {
  const user = await requireUser();
  return runAction(async () => {
    await reopenBrief(user.id, briefId);
    revalidatePath(`/briefs/${briefId}`);
  });
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  return runAction(async () => {
    await markAllRead(user.id);
    revalidatePath("/", "layout");
  });
}
