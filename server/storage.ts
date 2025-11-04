import {
  users,
  knowledgeItems,
  tags,
  knowledgeItemTags,
  userAiSettings,
  conversations,
  chatMessages,
  type User,
  type UpsertUser,
  type KnowledgeItem,
  type InsertKnowledgeItem,
  type Tag,
  type InsertTag,
  type KnowledgeItemTag,
  type InsertKnowledgeItemTag,
  type KnowledgeItemWithTags,
  type UserAiSettings,
  type InsertUserAiSettings,
  type Conversation,
  type InsertConversation,
  type ChatMessage,
  type InsertChatMessage,
  type ConversationWithMessages,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, inArray, isNotNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Knowledge item operations
  createKnowledgeItem(item: InsertKnowledgeItem): Promise<KnowledgeItem>;
  getKnowledgeItem(id: string): Promise<KnowledgeItemWithTags | undefined>;
  getKnowledgeItemsByUser(userId: string, limit?: number, offset?: number): Promise<KnowledgeItemWithTags[]>;
  updateKnowledgeItem(id: string, updates: Partial<InsertKnowledgeItem>): Promise<KnowledgeItem | undefined>;
  deleteKnowledgeItem(id: string): Promise<boolean>;
  searchKnowledgeItems(userId: string, query: string): Promise<KnowledgeItemWithTags[]>;
  
  // Tag operations
  createTag(tag: InsertTag): Promise<Tag>;
  getTagsByUser(userId: string): Promise<Tag[]>;
  getOrCreateTags(userId: string, tagNames: string[]): Promise<Tag[]>;
  normalizeCategory(userId: string, suggestedCategory: string): Promise<string>;
  
  // Knowledge item tag operations
  addTagsToKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void>;
  removeTagsFromKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void>;
  
  // User AI settings operations
  getUserAiSettings(userId: string): Promise<UserAiSettings | undefined>;
  upsertUserAiSettings(settings: InsertUserAiSettings): Promise<UserAiSettings>;
  
  // Chat conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<ConversationWithMessages | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<boolean>;
  
  // Chat message operations
  addMessageToConversation(message: InsertChatMessage): Promise<ChatMessage>;
  getMessagesInConversation(conversationId: string): Promise<ChatMessage[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Knowledge item operations
  async createKnowledgeItem(item: InsertKnowledgeItem): Promise<KnowledgeItem> {
    const [knowledgeItem] = await db
      .insert(knowledgeItems)
      .values(item)
      .returning();
    return knowledgeItem;
  }

  async getKnowledgeItem(id: string): Promise<KnowledgeItemWithTags | undefined> {
    const [item] = await db
      .select()
      .from(knowledgeItems)
      .leftJoin(knowledgeItemTags, eq(knowledgeItems.id, knowledgeItemTags.knowledgeItemId))
      .leftJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(eq(knowledgeItems.id, id));

    if (!item.knowledge_items) return undefined;

    // Get all tags for this item
    const itemTags = await db
      .select({
        knowledgeItemId: knowledgeItemTags.knowledgeItemId,
        tagId: knowledgeItemTags.tagId,
        tag: tags,
      })
      .from(knowledgeItemTags)
      .innerJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(eq(knowledgeItemTags.knowledgeItemId, id));

    return {
      ...item.knowledge_items,
      knowledgeItemTags: itemTags.map(t => ({
        knowledgeItemId: t.knowledgeItemId,
        tagId: t.tagId,
        tag: t.tag!,
      })),
    };
  }

  async getKnowledgeItemsByUser(userId: string, limit = 50, offset = 0): Promise<KnowledgeItemWithTags[]> {
    const items = await db
      .select()
      .from(knowledgeItems)
      .where(eq(knowledgeItems.userId, userId))
      .orderBy(desc(knowledgeItems.createdAt))
      .limit(limit)
      .offset(offset);

    // Get tags for all items
    const itemIds = items.map(item => item.id);
    const allTags = await db
      .select({
        knowledgeItemId: knowledgeItemTags.knowledgeItemId,
        tagId: knowledgeItemTags.tagId,
        tag: tags,
      })
      .from(knowledgeItemTags)
      .innerJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(inArray(knowledgeItemTags.knowledgeItemId, itemIds));

    // Group tags by knowledge item
    const tagsByItem = allTags.reduce((acc, t) => {
      if (!acc[t.knowledgeItemId]) acc[t.knowledgeItemId] = [];
      acc[t.knowledgeItemId].push({
        knowledgeItemId: t.knowledgeItemId,
        tagId: t.tagId,
        tag: t.tag!,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return items.map(item => ({
      ...item,
      knowledgeItemTags: tagsByItem[item.id] || [],
    }));
  }

  async updateKnowledgeItem(id: string, updates: Partial<InsertKnowledgeItem>): Promise<KnowledgeItem | undefined> {
    const [updated] = await db
      .update(knowledgeItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeItems.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeItem(id: string): Promise<boolean> {
    const result = await db
      .delete(knowledgeItems)
      .where(eq(knowledgeItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchKnowledgeItems(userId: string, query: string): Promise<KnowledgeItemWithTags[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const items = await db
      .select()
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.userId, userId),
          or(
            ilike(knowledgeItems.title, searchTerm),
            ilike(knowledgeItems.summary, searchTerm),
            ilike(knowledgeItems.content, searchTerm)
          )
        )
      )
      .orderBy(desc(knowledgeItems.createdAt));

    // Get tags for search results
    const itemIds = items.map(item => item.id);
    if (itemIds.length === 0) return [];

    const allTags = await db
      .select({
        knowledgeItemId: knowledgeItemTags.knowledgeItemId,
        tagId: knowledgeItemTags.tagId,
        tag: tags,
      })
      .from(knowledgeItemTags)
      .innerJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(inArray(knowledgeItemTags.knowledgeItemId, itemIds));

    // Group tags by knowledge item
    const tagsByItem = allTags.reduce((acc, t) => {
      if (!acc[t.knowledgeItemId]) acc[t.knowledgeItemId] = [];
      acc[t.knowledgeItemId].push({
        knowledgeItemId: t.knowledgeItemId,
        tagId: t.tagId,
        tag: t.tag!,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return items.map(item => ({
      ...item,
      knowledgeItemTags: tagsByItem[item.id] || [],
    }));
  }

  // Enhanced search with type filtering and tag search
  async searchKnowledgeItemsWithFilters(
    userId: string, 
    query: string, 
    type?: string
  ): Promise<KnowledgeItemWithTags[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Build the where condition
    const conditions = [
      eq(knowledgeItems.userId, userId),
      or(
        ilike(knowledgeItems.title, searchTerm),
        ilike(knowledgeItems.summary, searchTerm),
        ilike(knowledgeItems.content, searchTerm)
      )
    ];
    
    // Add type filter if specified and not 'all'
    if (type && type !== 'all') {
      conditions.push(eq(knowledgeItems.type, type));
    }
    
    const items = await db
      .select()
      .from(knowledgeItems)
      .where(and(...conditions))
      .orderBy(desc(knowledgeItems.createdAt));

    // Also search in tags
    const tagConditions = [
      eq(knowledgeItems.userId, userId),
      ilike(tags.name, searchTerm)
    ];
    
    if (type && type !== 'all') {
      tagConditions.push(eq(knowledgeItems.type, type));
    }
    
    const tagSearchResults = await db
      .select({
        knowledgeItem: knowledgeItems,
      })
      .from(knowledgeItems)
      .innerJoin(knowledgeItemTags, eq(knowledgeItems.id, knowledgeItemTags.knowledgeItemId))
      .innerJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(and(...tagConditions));

    // Combine results and remove duplicates
    const allItems = [
      ...items,
      ...tagSearchResults.map(result => result.knowledgeItem)
    ];
    
    const uniqueItems = allItems.filter((item, index, self) => 
      index === self.findIndex(i => i.id === item.id)
    );

    // Get tags for all results
    const itemIds = uniqueItems.map(item => item.id);
    if (itemIds.length === 0) return [];

    const allTags = await db
      .select({
        knowledgeItemId: knowledgeItemTags.knowledgeItemId,
        tagId: knowledgeItemTags.tagId,
        tag: tags,
      })
      .from(knowledgeItemTags)
      .innerJoin(tags, eq(knowledgeItemTags.tagId, tags.id))
      .where(inArray(knowledgeItemTags.knowledgeItemId, itemIds));

    // Group tags by knowledge item
    const tagsByItem = allTags.reduce((acc, t) => {
      if (!acc[t.knowledgeItemId]) acc[t.knowledgeItemId] = [];
      acc[t.knowledgeItemId].push({
        knowledgeItemId: t.knowledgeItemId,
        tagId: t.tagId,
        tag: t.tag!,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return uniqueItems.map(item => ({
      ...item,
      knowledgeItemTags: tagsByItem[item.id] || [],
    })).sort((a, b) => 
      new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime()
    );
  }

  // Tag operations
  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db
      .insert(tags)
      .values(tag)
      .returning();
    return newTag;
  }

  async getTagsByUser(userId: string): Promise<Tag[]> {
    return await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name);
  }

  async getOrCreateTags(userId: string, tagNames: string[]): Promise<Tag[]> {
    if (tagNames.length === 0) return [];

    // Get all existing tags for the user
    const allExistingTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId));

    const resultTags: Tag[] = [];
    const tagsToCreate: string[] = [];

    for (const suggestedTagName of tagNames) {
      // First try exact match (case insensitive)
      let matchedTag = allExistingTags.find(t => 
        t.name.toLowerCase() === suggestedTagName.toLowerCase()
      );

      // If no exact match, try similarity matching
      if (!matchedTag) {
        matchedTag = this.findSimilarTag(suggestedTagName, allExistingTags);
      }

      if (matchedTag) {
        // Use existing similar tag
        if (!resultTags.find(t => t.id === matchedTag!.id)) {
          resultTags.push(matchedTag);
        }
      } else {
        // Mark for creation
        if (!tagsToCreate.includes(suggestedTagName)) {
          tagsToCreate.push(suggestedTagName);
        }
      }
    }

    // Create new tags
    for (const tagName of tagsToCreate) {
      const [newTag] = await db
        .insert(tags)
        .values({
          name: tagName,
          userId,
          color: getRandomTagColor(),
        })
        .returning();
      resultTags.push(newTag);
    }

    return resultTags;
  }

  private findSimilarTag(suggestedName: string, existingTags: Tag[]): Tag | undefined {
    const suggested = suggestedName.toLowerCase().trim();
    
    // Check for common variations and abbreviations
    const variations: Record<string, string[]> = {
      'technology': ['tech', 'technologies'],
      'tech': ['technology', 'technologies'],
      'programming': ['coding', 'development', 'dev'],
      'coding': ['programming', 'development', 'dev'],
      'development': ['programming', 'coding', 'dev'],
      'dev': ['development', 'programming', 'coding'],
      'javascript': ['js'],
      'js': ['javascript'],
      'typescript': ['ts'],
      'ts': ['typescript'],
      'python': ['py'],
      'py': ['python'],
      'artificial intelligence': ['ai', 'machine learning', 'ml'],
      'ai': ['artificial intelligence', 'machine learning', 'ml'],
      'machine learning': ['ai', 'artificial intelligence', 'ml'],
      'ml': ['machine learning', 'ai', 'artificial intelligence'],
      'image': ['images', 'picture', 'pictures', 'photo', 'photos'],
      'images': ['image', 'picture', 'pictures', 'photo', 'photos'],
      'picture': ['pictures', 'image', 'images', 'photo', 'photos'],
      'pictures': ['picture', 'image', 'images', 'photo', 'photos'],
      'photo': ['photos', 'image', 'images', 'picture', 'pictures'],
      'photos': ['photo', 'image', 'images', 'picture', 'pictures'],
      'document': ['documents', 'doc', 'docs', 'file', 'files'],
      'documents': ['document', 'doc', 'docs', 'file', 'files'],
      'doc': ['docs', 'document', 'documents'],
      'docs': ['doc', 'document', 'documents'],
      'video': ['videos', 'movie', 'movies', 'clip', 'clips'],
      'videos': ['video', 'movie', 'movies', 'clip', 'clips'],
      'audio': ['sound', 'music', 'recording', 'recordings'],
      'music': ['audio', 'sound'],
    };

    // Check if the suggested name has known variations
    const possibleMatches = variations[suggested] || [];
    
    for (const existing of existingTags) {
      const existingName = existing.name.toLowerCase().trim();
      
      // Check if existing tag matches any variation of suggested
      if (possibleMatches.includes(existingName)) {
        return existing;
      }
      
      // Check if suggested matches any variation of existing
      const existingVariations = variations[existingName] || [];
      if (existingVariations.includes(suggested)) {
        return existing;
      }
      
      // Check for substring matches (e.g., "web" matches "web development")
      if (existingName.includes(suggested) || suggested.includes(existingName)) {
        // Only match if one is a meaningful substring of the other (length > 2)
        if (Math.min(suggested.length, existingName.length) > 2) {
          return existing;
        }
      }
    }

    return undefined;
  }

  async normalizeCategory(userId: string, suggestedCategory: string): Promise<string> {
    // Note: Category is stored in metadata.category since schema doesn't have a direct category field
    // We'll extract categories from the metadata field
    const existingItems = await db
      .select({ metadata: knowledgeItems.metadata })
      .from(knowledgeItems)
      .where(
        and(
          eq(knowledgeItems.userId, userId),
          isNotNull(knowledgeItems.metadata)
        )
      );

    const existingCategories = existingItems
      .map(item => {
        const metadata = item.metadata as any;
        return metadata?.category;
      })
      .filter(Boolean) as string[];

    const suggested = suggestedCategory.toLowerCase().trim();
    
    // First try exact match (case insensitive)
    const exactMatch = existingCategories.find(cat => 
      cat.toLowerCase() === suggested
    );
    if (exactMatch) return exactMatch;

    // Check for similar categories
    const categoryVariations: Record<string, string[]> = {
      'technology': ['tech', 'technologies'],
      'tech': ['technology', 'technologies'],
      'programming': ['coding', 'development'],
      'coding': ['programming', 'development'],
      'development': ['programming', 'coding'],
      'artificial intelligence': ['ai', 'machine learning'],
      'ai': ['artificial intelligence', 'machine learning'],
      'machine learning': ['ai', 'artificial intelligence'],
      'images': ['image', 'pictures', 'photos'],
      'image': ['images', 'pictures', 'photos'],
      'pictures': ['image', 'images', 'photos'],
      'photos': ['image', 'images', 'pictures'],
      'documents': ['document', 'files'],
      'document': ['documents', 'files'],
      'files': ['document', 'documents'],
      'videos': ['video', 'movies'],
      'video': ['videos', 'movies'],
      'movies': ['video', 'videos'],
      'audio': ['sound', 'music'],
      'music': ['audio', 'sound'],
      'web links': ['links', 'websites', 'urls'],
      'links': ['web links', 'websites', 'urls'],
      'websites': ['web links', 'links', 'urls'],
      'urls': ['web links', 'links', 'websites'],
    };

    const possibleMatches = categoryVariations[suggested] || [];
    
    for (const existing of existingCategories) {
      const existingName = existing.toLowerCase().trim();
      
      // Check if existing category matches any variation of suggested
      if (possibleMatches.includes(existingName)) {
        return existing;
      }
      
      // Check if suggested matches any variation of existing
      const existingVariations = categoryVariations[existingName] || [];
      if (existingVariations.includes(suggested)) {
        return existing;
      }
    }

    // If no match found, return the suggested category with proper capitalization
    return suggestedCategory.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Knowledge item tag operations
  async addTagsToKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const values = tagIds.map(tagId => ({
      knowledgeItemId,
      tagId,
    }));

    await db
      .insert(knowledgeItemTags)
      .values(values)
      .onConflictDoNothing();
  }

  async removeTagsFromKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    await db
      .delete(knowledgeItemTags)
      .where(
        and(
          eq(knowledgeItemTags.knowledgeItemId, knowledgeItemId),
          inArray(knowledgeItemTags.tagId, tagIds)
        )
      );
  }

  // User AI settings operations
  async getUserAiSettings(userId: string): Promise<UserAiSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, userId))
      .limit(1);
    return settings;
  }

  async upsertUserAiSettings(settings: InsertUserAiSettings): Promise<UserAiSettings> {
    const [upserted] = await db
      .insert(userAiSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userAiSettings.userId,
        set: {
          preferredProvider: settings.preferredProvider,
          preferredModel: settings.preferredModel,
          customApiKeys: settings.customApiKeys,
          chatSettings: settings.chatSettings,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  // Chat conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return created;
  }

  async getConversation(id: string): Promise<ConversationWithMessages | undefined> {
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!conversation[0]) return undefined;

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, id))
      .orderBy(chatMessages.createdAt);

    return {
      ...conversation[0],
      messages,
    };
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async deleteConversation(id: string): Promise<boolean> {
    const deleted = await db
      .delete(conversations)
      .where(eq(conversations.id, id));
    return (deleted.rowCount ?? 0) > 0;
  }

  // Chat message operations
  async addMessageToConversation(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return created;
  }

  async getMessagesInConversation(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }
}

function getRandomTagColor(): string {
  const colors = [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
    "#EC4899", // pink
    "#6B7280", // gray
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const storage = new DatabaseStorage();
