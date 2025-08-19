import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { KnowledgeItemWithTags, UserAiSettings } from "@shared/schema";

export interface AiProvider {
  generateResponse(
    prompt: string,
    context: string,
    settings?: any
  ): Promise<string>;
}

export interface RagResponse {
  response: string;
  sources: KnowledgeItemWithTags[];
  model: string;
  provider: string;
}

export class GeminiProvider implements AiProvider {
  private ai: GoogleGenAI;
  
  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateResponse(
    prompt: string, 
    context: string, 
    settings: any = {}
  ): Promise<string> {
    const { model = "gemini-2.5-flash", temperature = 0.7 } = settings;
    
    const systemPrompt = `You are a knowledgeable AI assistant helping users understand their personal knowledge base. Use the provided context to answer questions accurately and comprehensively.

IMPORTANT INSTRUCTIONS:
- Base your answers primarily on the provided context
- If the context doesn't contain enough information, clearly state this
- Be conversational and helpful
- Cite specific sources when possible
- If asked about something not in the context, politely explain the limitation

Context from knowledge base:
${context}

User question: ${prompt}

Please provide a helpful and accurate response based on the available context.`;

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: systemPrompt,
      });

      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API error:", error);
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}

export class OpenAIProvider implements AiProvider {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(
    prompt: string, 
    context: string, 
    settings: any = {}
  ): Promise<string> {
    const { model = "gpt-4o", temperature = 0.7, maxTokens = 1000 } = settings;
    
    try {
      const response = await this.openai.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable AI assistant helping users understand their personal knowledge base. Use the provided context to answer questions accurately and comprehensively.

IMPORTANT INSTRUCTIONS:
- Base your answers primarily on the provided context
- If the context doesn't contain enough information, clearly state this
- Be conversational and helpful
- Cite specific sources when possible
- If asked about something not in the context, politely explain the limitation

Context from knowledge base:
${context}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
      });

      return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${error}`);
    }
  }
}

export class AiService {
  private defaultGeminiKey: string;
  
  constructor() {
    this.defaultGeminiKey = process.env.GEMINI_API_KEY || "";
  }

  private getProvider(provider: string, apiKey?: string): AiProvider {
    switch (provider.toLowerCase()) {
      case "gemini":
        return new GeminiProvider(apiKey || this.defaultGeminiKey);
      case "openai":
        if (!apiKey) {
          throw new Error("OpenAI requires a custom API key");
        }
        return new OpenAIProvider(apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async generateRagResponse(
    userQuestion: string,
    relevantItems: KnowledgeItemWithTags[],
    userSettings?: UserAiSettings
  ): Promise<RagResponse> {
    // Use user settings or fallback to defaults
    const provider = userSettings?.preferredProvider || "gemini";
    const model = userSettings?.preferredModel || "gemini-2.5-flash";
    const chatSettings = userSettings?.chatSettings || {};
    const customApiKeys = userSettings?.customApiKeys as any;
    
    // Get the appropriate API key
    let apiKey: string | undefined;
    if (customApiKeys && customApiKeys[provider]) {
      apiKey = customApiKeys[provider];
    }

    // Create context from relevant knowledge items
    const context = this.createContext(relevantItems);
    
    // Get the AI provider and generate response
    const aiProvider = this.getProvider(provider, apiKey);
    const response = await aiProvider.generateResponse(
      userQuestion,
      context,
      { model, ...chatSettings }
    );

    return {
      response,
      sources: relevantItems,
      model,
      provider,
    };
  }

  private createContext(items: KnowledgeItemWithTags[]): string {
    if (items.length === 0) {
      return "No relevant information found in the knowledge base.";
    }

    return items
      .map((item, index) => {
        const tags = item.knowledgeItemTags?.map(kt => kt.tag.name).join(", ") || "";
        const metadata = item.metadata as any;
        const category = metadata?.category || "";
        
        return `[Source ${index + 1}]
Title: ${item.title}
Type: ${item.type}
${category ? `Category: ${category}` : ""}
${tags ? `Tags: ${tags}` : ""}
Summary: ${item.summary || "No summary available"}
${item.content ? `Content: ${item.content.slice(0, 500)}${item.content.length > 500 ? "..." : ""}` : ""}
---`;
      })
      .join("\n\n");
  }

  // Get available models for a provider
  getAvailableModels(provider: string): string[] {
    switch (provider.toLowerCase()) {
      case "gemini":
        return [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-2.0-flash-preview",
        ];
      case "openai":
        return [
          "gpt-4o",
          "gpt-4o-mini",
          "gpt-4-turbo",
          "gpt-3.5-turbo",
        ];
      default:
        return [];
    }
  }

  // Get supported providers
  getSupportedProviders(): string[] {
    return ["gemini", "openai"];
  }
}

// Export singleton instance
export const aiService = new AiService();