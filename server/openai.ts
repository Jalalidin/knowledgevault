import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: "sk-3TGG97tC9UMWRb5OKond8idSRbdjYryBihkF9liopYUKNbDM",
  baseURL: "https://api.lhyb.dpdns.org/v1"
});

export interface ProcessedContent {
  title: string;
  summary: string;
  tags: string[];
  category: string;
}

export async function processTextContent(content: string): Promise<ProcessedContent> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that processes text content for a personal knowledge management system. Analyze the provided text and extract a concise title, summary, relevant tags, and category. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: `Please analyze this text content and provide structured metadata:\n\n${content}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "Untitled Content",
      summary: result.summary || "No summary available",
      tags: Array.isArray(result.tags) ? result.tags : [],
      category: result.category || "General"
    };
  } catch (error) {
    console.error("Error processing text content:", error);
    throw new Error("Failed to process text content");
  }
}

export async function processImageContent(base64Image: string, fileName?: string): Promise<ProcessedContent> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes images for a personal knowledge management system. Describe the image content and provide a title, summary, relevant tags, and category. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and provide structured metadata. ${fileName ? `File name: ${fileName}` : ""}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || fileName || "Image Content",
      summary: result.summary || "Image content",
      tags: Array.isArray(result.tags) ? result.tags : ["image"],
      category: result.category || "Visual"
    };
  } catch (error) {
    console.error("Error processing image content:", error);
    throw new Error("Failed to process image content");
  }
}

export async function transcribeAudio(audioFilePath: string): Promise<{ text: string, duration?: number }> {
  try {
    const fs = await import("fs");
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
    });

    return {
      text: transcription.text,
      duration: 0, // Duration not available in current API response
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio content");
  }
}

export async function processDocumentContent(content: string, fileName?: string): Promise<ProcessedContent> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that processes document content for a personal knowledge management system. Analyze the provided document text and extract a meaningful title, comprehensive summary, relevant tags, and category. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: `Please analyze this document content and provide structured metadata. ${fileName ? `File name: ${fileName}` : ""}\n\nContent:\n${content.substring(0, 4000)}` // Limit content length
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || fileName || "Document",
      summary: result.summary || "Document content",
      tags: Array.isArray(result.tags) ? result.tags : ["document"],
      category: result.category || "Document"
    };
  } catch (error) {
    console.error("Error processing document content:", error);
    throw new Error("Failed to process document content");
  }
}

export async function processLinkContent(url: string): Promise<ProcessedContent> {
  try {
    // Fetch the webpage content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract text content from HTML (basic extraction)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 8000); // Limit content length for API
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const htmlTitle = titleMatch ? titleMatch[1].trim() : '';
    
    // Parse URL for context
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes web content for a personal knowledge management system. Analyze the provided webpage content and generate meaningful, specific tags based on the actual content, topic, technology, and context. Focus on creating useful, searchable tags that describe what this content is about. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: `Analyze this webpage content and provide structured metadata. Generate specific, contextual tags based on the actual content.

URL: ${url}
Domain: ${domain}
HTML Title: ${htmlTitle}

Content:
${textContent}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(aiResponse.choices[0].message.content || "{}");
    
    return {
      title: result.title || htmlTitle || `Content from ${domain}`,
      summary: result.summary || `Web content from ${url}`,
      tags: Array.isArray(result.tags) ? result.tags : ["web", domain],
      category: result.category || "Web Content"
    };
  } catch (error) {
    console.error("Error processing link content:", error);
    // Fallback to basic processing
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Generate better fallback tags based on domain
    let fallbackTags = ["web", domain];
    if (domain.includes('github')) fallbackTags.push('code', 'repository', 'programming');
    if (domain.includes('youtube')) fallbackTags.push('video', 'media');
    if (domain.includes('wikipedia')) fallbackTags.push('reference', 'knowledge');
    if (domain.includes('stackoverflow')) fallbackTags.push('programming', 'q&a', 'development');
    
    return {
      title: `Content from ${domain}`,
      summary: `Web link to ${url}`,
      tags: fallbackTags,
      category: "Web Content"
    };
  }
}

export async function searchKnowledgeBase(query: string, knowledgeItems: any[]): Promise<any[]> {
  try {
    const itemsText = knowledgeItems.map(item => 
      `ID: ${item.id}\nTitle: ${item.title}\nSummary: ${item.summary}\nContent: ${item.content || ""}\nTags: ${item.knowledgeItemTags?.map((kt: any) => kt.tag.name).join(", ") || ""}`
    ).join("\n\n---\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a search assistant for a personal knowledge management system. Given a user query and a list of knowledge items, return the IDs of the most relevant items in order of relevance. Consider semantic similarity, not just keyword matching. Respond with JSON in this format: { 'relevantIds': string[] }"
        },
        {
          role: "user",
          content: `Search query: "${query}"\n\nKnowledge items:\n${itemsText}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const relevantIds = Array.isArray(result.relevantIds) ? result.relevantIds : [];
    
    // Return items in order of relevance
    return relevantIds
      .map((id: string) => knowledgeItems.find(item => item.id === id))
      .filter(Boolean);
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    // Fallback to simple text search
    return knowledgeItems.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.summary?.toLowerCase().includes(query.toLowerCase()) ||
      item.content?.toLowerCase().includes(query.toLowerCase())
    );
  }
}
