import {
  users,
  knowledgeItems,
  tags,
  knowledgeItemTags,
  type User,
  type UpsertUser,
  type KnowledgeItem,
  type InsertKnowledgeItem,
  type Tag,
  type InsertTag,
  type KnowledgeItemTag,
  type InsertKnowledgeItemTag,
  type KnowledgeItemWithTags,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, inArray } from "drizzle-orm";

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
  
  // Knowledge item tag operations
  addTagsToKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void>;
  removeTagsFromKnowledgeItem(knowledgeItemId: string, tagIds: string[]): Promise<void>;
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

    // Get existing tags
    const existingTags = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          inArray(tags.name, tagNames)
        )
      );

    const existingTagNames = existingTags.map(t => t.name);
    const newTagNames = tagNames.filter(name => !existingTagNames.includes(name));

    // Create new tags
    const newTags: Tag[] = [];
    for (const tagName of newTagNames) {
      const [newTag] = await db
        .insert(tags)
        .values({
          name: tagName,
          userId,
          color: getRandomTagColor(),
        })
        .returning();
      newTags.push(newTag);
    }

    return [...existingTags, ...newTags];
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
