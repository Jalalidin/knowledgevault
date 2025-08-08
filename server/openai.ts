import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          content: "You are an AI assistant that analyzes images for a personal knowledge management system. Provide detailed, specific analysis including what's in the image, the context, style, colors, people, objects, text, activities, and any other relevant details. Create descriptive, searchable tags and categorize appropriately. IMPORTANT: Generate a descriptive, meaningful title that describes what's actually in the image - not just 'image' or 'photo'. Make the title specific and informative. Respond with JSON in this format: { 'title': string, 'summary': string, 'tags': string[], 'category': string, 'suggestedFileName': string }"
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
              
For the title: Create a descriptive, specific title that explains what's in the image (e.g., "Golden retriever playing in park", "Modern kitchen with marble countertops", "Team meeting in conference room")
              
For suggestedFileName: Create a clean, descriptive filename without spaces (use underscores or hyphens) that reflects the content (e.g., "golden_retriever_playing_park", "modern_kitchen_marble_countertops", "team_meeting_conference_room")
              
              ${fileName ? `\nOriginal file name: ${fileName}` : ""}`
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
        fileName: fileName || 'untitled',
        suggestedFileName: result.suggestedFileName || null
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

// Enhanced video link processing with AI-generated summaries
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
        // Fetch video page to extract metadata
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const html = await response.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video';
        
        // Extract description from meta tags
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
        const description = descMatch ? descMatch[1] : '';
        
        // Extract channel name
        const channelMatch = html.match(/"author"[^}]*"name"[^}]*"text"[^}]*"simpleText"[^}]*"([^"]+)"/i) ||
                            html.match(/"ownerChannelName"[^}]*"simpleText"[^}]*"([^"]+)"/i);
        const channel = channelMatch ? channelMatch[1] : '';
        
        // Generate AI summary using DeepSeek Chat for better summarization
        const aiResponse = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: `Create a detailed, helpful summary for this YouTube video that explains what the content covers and why someone might want to watch it.

Video Details:
- Title: ${title}
- Channel: ${channel || 'Unknown'}
- Description: ${description || 'No description available'}
- URL: ${url}

Please provide:
1. A comprehensive summary (2-3 sentences) covering the main content, key topics, and value proposition
2. 5-8 relevant, specific tags based on the actual content (include 'video', 'youtube')
3. An appropriate category name

Format as JSON: { "summary": "...", "tags": [...], "category": "..." }`
            }
          ],
          max_tokens: 400
        });

        let aiResult: any = {};
        try {
          const content = aiResponse.choices[0].message.content || '{}';
          // Try to extract JSON from the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
        } catch (error) {
          console.log('Error parsing YouTube AI response, using fallback');
          aiResult = {};
        }
        
        return {
          title,
          summary: aiResult.summary || `YouTube video by ${channel}: ${title}`,
          tags: Array.isArray(aiResult.tags) ? [...aiResult.tags, 'video', 'youtube'] : ['video', 'youtube', 'media'],
          category: aiResult.category || 'Video Content',
          thumbnailUrl,
          metadata: {
            videoId,
            platform: 'youtube',
            channel,
            originalUrl: url,
            description: description.substring(0, 500) // Store first 500 chars
          }
        };
      } catch (error) {
        console.error('Error processing YouTube video:', error);
        return {
          title: 'YouTube Video',
          summary: `YouTube video content from ${url}. Unable to analyze content due to processing limitations.`,
          tags: ['video', 'youtube', 'media'],
          category: 'Video Content',
          thumbnailUrl,
          metadata: { videoId, platform: 'youtube', originalUrl: url }
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
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(' on Vimeo', '').trim() : 'Vimeo Video';
        
        // Extract description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        const description = descMatch ? descMatch[1] : '';
        
        // Generate AI summary using DeepSeek Chat
        const aiResponse = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: `Create a detailed, helpful summary for this Vimeo video that explains what the content covers and why someone might want to watch it.

Video Details:
- Title: ${title}
- Description: ${description || 'No description available'}
- URL: ${url}

Please provide:
1. A comprehensive summary (2-3 sentences) covering the main content and value
2. 5-8 relevant, specific tags (include 'video', 'vimeo')
3. An appropriate category name

Format as JSON: { "summary": "...", "tags": [...], "category": "..." }`
            }
          ],
          max_tokens: 300
        });

        let aiResult: any = {};
        try {
          const content = aiResponse.choices[0].message.content || '{}';
          // Try to extract JSON from the content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
        } catch (error) {
          console.log('Error parsing Vimeo AI response, using fallback');
          aiResult = {};
        }
        
        return {
          title,
          summary: aiResult.summary || `Vimeo video: ${title}`,
          tags: Array.isArray(aiResult.tags) ? [...aiResult.tags, 'video', 'vimeo'] : ['video', 'vimeo', 'media'],
          category: aiResult.category || 'Video Content',
          metadata: {
            videoId,
            platform: 'vimeo',
            originalUrl: url,
            description: description.substring(0, 500)
          }
        };
      } catch (error) {
        console.error('Error processing Vimeo video:', error);
        return {
          title: 'Vimeo Video',
          summary: `Vimeo video content from ${url}. Creative video content hosted on Vimeo platform.`,
          tags: ['video', 'vimeo', 'media', 'creative'],
          category: 'Video Content',
          metadata: { videoId, platform: 'vimeo', originalUrl: url }
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
