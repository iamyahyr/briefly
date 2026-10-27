import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnswerValue, TemplateDefinition } from "@/templates/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Better Auth tables ─────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ─── Briefly domain ─────────────────────────────────────────────────────

export const briefStatus = pgEnum("brief_status", ["draft", "waiting", "received", "completed"]);
export type BriefStatus = (typeof briefStatus.enumValues)[number];

export const locale = pgEnum("locale", ["es", "en"]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("clients_owner_id_idx").on(t.ownerId)],
);

export const briefs = pgTable(
  "briefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    templateKey: text("template_key").notNull(),
    templateVersion: integer("template_version").notNull(),
    // Frozen copy of the template, so later template edits never change a brief in progress.
    templateSnapshot: jsonb("template_snapshot").$type<TemplateDefinition>().notNull(),
    locale: locale("locale").notNull().default("es"),
    status: briefStatus("status").notNull().default("draft"),
    dueDate: date("due_date"),
    currentStep: integer("current_step").notNull().default(0),
    /** 0–100, recomputed on every save so lists don't need to load answers. */
    progress: integer("progress").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("briefs_owner_id_idx").on(t.ownerId), index("briefs_client_id_idx").on(t.clientId)],
);

export const briefAccess = pgTable(
  "brief_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefId: uuid("brief_id")
      .notNull()
      .references(() => briefs.id, { onDelete: "cascade" }),
    // Lookups use the SHA-256 hash. The encrypted copy (AES-GCM, key derived from
    // BETTER_AUTH_SECRET) only lets the owner copy the link again later.
    tokenHash: text("token_hash").notNull(),
    tokenCiphertext: text("token_ciphertext").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("brief_access_token_hash_idx").on(t.tokenHash),
    index("brief_access_brief_id_idx").on(t.briefId),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefId: uuid("brief_id")
      .notNull()
      .references(() => briefs.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    value: jsonb("value_json").$type<AnswerValue>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("answers_brief_field_idx").on(t.briefId, t.fieldKey)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for workspace assets (e.g. the freelancer's own logo).
    briefId: uuid("brief_id").references(() => briefs.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    thumbnailKey: text("thumbnail_key"),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("uploads_brief_field_idx").on(t.briefId, t.fieldKey),
    index("uploads_owner_id_idx").on(t.ownerId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    briefId: uuid("brief_id")
      .notNull()
      .references(() => briefs.id, { onDelete: "cascade" }),
    type: text("type").$type<"brief_submitted">().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_owner_unread_idx")
      .on(t.ownerId, t.createdAt)
      .where(sql`${t.readAt} is null`),
  ],
);

export const workspaceSettings = pgTable("workspace_settings", {
  ownerId: text("owner_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  logoUploadId: uuid("logo_upload_id").references(() => uploads.id, { onDelete: "set null" }),
  accentColor: text("accent_color"),
  ...timestamps,
});

// ─── Relations ──────────────────────────────────────────────────────────

export const clientsRelations = relations(clients, ({ many }) => ({
  briefs: many(briefs),
}));

export const briefsRelations = relations(briefs, ({ one, many }) => ({
  client: one(clients, { fields: [briefs.clientId], references: [clients.id] }),
  answers: many(answers),
  uploads: many(uploads),
  access: many(briefAccess),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  brief: one(briefs, { fields: [answers.briefId], references: [briefs.id] }),
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
  brief: one(briefs, { fields: [uploads.briefId], references: [briefs.id] }),
}));

export const briefAccessRelations = relations(briefAccess, ({ one }) => ({
  brief: one(briefs, { fields: [briefAccess.briefId], references: [briefs.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  brief: one(briefs, { fields: [notifications.briefId], references: [briefs.id] }),
}));
