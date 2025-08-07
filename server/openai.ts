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
  thumbnailUrl?: string;
  metadata?: {
    videoId?: string;
    duration?: string;
    platform?: string;
    dimensions?: { width: number; height: number };
    [key: string]: any;
  };
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
          content: "You are an AI assistant that analyzes images for a personal knowledge management system. Provide detailed, specific analysis including what's in the image, the context, style, colors, people, objects, text, activities, and any other relevant details. Create descriptive, searchable tags and categorize appropriately. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image in detail and provide comprehensive structured metadata. Pay attention to:
              - Main subjects and objects
              - Activities or actions
              - Setting/location/context
              - Style and composition
              - Colors and lighting
              - Any text or writing visible
              - Purpose or intent of the image
              - Technical aspects if relevant
              ${fileName ? `\nFile name: ${fileName}` : ""}`
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
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || fileName || "Image Content",
      summary: result.summary || "Image content",
      tags: Array.isArray(result.tags) ? result.tags : ["image"],
      category: result.category || "Visual Content",
      metadata: {
        analyzed: true,
        fileName: fileName || 'untitled'
      }
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

// Enhanced video link processing
export async function processVideoLink(url: string): Promise<ProcessedContent> {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  
  // YouTube video processing
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
    let videoId = '';
    if (domain.includes('youtu.be')) {
      videoId = urlObj.pathname.substring(1);
    } else {
      videoId = urlObj.searchParams.get('v') || '';
    }
    
    if (videoId) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      try {
        // Try to fetch video title and description from YouTube
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video';
        
        return {
          title,
          summary: `YouTube video: ${title}`,
          tags: ['video', 'youtube', 'media', 'entertainment'],
          category: 'Video Content',
          thumbnailUrl,
          metadata: {
            videoId,
            platform: 'youtube',
            originalUrl: url
          }
        };
      } catch (error) {
        return {
          title: 'YouTube Video',
          summary: `YouTube video from ${url}`,
          tags: ['video', 'youtube', 'media'],
          category: 'Video Content',
          thumbnailUrl,
          metadata: { videoId, platform: 'youtube' }
        };
      }
    }
  }
  
  // Vimeo video processing
  if (domain.includes('vimeo.com')) {
    const pathParts = urlObj.pathname.split('/');
    const videoId = pathParts[1];
    
    if (videoId && /^\d+$/.test(videoId)) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(' on Vimeo', '').trim() : 'Vimeo Video';
        
        return {
          title,
          summary: `Vimeo video: ${title}`,
          tags: ['video', 'vimeo', 'media', 'creative'],
          category: 'Video Content',
          metadata: {
            videoId,
            platform: 'vimeo',
            originalUrl: url
          }
        };
      } catch (error) {
        return {
          title: 'Vimeo Video',
          summary: `Vimeo video from ${url}`,
          tags: ['video', 'vimeo', 'media'],
          category: 'Video Content',
          metadata: { videoId, platform: 'vimeo' }
        };
      }
    }
  }
  
  // Fall back to general link processing
  return processLinkContent(url);
}

export async function processLinkContent(url: string): Promise<ProcessedContent> {
  try {
    // Check if it's a video link first
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    if (domain.includes('youtube') || domain.includes('youtu.be') || domain.includes('vimeo')) {
      return processVideoLink(url);
    }
    
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
    
    // Extract meta description and other metadata
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const description = descMatch ? descMatch[1] : '';
    
    // Extract Open Graph image if available
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    const thumbnailUrl = ogImageMatch ? ogImageMatch[1] : undefined;
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes web content for a personal knowledge management system. Provide detailed analysis and generate meaningful, specific tags based on the actual content, topic, technology, context, and purpose. Focus on creating useful, searchable tags. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string }"
        },
        {
          role: "user",
          content: `Analyze this webpage content comprehensively and provide structured metadata. Focus on the main topic, purpose, industry, technology, and key concepts.

URL: ${url}
Domain: ${domain}
HTML Title: ${htmlTitle}
Meta Description: ${description}

Content Preview:
${textContent.substring(0, 4000)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(aiResponse.choices[0].message.content || "{}");
    
    return {
      title: result.title || htmlTitle || `Content from ${domain}`,
      summary: result.summary || description || `Web content from ${url}`,
      tags: Array.isArray(result.tags) ? result.tags : ["web", domain],
      category: result.category || "Web Content",
      thumbnailUrl,
      metadata: {
        domain,
        originalUrl: url,
        hasDescription: !!description
      }
    };
  } catch (error) {
    console.error("Error processing link content:", error);
    // Enhanced fallback processing
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Generate better fallback tags and categories based on domain
    let fallbackTags = ["web", domain];
    let category = "Web Content";
    
    if (domain.includes('github')) {
      fallbackTags.push('code', 'repository', 'programming', 'open-source');
      category = "Development";
    } else if (domain.includes('youtube') || domain.includes('youtu.be')) {
      fallbackTags.push('video', 'media', 'entertainment');
      category = "Video Content";
    } else if (domain.includes('vimeo')) {
      fallbackTags.push('video', 'media', 'creative');
      category = "Video Content";
    } else if (domain.includes('wikipedia')) {
      fallbackTags.push('reference', 'knowledge', 'encyclopedia');
      category = "Reference";
    } else if (domain.includes('stackoverflow') || domain.includes('stackexchange')) {
      fallbackTags.push('programming', 'q&a', 'development', 'community');
      category = "Development";
    } else if (domain.includes('medium') || domain.includes('substack')) {
      fallbackTags.push('article', 'blog', 'writing');
      category = "Article";
    } else if (domain.includes('reddit')) {
      fallbackTags.push('discussion', 'community', 'social');
      category = "Social";
    } else if (domain.includes('linkedin')) {
      fallbackTags.push('professional', 'networking', 'career');
      category = "Professional";
    }
    
    return {
      title: `Content from ${domain}`,
      summary: `Web link to ${url}`,
      tags: fallbackTags,
      category,
      metadata: {
        domain,
        fallback: true
      }
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
