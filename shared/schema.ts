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

// User AI settings table for RAG chat configuration
export const userAiSettings = pgTable("user_ai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  preferredProvider: varchar("preferred_provider", { length: 50 }).notNull().default("gemini"), // 'gemini', 'openai', 'anthropic'
  preferredModel: varchar("preferred_model", { length: 100 }).notNull().default("gemini-2.5-flash"),
  customApiKeys: jsonb("custom_api_keys"), // Encrypted API keys for different providers
  chatSettings: jsonb("chat_settings").default('{}'), // Temperature, max tokens, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Retrieved knowledge items, model used, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// WeChat integration settings table
export const wechatIntegrations = pgTable("wechat_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  wechatOpenId: varchar("wechat_open_id").unique(), // WeChat user's OpenID
  wechatUnionId: varchar("wechat_union_id"), // WeChat UnionID (across apps)
  nickname: varchar("nickname"),
  avatarUrl: text("avatar_url"),
  linkToken: varchar("link_token").unique(), // Temporary token for linking accounts
  isActive: boolean("is_active").default(true),
  lastMessageAt: timestamp("last_message_at"),
  settings: jsonb("settings").default('{}'), // Auto-save preferences, content filters, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WeChat webhook configuration table
export const wechatWebhooks = pgTable("wechat_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appId: varchar("app_id").notNull(),
  appSecret: varchar("app_secret").notNull(), // Encrypted
  token: varchar("token").notNull(),
  encodingAESKey: varchar("encoding_aes_key"), // For message encryption
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  knowledgeItems: many(knowledgeItems),
  tags: many(tags),
  aiSettings: many(userAiSettings),
  conversations: many(conversations),
  wechatIntegrations: many(wechatIntegrations),
}));

export const userAiSettingsRelations = relations(userAiSettings, ({ one }) => ({
  user: one(users, {
    fields: [userAiSettings.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id],
  }),
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

export const wechatIntegrationsRelations = relations(wechatIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [wechatIntegrations.userId],
    references: [users.id],
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

export const insertUserAiSettingsSchema = createInsertSchema(userAiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertWechatIntegrationSchema = createInsertSchema(wechatIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWechatWebhookSchema = createInsertSchema(wechatWebhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type InsertKnowledgeItem = z.infer<typeof insertKnowledgeItemSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type KnowledgeItemTag = typeof knowledgeItemTags.$inferSelect;
export type InsertKnowledgeItemTag = z.infer<typeof insertKnowledgeItemTagSchema>;
export type UserAiSettings = typeof userAiSettings.$inferSelect;
export type InsertUserAiSettings = z.infer<typeof insertUserAiSettingsSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Extended types with relations
export type KnowledgeItemWithTags = KnowledgeItem & {
  knowledgeItemTags: (KnowledgeItemTag & {
    tag: Tag;
  })[];
};

export type ConversationWithMessages = Conversation & {
  messages: ChatMessage[];
};

export type WechatIntegration = typeof wechatIntegrations.$inferSelect;
export type InsertWechatIntegration = z.infer<typeof insertWechatIntegrationSchema>;
export type WechatWebhook = typeof wechatWebhooks.$inferSelect;
export type InsertWechatWebhook = z.infer<typeof insertWechatWebhookSchema>;
