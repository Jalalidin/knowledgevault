import type { KnowledgeItemWithTags, UserAiSettings } from "@shared/schema";
import type { RagResponse, StreamingRagResponse } from "./ai-service";

export interface AgentResponse {
  content: string;
  agent: string;
  metadata?: Record<string, any>;
}

export interface MultiAgentRequest {
  query: string;
  context?: string;
  agentType?: 'chat' | 'document' | 'search' | 'summarize' | 'team';
  sessionId?: string;
}

export class AgnoAgentService {
  private agentApiUrl: string;
  
  constructor() {
    // Agent system runs on port 8001
    this.agentApiUrl = "http://localhost:8001";
  }

  /**
   * Generate RAG response using the multi-agent system
   */
  async generateRagResponse(
    userQuestion: string,
    relevantItems: KnowledgeItemWithTags[],
    userSettings?: UserAiSettings
  ): Promise<RagResponse> {
    const context = this.createContext(relevantItems);
    
    try {
      const response = await this.makeAgentRequest({
        query: userQuestion,
        context,
        agentType: 'chat'
      });

      return {
        response: response.content,
        sources: relevantItems,
        model: response.metadata?.model || "agno-multi-agent",
        provider: "agno-agents",
      };
    } catch (error) {
      console.error("Agno agent service error:", error);
      // Fallback to a basic response
      return {
        response: "I'm sorry, I'm having trouble accessing the multi-agent system right now. Please try again later.",
        sources: relevantItems,
        model: "fallback",
        provider: "agno-agents",
      };
    }
  }

