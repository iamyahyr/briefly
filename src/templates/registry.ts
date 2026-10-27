import { localBusiness } from "./local-business";
import type { TemplateDefinition } from "./types";

/**
 * Available templates. To add one, create a file next to this one and
 * register it here — see docs/templates.md.
 */
export const templates: TemplateDefinition[] = [localBusiness];

export function getTemplate(key: string): TemplateDefinition | undefined {
  return templates.find((tpl) => tpl.key === key);
}
