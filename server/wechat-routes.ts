import express, { Router } from "express";
import { storage } from "./storage";
import { wechatService } from "./wechat-service";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// WeChat webhook verification and message handling
router.get("/webhook", async (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  
  if (!signature || !timestamp || !nonce) {
    return res.status(400).send("Missing required parameters");
  }

  const isValid = wechatService.verifySignature(
    signature as string,
    timestamp as string,
    nonce as string
  );

  if (isValid && echostr) {
    // Verification request from WeChat
    return res.send(echostr);
  }

  return res.status(403).send("Invalid signature");
});

router.post("/webhook", async (req, res) => {
  const { signature, timestamp, nonce } = req.query;
  
  if (!signature || !timestamp || !nonce) {
    return res.status(400).send("Missing required parameters");
  }

  const isValid = wechatService.verifySignature(
    signature as string,
    timestamp as string,
    nonce as string
  );

  if (!isValid) {
    return res.status(403).send("Invalid signature");
  }

  try {
    const xmlData = req.body;
    if (typeof xmlData !== 'string') {
      return res.status(400).send("Invalid request body");
    }

    const message = await wechatService.parseXmlMessage(xmlData);
    let response: string;

    if (message.MsgType === 'event') {
      response = await wechatService.processEvent(message as any);
    } else {
      response = await wechatService.processMessage(message as any);
    }

    res.set('Content-Type', 'text/xml');
    res.send(response);
  } catch (error) {
    console.error("Error processing WeChat webhook:", error);
    res.status(500).send("Error processing message");
  }
});

// Link WeChat account using WeChat ID
router.post("/link", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { wechatId } = req.body;
    
    if (!wechatId) {
      return res.status(400).json({ error: "WeChat ID is required" });
    }
    
    const integration = await wechatService.linkWechatUserByWechatId(userId, wechatId);
    
    if (integration) {
      res.json({ success: true, integration });
    } else {
      res.status(500).json({ error: "Failed to link WeChat account" });
    }
  } catch (error) {
    console.error("Error linking WeChat account:", error);
    res.status(500).json({ error: "Failed to link WeChat account" });
  }
});

// Get current user's WeChat ID for linking instructions
router.get("/info", async (req, res) => {
  res.json({
    botAccount: process.env.WECHAT_BOT_ACCOUNT || "KnowledgeVault_Bot",
    instructions: [
      "Send messages to the KnowledgeVault WeChat account",
      "Configure your WeChat ID in the settings",
      "All your messages will be automatically saved to your knowledge base"
    ]
  });
});

// Get user's WeChat integrations
router.get("/integrations", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const integrations = await storage.getWechatIntegrationsByUser(userId);
    
    res.json(integrations);
  } catch (error) {
    console.error("Error fetching WeChat integrations:", error);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

// Delete WeChat integration
router.delete("/integrations/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    
    // Verify the integration belongs to the user
    const integrations = await storage.getWechatIntegrationsByUser(userId);
    const integration = integrations.find(i => i.id === id);
    
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    const deleted = await storage.deleteWechatIntegration(id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete integration" });
    }
  } catch (error) {
    console.error("Error deleting WeChat integration:", error);
    res.status(500).json({ error: "Failed to delete integration" });
  }
});

export default router;