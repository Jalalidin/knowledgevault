import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  processTextContent,
  processImageWithGemini,
  processDocumentContent,
  transcribeAudio,
  searchKnowledgeBase,
  processLinkContent,
} from "./gemini";
import { insertKnowledgeItemSchema, insertConversationSchema, insertChatMessageSchema } from "@shared/schema";
import wechatRoutes from "./wechat-routes";
import { aiService } from "./ai-service";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

// Configure multer for file uploads
const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // JWT bridge for Python backend
  app.get('/api/auth/token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "No user ID found" });
      }
      
      // Create a JWT token compatible with Python backend
      const secretKey = process.env.JWT_SECRET_KEY || 'dev-only-secret-key-not-for-production';
      
      const token = jwt.sign(
        { sub: userId },
        secretKey,
        { algorithm: 'HS256', expiresIn: '30m' }
      );
      
      res.json({ access_token: token, token_type: "bearer" });
    } catch (error) {
      console.error("Error generating JWT token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  // Object storage routes for private objects
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for objects
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Knowledge items routes
  app.get("/api/knowledge-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const items = await storage.getKnowledgeItemsByUser(userId, limit, offset);
      res.json(items);
    } catch (error) {
      console.error("Error fetching knowledge items:", error);
      res.status(500).json({ error: "Failed to fetch knowledge items" });
    }
  });

  app.get("/api/knowledge-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.getKnowledgeItem(req.params.id);
      
      if (!item || item.userId !== userId) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching knowledge item:", error);
      res.status(500).json({ error: "Failed to fetch knowledge item" });
    }
  });

  app.post("/api/knowledge-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Prepare metadata with thumbnail and enhanced info
      let metadata = req.body.metadata || {};
      
      // If processedContent contains thumbnail or enhanced metadata, merge it
      if (req.body.thumbnailUrl) {
        metadata.thumbnailUrl = req.body.thumbnailUrl;
      }
      if (req.body.videoInfo) {
        metadata = { ...metadata, ...req.body.videoInfo };
      }
      
      // Normalize category if provided
      let normalizedCategory = req.body.category;
      if (normalizedCategory) {
        normalizedCategory = await storage.normalizeCategory(userId, normalizedCategory);
        // Store category in metadata since schema doesn't have direct category field
        metadata.category = normalizedCategory;
      }
      
      const itemData = insertKnowledgeItemSchema.parse({
        ...req.body,
        userId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      const item = await storage.createKnowledgeItem(itemData);
      
      // Add tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        const tags = await storage.getOrCreateTags(userId, req.body.tags);
        await storage.addTagsToKnowledgeItem(item.id, tags.map(t => t.id));
      }

      const itemWithTags = await storage.getKnowledgeItem(item.id);
      res.json(itemWithTags);
    } catch (error) {
      console.error("Error creating knowledge item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create knowledge item" });
    }
  });

  app.put("/api/knowledge-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.getKnowledgeItem(req.params.id);
      
      if (!item || item.userId !== userId) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }

      const updates = insertKnowledgeItemSchema.partial().parse(req.body);
      const updatedItem = await storage.updateKnowledgeItem(req.params.id, updates);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating knowledge item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update knowledge item" });
    }
  });

  app.delete("/api/knowledge-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.getKnowledgeItem(req.params.id);
      
      if (!item || item.userId !== userId) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }

      const deleted = await storage.deleteKnowledgeItem(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge item:", error);
      res.status(500).json({ error: "Failed to delete knowledge item" });
    }
  });

  // Filter-based search (database search)
  app.get("/api/search-filter", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      const type = req.query.type as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Use enhanced database search with type filtering
      const items = await storage.searchKnowledgeItemsWithFilters(userId, query, type);
      res.json(items);
    } catch (error) {
      console.error("Error in filter search:", error);
      res.status(500).json({ error: "Failed to search knowledge items" });
    }
  });

  // AI-powered natural language search with smart fallback
  app.get("/api/search-ai", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // First try smart pattern matching for common queries
      const smartResults = await handleSmartQuery(userId, query);
      if (smartResults) {
        return res.json(smartResults);
      }

      // If no smart match, try OpenAI search
      try {
        const allItems = await storage.getKnowledgeItemsByUser(userId, 1000);
        const relevantItems = await searchKnowledgeBase(query, allItems);
        res.json(relevantItems);
      } catch (aiError) {
        console.error("OpenAI search failed, using smart fallback:", aiError);
        // Fallback to enhanced keyword search
        const fallbackResults = await storage.searchKnowledgeItems(userId, query);
        res.json(fallbackResults);
      }
    } catch (error) {
      console.error("Error in AI search:", error);
      res.json([]);
    }
  });

  // Smart query handler for common patterns
  async function handleSmartQuery(userId: string, query: string): Promise<any[] | null> {
    const lowerQuery = query.toLowerCase().trim();
    
    // Pattern: "list all [type]" or "show me [type]" or "find [type]"
    const typePatterns = {
      'image': /(?:list all|show me|find|get).*(?:image|picture|photo)s?/i,
      'document': /(?:list all|show me|find|get).*(?:document|doc|file|pdf)s?/i,
      'video': /(?:list all|show me|find|get).*(?:video|movie|clip)s?/i,
      'audio': /(?:list all|show me|find|get).*(?:audio|sound|music|recording)s?/i,
      'link': /(?:list all|show me|find|get).*(?:link|url|website|web)s?/i,
      'text': /(?:list all|show me|find|get).*(?:text|note|writing)s?/i
    };
    
    // Check for type-based queries
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(lowerQuery)) {
        return await storage.searchKnowledgeItemsWithFilters(userId, '', type);
      }
    }
    
    // Pattern: "from [time period]"
    if (lowerQuery.includes('from last') || lowerQuery.includes('from this')) {
      const allItems = await storage.getKnowledgeItemsByUser(userId, 1000);
      const now = new Date();
      
      if (lowerQuery.includes('week')) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return allItems.filter(item => new Date(item.createdAt || new Date()) > weekAgo);
      } else if (lowerQuery.includes('month')) {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return allItems.filter(item => new Date(item.createdAt || new Date()) > monthAgo);
      } else if (lowerQuery.includes('day')) {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return allItems.filter(item => new Date(item.createdAt || new Date()) > dayAgo);
      }
    }
    
    // Pattern: "everything" or "all items" or "all content"
    if (/(?:everything|all items|all content|show all)/i.test(lowerQuery)) {
      return await storage.getKnowledgeItemsByUser(userId, 100);
    }
    
    return null; // No smart pattern matched
  }

  // Legacy search endpoint (for backward compatibility)
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Default to filter search for legacy endpoint
      const items = await storage.searchKnowledgeItems(userId, query);
      res.json(items);
    } catch (error) {
      console.error("Error searching knowledge items:", error);
      res.status(500).json({ error: "Failed to search knowledge items" });
    }
  });

  // Process uploaded file
  app.post("/api/process-file", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let processedContent;
      const filePath = file.path;
      const fileName = file.originalname;
      const mimeType = file.mimetype;

      try {
        if (mimeType.startsWith("text/") || mimeType === "application/json") {
          const content = fs.readFileSync(filePath, "utf-8");
          processedContent = await processTextContent(content);
        } else if (mimeType.startsWith("image/")) {
          const imageBuffer = fs.readFileSync(filePath);
          const base64Image = imageBuffer.toString("base64");
          processedContent = await processImageWithGemini(base64Image, fileName);
        } else if (mimeType.startsWith("audio/")) {
          const transcription = await transcribeAudio(filePath);
          processedContent = await processTextContent(transcription.text);
        } else if (mimeType === "application/pdf" || mimeType.includes("document")) {
          // For documents, we'd need a PDF parser or document converter
          // For now, just use filename for processing
          processedContent = await processDocumentContent("", fileName);
        } else {
          throw new Error(`Unsupported file type: ${mimeType}`);
        }

        // Upload to object storage
        const objectStorageService = new ObjectStorageService();
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        
        // Move file to object storage (simplified - in production you'd upload to the signed URL)
        const fileBuffer = fs.readFileSync(filePath);
        
        res.json({
          processedContent,
          uploadURL,
          fileInfo: {
            fileName,
            fileSize: file.size,
            mimeType,
          },
        });
      } finally {
        // Clean up temporary file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Process text content and create knowledge item
  app.post("/api/process-text", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      // Process the text content with AI
      const processedContent = await processTextContent(content);
      
      // Create a knowledge item with the processed content
      const knowledgeItemData = insertKnowledgeItemSchema.parse({
        userId,
        title: processedContent.title || content.substring(0, 50).trim() + (content.length > 50 ? '...' : ''),
        type: 'text',
        content,
        summary: processedContent.summary,
        isProcessed: true,
        metadata: {
          processedAt: new Date().toISOString(),
          wordCount: content.split(/\s+/).length,
          contentLength: content.length,
        }
      });
      
      const knowledgeItem = await storage.createKnowledgeItem(knowledgeItemData);
      
      // Add tags if generated
      if (processedContent.tags && processedContent.tags.length > 0) {
        for (const tagName of processedContent.tags) {
          try {
            await storage.addTagToKnowledgeItem(knowledgeItem.id, tagName, userId);
          } catch (error) {
            console.error("Error adding tag:", error);
            // Continue even if tag addition fails
          }
        }
      }
      
      // Return the created knowledge item
      const itemWithTags = await storage.getKnowledgeItem(knowledgeItem.id);
      res.json(itemWithTags);
    } catch (error) {
      console.error("Error processing text:", error);
      res.status(500).json({ error: "Failed to process text" });
    }
  });

  // Process image content with Gemini AI  
  app.post("/api/process-image", isAuthenticated, async (req: any, res) => {
    try {
      const { base64Image, fileName, fileSize, mimeType } = req.body;
      
      if (!base64Image || typeof base64Image !== "string") {
        return res.status(400).json({ error: "Base64 image data is required" });
      }
      
      const processedContent = await processImageWithGemini(base64Image, fileName);
      res.json(processedContent);
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Failed to process image content" });
    }
  });

  // Process web link with enhanced video and thumbnail support using Gemini AI
  app.post("/api/process-link", isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      // Process the link content with enhanced AI analysis
      const processedContent = await processLinkContent(url);

      res.json({ processedContent });
    } catch (error) {
      console.error("Error processing link:", error);
      res.status(500).json({ error: "Failed to process link" });
    }
  });

  // Duplicate endpoint removed - using the one above

  // Set object ACL after upload
  app.post("/api/set-object-acl", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { objectURL } = req.body;
      
      if (!objectURL) {
        return res.status(400).json({ error: "objectURL is required" });
      }

      // Set object ACL policy
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectURL,
        {
          owner: userId,
          visibility: "private",
        }
      );

      res.json({ objectPath });
    } catch (error) {
      console.error("Error setting object ACL:", error);
      res.status(500).json({ error: "Failed to set object permissions" });
    }
  });

  // Update object after upload (legacy endpoint, kept for compatibility)
  app.put("/api/knowledge-items/:id/object", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { objectURL } = req.body;
      
      if (!objectURL) {
        return res.status(400).json({ error: "objectURL is required" });
      }

      const item = await storage.getKnowledgeItem(req.params.id);
      if (!item || item.userId !== userId) {
        return res.status(404).json({ error: "Knowledge item not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectURL,
        {
          owner: userId,
          visibility: "private",
        }
      );

      await storage.updateKnowledgeItem(req.params.id, {
        objectPath,
        fileUrl: objectURL,
      });

      res.json({ objectPath });
    } catch (error) {
      console.error("Error updating object:", error);
      res.status(500).json({ error: "Failed to update object" });
    }
  });

  // Tags routes
  app.get("/api/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tags = await storage.getTagsByUser(userId);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // RAG Chat endpoints
  
  // Start a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title } = req.body;
      
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const conversationData = insertConversationSchema.parse({
        title,
        userId,
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  // Get user's conversations
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  // Get a specific conversation with messages
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // Delete a conversation
  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteConversation(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });
  
  // Streaming chat endpoint
  app.post("/api/conversations/:id/messages/stream", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: conversationId } = req.params;
      const { content, model, provider, temperature, selectedItems } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Verify conversation belongs to user
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Save user message
      const userMessageData = insertChatMessageSchema.parse({
        conversationId,
        role: "user",
        content,
      });
      
      const userMessage = await storage.addMessageToConversation(userMessageData);
      
      // Send user message confirmation
      res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMessage })}\n\n`);
      
      // Get user's AI settings
      const userSettings = await storage.getUserAiSettings(userId);
      
      // Get relevant knowledge items - either selected ones or search results
      let relevantItems;
      if (selectedItems && selectedItems.length > 0) {
        // Use specifically selected items
        relevantItems = [];
        for (const itemId of selectedItems) {
          const item = await storage.getKnowledgeItem(itemId);
          if (item && item.userId === userId) {
            relevantItems.push(item);
          }
        }
      } else {
        // Search for relevant items
        const allItems = await storage.getKnowledgeItemsByUser(userId, 1000);
        relevantItems = await searchKnowledgeBase(content, allItems);
      }
      
      // Send sources info
      res.write(`data: ${JSON.stringify({ 
        type: 'sources', 
        sources: relevantItems.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type,
        }))
      })}\n\n`);
      
      let fullResponse = '';
      
      // Override AI settings if provided in request
      const effectiveSettings = userSettings ? {
        ...userSettings,
        preferredProvider: provider || userSettings.preferredProvider || 'gemini',
        preferredModel: model || userSettings.preferredModel || 'gemini-2.5-flash',
        chatSettings: {
          ...(userSettings.chatSettings || {}),
          temperature: temperature !== undefined ? temperature : (userSettings.chatSettings as any)?.temperature || 0.7
        }
      } : undefined;
      
      // Generate AI response using RAG with streaming
      const ragResponse = await aiService.generateRagResponseStream(
        content,
        relevantItems,
        effectiveSettings,
        (chunk: string) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );
      
      // Save AI response
      const aiMessageData = insertChatMessageSchema.parse({
        conversationId,
        role: "assistant",
        content: fullResponse,
        metadata: {
          sources: ragResponse.sources.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
          })),
          model: ragResponse.model,
          provider: ragResponse.provider,
        },
      });
      
      const aiMessage = await storage.addMessageToConversation(aiMessageData);
      
      // Send completion
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        message: aiMessage,
        sources: ragResponse.sources
      })}\n\n`);
      
      res.end();
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process message' })}\n\n`);
      res.end();
    }
  });

  // Legacy non-streaming chat endpoint
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: conversationId } = req.params;
      const { content } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Verify conversation belongs to user
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Save user message
      const userMessageData = insertChatMessageSchema.parse({
        conversationId,
        role: "user",
        content,
      });
      
      const userMessage = await storage.addMessageToConversation(userMessageData);
      
      // Get user's AI settings
      const userSettings = await storage.getUserAiSettings(userId);
      
      // Retrieve relevant knowledge items
      const allItems = await storage.getKnowledgeItemsByUser(userId, 1000);
      const relevantItems = await searchKnowledgeBase(content, allItems);
      
      // Generate AI response using RAG
      const ragResponse = await aiService.generateRagResponse(
        content,
        relevantItems,
        userSettings || undefined
      );
      
      // Save AI response
      const aiMessageData = insertChatMessageSchema.parse({
        conversationId,
        role: "assistant",
        content: ragResponse.response,
        metadata: {
          sources: ragResponse.sources.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
          })),
          model: ragResponse.model,
          provider: ragResponse.provider,
        },
      });
      
      const aiMessage = await storage.addMessageToConversation(aiMessageData);
      
      res.json({
        userMessage,
        aiMessage: {
          ...aiMessage,
          sources: ragResponse.sources,
        },
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
  
  // User AI settings endpoints
  
  // Get user's AI settings
  app.get("/api/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserAiSettings(userId);
      
      // Don't send API keys in response, only indicate if they exist
      if (settings && settings.customApiKeys) {
        const apiKeys = settings.customApiKeys as any;
        const maskedKeys: any = {};
        
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (key && typeof key === "string") {
            maskedKeys[provider] = key.slice(0, 8) + "***masked***";
          }
        }
        
        res.json({
          ...settings,
          customApiKeys: maskedKeys,
        });
      } else {
        res.json(settings || {
          preferredProvider: "gemini",
          preferredModel: "gemini-2.5-flash",
          customApiKeys: {},
          chatSettings: {},
        });
      }
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ error: "Failed to fetch AI settings" });
    }
  });
  
  // Update user's AI settings
  app.put("/api/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { preferredProvider, preferredModel, customApiKeys, chatSettings } = req.body;
      
      const settingsData = {
        userId,
        preferredProvider: preferredProvider || "gemini",
        preferredModel: preferredModel || "gemini-2.5-flash",
        customApiKeys: customApiKeys || {},
        chatSettings: chatSettings || {},
      };
      
      const settings = await storage.upsertUserAiSettings(settingsData);
      
      // Don't send API keys back
      const response = { ...settings };
      if (response.customApiKeys) {
        const apiKeys = response.customApiKeys as any;
        const maskedKeys: any = {};
        
        for (const [provider, key] of Object.entries(apiKeys)) {
          if (key && typeof key === "string") {
            maskedKeys[provider] = key.slice(0, 8) + "***masked***";
          }
        }
        
        response.customApiKeys = maskedKeys;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ error: "Failed to update AI settings" });
    }
  });
  
  // Get available AI models
  app.get("/api/ai-models", isAuthenticated, (req: any, res) => {
    try {
      const providers = aiService.getSupportedProviders();
      const models: Record<string, string[]> = {};
      
      for (const provider of providers) {
        models[provider] = aiService.getAvailableModels(provider);
      }
      
      res.json({
        providers,
        models,
      });
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });

  // WeChat integration routes
  app.use("/api/wechat", wechatRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
