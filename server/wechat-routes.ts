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

// Generate QR code for account linking
router.get("/link/qr", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const qrCodeDataUrl = await wechatService.generateLinkingQRCode(userId);
    
    res.json({ qrCode: qrCodeDataUrl });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Handle account linking from QR code scan
router.get("/link", async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send("Missing token parameter");
  }

  // This would be called when user scans the QR code
  // In a real implementation, this might redirect to a confirmation page
  res.send(`
    <html>
      <body>
        <h1>WeChat Account Linking</h1>
        <p>Please complete the linking process in WeChat by following the prompts.</p>
        <p>Token: ${token}</p>
        <script>
          // In a real implementation, this could communicate with WeChat
          // or show instructions to the user
        </script>
      </body>
    </html>
  `);
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