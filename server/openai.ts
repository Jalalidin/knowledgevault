import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
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
