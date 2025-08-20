import crypto from "crypto";
import xml2js from "xml2js";
import QRCode from "qrcode";
import NodeCache from "node-cache";
import { storage } from "./storage";
import { aiService } from "./ai-service";
import type { 
  WechatIntegration, 
  InsertWechatIntegration, 
  KnowledgeItem, 
  InsertKnowledgeItem 
} from "@shared/schema";

interface WechatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Content?: string;
  MediaId?: string;
  PicUrl?: string;
  Url?: string;
  Title?: string;
  Description?: string;
  MsgId: string;
}

interface WechatEvent {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Event: string;
  EventKey?: string;
}

export class WechatService {
  private token: string;
  private appId: string;
  private appSecret: string;
  private cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

  constructor() {
    this.token = process.env.WECHAT_TOKEN || "knowledgevault_token";
    this.appId = process.env.WECHAT_APP_ID || "";
    this.appSecret = process.env.WECHAT_APP_SECRET || "";
  }

  // Verify webhook signature from WeChat
  verifySignature(signature: string, timestamp: string, nonce: string, echostr?: string): boolean {
    const tmpArr = [this.token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const hashCode = crypto.createHash('sha1').update(tmpStr).digest('hex');
    return hashCode === signature;
  }

  // Parse XML message from WeChat
  async parseXmlMessage(xmlData: string): Promise<WechatMessage | WechatEvent> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);
    return result.xml;
  }

  // Generate XML response for WeChat
  generateXmlResponse(toUser: string, fromUser: string, content: string, msgType: string = 'text'): string {
    const timestamp = Math.floor(Date.now() / 1000);
    
    if (msgType === 'text') {
      return `<xml>
        <ToUserName><![CDATA[${toUser}]]></ToUserName>
        <FromUserName><![CDATA[${fromUser}]]></FromUserName>
        <CreateTime>${timestamp}</CreateTime>
        <MsgType><![CDATA[text]]></MsgType>
        <Content><![CDATA[${content}]]></Content>
      </xml>`;
    }
    
    return 'success';
  }

  // Link WeChat user directly using their WeChat ID
  async linkWechatUserByWechatId(userId: string, wechatId: string): Promise<WechatIntegration | null> {
    // Check if WeChat user is already linked
    const existingIntegration = await storage.getWechatIntegrationByOpenId(wechatId);
    if (existingIntegration) {
      // Update existing integration
      return await storage.updateWechatIntegration(existingIntegration.id, {
        userId,
        isActive: true,
      }) || null;
    }

    // Create new integration
    const integrationData: InsertWechatIntegration = {
      userId,
      wechatOpenId: wechatId,
      nickname: null,
      avatarUrl: null,
      linkToken: null,
      isActive: true,
    };

    return await storage.createWechatIntegration(integrationData);
  }

  // Get or create user based on WeChat ID (simplified approach)
  async getOrCreateUserForWechatId(wechatId: string): Promise<string | null> {
    // In a simplified approach, we could:
    // 1. Use a default user account
    // 2. Allow users to register their WeChat ID in settings
    // 3. Use the WeChat ID as a lookup key
    
    // For now, let's look up existing integration
    const integration = await storage.getWechatIntegrationByOpenId(wechatId);
    return integration?.userId || null;
  }

  // Process incoming WeChat message and save to knowledge base
  async processMessage(message: WechatMessage): Promise<string> {
    const wechatOpenId = message.FromUserName;
    
    // Get user integration
    const integration = await storage.getWechatIntegrationByOpenId(wechatOpenId);
    if (!integration || !integration.isActive) {
      return this.generateXmlResponse(
        wechatOpenId,
        message.ToUserName,
        "您还没有关联KnowledgeVault账户。请在网站设置中配置您的微信ID。\nYour WeChat ID is not linked to KnowledgeVault. Please configure your WeChat ID in the website settings."
      );
    }

    let knowledgeItem: KnowledgeItem | null = null;

    try {
      switch (message.MsgType) {
        case 'text':
          knowledgeItem = await this.processTextMessage(integration.userId, message);
          break;
        case 'image':
          knowledgeItem = await this.processImageMessage(integration.userId, message);
          break;
        case 'link':
          knowledgeItem = await this.processLinkMessage(integration.userId, message);
          break;
        case 'voice':
          knowledgeItem = await this.processVoiceMessage(integration.userId, message);
          break;
        default:
          return this.generateXmlResponse(
            wechatOpenId,
            message.ToUserName,
            "暂不支持此类型消息。Currently not supported message type."
          );
      }

      // Update last message time
      await storage.updateWechatIntegration(integration.id, {
        lastMessageAt: new Date(),
      });

      if (knowledgeItem) {
        return this.generateXmlResponse(
          wechatOpenId,
          message.ToUserName,
          `✅ 已保存到知识库: ${knowledgeItem.title}\n✅ Saved to KnowledgeVault: ${knowledgeItem.title}`
        );
      } else {
        return this.generateXmlResponse(
          wechatOpenId,
          message.ToUserName,
          "❌ 保存失败，请稍后重试。❌ Failed to save, please try again."
        );
      }
    } catch (error) {
      console.error("Error processing WeChat message:", error);
      return this.generateXmlResponse(
        wechatOpenId,
        message.ToUserName,
        "❌ 处理消息时出错。❌ Error processing message."
      );
    }
  }

  // Process text message
  private async processTextMessage(userId: string, message: WechatMessage): Promise<KnowledgeItem | null> {
    if (!message.Content) return null;

    // Use AI to generate title and summary
    const content = message.Content;
    let title = content.length > 50 ? content.substring(0, 50) + "..." : content;
    let summary = "";

    try {
      // Generate summary using AI if content is long enough
      if (content.length > 100) {
        summary = await aiService.generateSummary(content);
        title = await aiService.generateTitle(content);
      }
    } catch (error) {
      console.error("Error generating AI summary:", error);
    }

    const knowledgeItemData: InsertKnowledgeItem = {
      userId,
      title,
      summary,
      content,
      type: "text",
      metadata: {
        source: "wechat",
        wechatMsgId: message.MsgId,
        originalLength: content.length,
      },
      isProcessed: true,
    };

    return await storage.createKnowledgeItem(knowledgeItemData);
  }

  // Process image message
  private async processImageMessage(userId: string, message: WechatMessage): Promise<KnowledgeItem | null> {
    if (!message.PicUrl && !message.MediaId) return null;

    const imageUrl = message.PicUrl || '';
    let title = "WeChat Image";
    let summary = "";

    try {
      // Use AI to analyze image and generate description
      if (imageUrl) {
        const imageAnalysis = await aiService.analyzeImageFromUrl(imageUrl);
        title = imageAnalysis.title || title;
        summary = imageAnalysis.description || "";
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
    }

    const knowledgeItemData: InsertKnowledgeItem = {
      userId,
      title,
      summary,
      content: summary,
      type: "image",
      fileUrl: imageUrl,
      metadata: {
        source: "wechat",
        wechatMsgId: message.MsgId,
        mediaId: message.MediaId,
        picUrl: message.PicUrl,
      },
      isProcessed: !!summary,
    };

    return await storage.createKnowledgeItem(knowledgeItemData);
  }

  // Process link message
  private async processLinkMessage(userId: string, message: WechatMessage): Promise<KnowledgeItem | null> {
    const url = message.Url;
    const title = message.Title || "WeChat Link";
    const description = message.Description || "";

    if (!url) return null;

    let content = description;
    let summary = description;

    try {
      // Fetch and process link content using AI
      const linkAnalysis = await aiService.processWebLink(url);
      if (linkAnalysis.content) {
        content = linkAnalysis.content;
        summary = linkAnalysis.summary || description;
      }
    } catch (error) {
      console.error("Error processing link:", error);
    }

    const knowledgeItemData: InsertKnowledgeItem = {
      userId,
      title,
      summary,
      content,
      type: "link",
      fileUrl: url,
      metadata: {
        source: "wechat",
        wechatMsgId: message.MsgId,
        originalTitle: message.Title,
        originalDescription: message.Description,
      },
      isProcessed: !!content,
    };

    return await storage.createKnowledgeItem(knowledgeItemData);
  }

  // Process voice message
  private async processVoiceMessage(userId: string, message: WechatMessage): Promise<KnowledgeItem | null> {
    if (!message.MediaId) return null;

    // Note: Voice processing would require downloading media from WeChat
    // This is a simplified version
    const title = "WeChat Voice Message";
    const content = "Voice message from WeChat (transcription not available)";

    const knowledgeItemData: InsertKnowledgeItem = {
      userId,
      title,
      summary: content,
      content,
      type: "audio",
      metadata: {
        source: "wechat",
        wechatMsgId: message.MsgId,
        mediaId: message.MediaId,
        needsTranscription: true,
      },
      isProcessed: false,
    };

    return await storage.createKnowledgeItem(knowledgeItemData);
  }

  // Handle WeChat events (subscribe, unsubscribe, etc.)
  async processEvent(event: WechatEvent): Promise<string> {
    const wechatOpenId = event.FromUserName;

    switch (event.Event) {
      case 'subscribe':
        return this.generateXmlResponse(
          wechatOpenId,
          event.ToUserName,
          "欢迎关注KnowledgeVault！🎉\n请在网站设置中配置您的微信ID来开始使用。\n\nWelcome to KnowledgeVault! 🎉\nPlease configure your WeChat ID in the website settings to start using."
        );
      
      case 'unsubscribe':
        // Deactivate integration
        const integration = await storage.getWechatIntegrationByOpenId(wechatOpenId);
        if (integration) {
          await storage.updateWechatIntegration(integration.id, { isActive: false });
        }
        return 'success';
      
      case 'SCAN':
        // For simplified linking, just provide instructions
        return this.generateXmlResponse(
          wechatOpenId,
          event.ToUserName,
          "请在KnowledgeVault网站设置中配置您的微信ID：${wechatOpenId}\nPlease configure your WeChat ID in KnowledgeVault website settings: ${wechatOpenId}"
        );
      
      default:
        return 'success';
    }
  }
}

export const wechatService = new WechatService();