  /**
   * Generate streaming RAG response using the multi-agent system
   */
  async generateRagResponseStream(
    userQuestion: string,
    relevantItems: KnowledgeItemWithTags[],
    userSettings?: UserAiSettings,
    onChunk?: (chunk: string) => void
  ): Promise<StreamingRagResponse> {
    const context = this.createContext(relevantItems);
    
    try {
      // For now, use non-streaming and simulate chunks
      // TODO: Implement actual streaming when Agno agents support it
      const response = await this.makeAgentRequest({
        query: userQuestion,
        context,
        agentType: 'chat'
      });

      // Simulate streaming by breaking response into chunks
      if (onChunk && response.content) {
        const words = response.content.split(' ');
        const chunkSize = 3; // Words per chunk
        
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          const finalChunk = i + chunkSize >= words.length ? chunk : chunk + ' ';
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
          onChunk(finalChunk);
        }
      }

      return {
        sources: relevantItems,
        model: response.metadata?.model || "agno-multi-agent",
        provider: "agno-agents",
      };
    } catch (error) {
      console.error("Agno agent service streaming error:", error);
      
      return {
        sources: relevantItems,
        model: "fallback",
        provider: "agno-agents",
      };
    }
  }

  /**
   * Process document using document processing agent
   */
  async processDocument(filename: string, content: string, contentType: string): Promise<{
    title: string;
    summary: string;
    tags: string[];
    insights: string[];
  }> {
    try {
      const response = await this.makeAgentRequest({
        query: `Process this document and provide analysis`,
        context: `Filename: ${filename}\nContent Type: ${contentType}\nContent: ${content}`,
        agentType: 'document'
      });

      // Parse the agent response to extract structured data
      // This is a simplified parser - in production you'd want more robust parsing
      const content_response = response.content;
      
      return {
        title: this.extractFromResponse(content_response, 'title') || filename,
        summary: this.extractFromResponse(content_response, 'summary') || 'Document processed by multi-agent system.',
        tags: this.extractTagsFromResponse(content_response),
        insights: this.extractInsightsFromResponse(content_response)
      };
    } catch (error) {
      console.error("Document processing error:", error);
      return {
        title: filename,
        summary: "Document processing temporarily unavailable.",
        tags: [],
        insights: []
      };
    }
  }

  /**
   * Search knowledge base using search agent
   */
  async searchKnowledge(query: string, limit: number = 10): Promise<{
    results: string[];
    suggestions: string[];
    relevance: string[];
  }> {
    try {
      const response = await this.makeAgentRequest({
        query,
        agentType: 'search',
        context: `Search limit: ${limit}`
      });

      return {
        results: this.extractListFromResponse(response.content, 'results'),
        suggestions: this.extractListFromResponse(response.content, 'suggestions'),
        relevance: this.extractListFromResponse(response.content, 'relevance')
      };
    } catch (error) {
      console.error("Search knowledge error:", error);
      return {
        results: [],
        suggestions: [],
        relevance: []
      };
    }
  }

  /**
   * Generate summary using summarization agent
   */
  async generateSummary(content: string): Promise<string> {
    try {
      const response = await this.makeAgentRequest({
        query: `Please provide a brief, concise summary of the following text in 1-2 sentences:`,
        context: content,
        agentType: 'summarize'
      });

      return response.content || "Summary generation temporarily unavailable.";
    } catch (error) {
      console.error("Summary generation error:", error);
      return "Summary generation temporarily unavailable.";
    }
  }

  /**
   * Generate title using team coordination
   */
  async generateTitle(content: string): Promise<string> {
    try {
      const response = await this.makeAgentRequest({
        query: `Generate a short, descriptive title (max 50 characters) for the following content:`,
        context: content,
        agentType: 'team'
      });

      const title = response.content || "Untitled Content";
      return title.length > 50 ? title.substring(0, 50).trim() + "..." : title;
    } catch (error) {
      console.error("Title generation error:", error);
      return "Untitled Content";
    }
  }

  /**
   * Check if agent system is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.agentApiUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error("Agent system health check failed:", error);
      return false;
    }
  }

  /**
   * Make request to agent system
   */
  private async makeAgentRequest(request: MultiAgentRequest): Promise<AgentResponse> {
    const endpoint = this.getEndpointForAgentType(request.agentType || 'chat');
    const requestBody = this.buildRequestBody(request);

    const response = await fetch(`${this.agentApiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Agent request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get appropriate endpoint for agent type
   */
  private getEndpointForAgentType(agentType: string): string {
    switch (agentType) {
      case 'chat':
        return '/chat';
      case 'document':
        return '/process-document';
      case 'search':
        return '/search';
      case 'summarize':
        return '/summarize';
      case 'team':
        return '/team-process';
      default:
        return '/chat';
    }
  }

  /**
   * Build request body for specific agent type
   */
  private buildRequestBody(request: MultiAgentRequest): any {
    const { query, context, agentType, sessionId } = request;

    switch (agentType) {
      case 'chat':
        return {
          content: context ? `${query}\n\nContext: ${context}` : query,
          session_id: sessionId
        };
      case 'document':
        return {
          content: context || query,
          filename: "document",
          content_type: "text/plain"
        };
      case 'search':
        return {
          query: query,
          limit: 10
        };
      case 'summarize':
        return {
          text: context || query
        };
      case 'team':
        return {
          task: context ? `${query}\n\nContext: ${context}` : query
        };
      default:
        return {
          content: query,
          session_id: sessionId
        };
    }
  }

  /**
   * Create context from knowledge items (same as AI service)
   */
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

  /**
   * Helper methods to extract structured data from agent responses
   */
  private extractFromResponse(response: string, field: string): string | null {
    const patterns = {
      title: /(?:title|Title):\s*(.+?)(?:\n|$)/i,
      summary: /(?:summary|Summary):\s*(.+?)(?:\n|$)/i,
    };

    const pattern = patterns[field as keyof typeof patterns];
    if (!pattern) return null;

    const match = response.match(pattern);
    return match ? match[1].trim() : null;
  }

  private extractTagsFromResponse(response: string): string[] {
    const tagMatch = response.match(/(?:tags|Tags):\s*(.+?)(?:\n|$)/i);
    if (!tagMatch) return [];
    
    return tagMatch[1]
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  private extractInsightsFromResponse(response: string): string[] {
    const insightMatch = response.match(/(?:insights|Insights|key points|Key Points):\s*(.+?)(?:\n|$)/i);
    if (!insightMatch) return [];
    
    return insightMatch[1]
      .split('.')
      .map(insight => insight.trim())
      .filter(insight => insight.length > 0);
  }

  private extractListFromResponse(response: string, listType: string): string[] {
    // Simple extraction - in production you'd want more sophisticated parsing
    const lines = response.split('\n');
    const relevantLines = lines.filter(line => 
      line.includes('-') || line.includes('•') || line.includes('*')
    );
    
    return relevantLines
      .map(line => line.replace(/^[\-\*\•]\s*/, '').trim())
      .filter(item => item.length > 0)
      .slice(0, 5); // Limit results
  }
}

export const agnoAgentService = new AgnoAgentService();