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
  processImageContent,
  processDocumentContent,
  transcribeAudio,
  searchKnowledgeBase,
  processLinkContent,
} from "./openai";
import { insertKnowledgeItemSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";

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

  // Search knowledge items
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Get all user's knowledge items for AI search
      const allItems = await storage.getKnowledgeItemsByUser(userId, 1000);
      
      // Use AI to find relevant items
      const relevantItems = await searchKnowledgeBase(query, allItems);
      
      res.json(relevantItems);
    } catch (error) {
      console.error("Error searching knowledge items:", error);
      // Fallback to database search
      try {
        const userId = req.user.claims.sub;
        const query = req.query.q as string;
        const items = await storage.searchKnowledgeItems(userId, query);
        res.json(items);
      } catch (fallbackError) {
        res.status(500).json({ error: "Failed to search knowledge items" });
      }
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
          processedContent = await processImageContent(base64Image, fileName);
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

  // Process text content
  app.post("/api/process-text", isAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required" });
      }

      const processedContent = await processTextContent(content);
      res.json({ processedContent });
    } catch (error) {
      console.error("Error processing text:", error);
      res.status(500).json({ error: "Failed to process text" });
    }
  });

  // Process web link with enhanced video and thumbnail support
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

  // Process image with AI before upload
  app.post("/api/process-image", isAuthenticated, async (req: any, res) => {
    try {
      const { base64Image, fileName, fileSize, mimeType } = req.body;
      
      if (!base64Image) {
        return res.status(400).json({ error: "base64Image is required" });
      }

      // Process image with AI
      const processedContent = await processImageContent(base64Image, fileName);
      
      res.json(processedContent);
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Failed to process image with AI" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
