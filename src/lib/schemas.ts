import { z } from "zod";
import { LOCALES } from "@/templates/types";

/**
 * Input schemas shared by forms (client) and the data access layer (server).
 * Messages are i18n keys from `errors.*`.
 */

export const clientInput = z.object({
  name: z.string().trim().min(1, "required").max(120, "too_long"),
  email: z
    .string()
    .trim()
    .max(254, "too_long")
    .refine((v) => v === "" || z.email().safeParse(v).success, "invalid_email")
    .optional(),
  phone: z.string().trim().max(40, "too_long").optional(),
  notes: z.string().trim().max(2000, "too_long").optional(),
});
export type ClientInput = z.infer<typeof clientInput>;

export const briefInput = z.object({
  title: z.string().trim().min(1, "required").max(160, "too_long"),
  clientId: z.uuid("required"),
  templateKey: z.string().min(1, "required"),
  locale: z.enum(LOCALES),
  dueDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "invalid_date")
    .optional(),
});
export type BriefInput = z.infer<typeof briefInput>;

export const briefUpdateInput = briefInput.pick({ title: true, locale: true, dueDate: true });
export type BriefUpdateInput = z.infer<typeof briefUpdateInput>;

export const brandingInput = z.object({
  displayName: z.string().trim().max(80, "too_long"),
  accentColor: z.string().regex(/^(#[0-9a-fA-F]{6})?$/, "invalid_color"),
});
export type BrandingInput = z.infer<typeof brandingInput>;
