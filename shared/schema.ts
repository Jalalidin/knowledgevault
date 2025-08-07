import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge items table
export const knowledgeItems = pgTable("knowledge_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  type: varchar("type", { length: 50 }).notNull(), // 'text', 'image', 'audio', 'video', 'document', 'link'
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  objectPath: text("object_path"), // For object storage
  metadata: jsonb("metadata"), // Additional metadata like duration for audio/video
  isProcessed: boolean("is_processed").default(false),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tags table
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"), // Hex color
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge item tags junction table
export const knowledgeItemTags = pgTable("knowledge_item_tags", {
  knowledgeItemId: varchar("knowledge_item_id").notNull().references(() => knowledgeItems.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.knowledgeItemId, table.tagId] }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  knowledgeItems: many(knowledgeItems),
  tags: many(tags),
}));

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one, many }) => ({
  user: one(users, {
    fields: [knowledgeItems.userId],
    references: [users.id],
  }),
  knowledgeItemTags: many(knowledgeItemTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  knowledgeItemTags: many(knowledgeItemTags),
}));

export const knowledgeItemTagsRelations = relations(knowledgeItemTags, ({ one }) => ({
  knowledgeItem: one(knowledgeItems, {
    fields: [knowledgeItemTags.knowledgeItemId],
    references: [knowledgeItems.id],
  }),
  tag: one(tags, {
    fields: [knowledgeItemTags.tagId],
    references: [tags.id],
  }),
}));

// Insert schemas
export const insertKnowledgeItemSchema = createInsertSchema(knowledgeItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeItemTagSchema = createInsertSchema(knowledgeItemTags);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = z.infer<typeof insertKnowledgeItemSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type KnowledgeItemTag = typeof knowledgeItemTags.$inferSelect;
export type InsertKnowledgeItemTag = z.infer<typeof insertKnowledgeItemTagSchema>;

// Extended types with relations
export type KnowledgeItemWithTags = KnowledgeItem & {
  knowledgeItemTags: (KnowledgeItemTag & {
    tag: Tag;
  })[];
};
