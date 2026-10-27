"use server";

import { resolveToken } from "@/server/dal/access";
import { DomainError } from "@/server/dal/errors";
import { saveDraft, submitBrief } from "@/server/dal/questionnaire";
import { checkRateLimit } from "@/server/security/rate-limit";
import { runAction } from "./result";

/**
 * Public actions used by the client questionnaire. They authenticate with the
 * brief token only — never trust anything else sent by the browser.
 */
async function briefFromToken(token: string) {
  const brief = await resolveToken(token);
  if (!brief) throw new DomainError("not_found");
  return brief;
}

export async function saveDraftAction(token: string, values: unknown, currentStep: number) {
  return runAction(async () => {
    if (!(await checkRateLimit("save", token.slice(0, 12)))) throw new DomainError("rate_limited");
    return saveDraft(await briefFromToken(token), values, currentStep);
  });
}

export async function submitBriefAction(token: string) {
  return runAction(async () => {
    if (!(await checkRateLimit("submit", token.slice(0, 12)))) throw new DomainError("rate_limited");
    return submitBrief(await briefFromToken(token));
  });
}
