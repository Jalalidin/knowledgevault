import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

export async function processImageWithGemini(base64Image: string, fileName?: string): Promise<ProcessedContent> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes images for a personal knowledge management system. Create concise, clear content descriptions optimized for search and knowledge retrieval.

CRITICAL REQUIREMENTS:
- Summary must be under 70 words
- NO meta-references like "image shows", "photo captures", "this depicts"
- Write directly about what you see
- Be factual and searchable

EXAMPLE:
For a cat sleeping on a sofa, write:
"Orange tabby cat sleeping face-down on grey sofa. Head buried in cushions, white-socked paw hanging over edge. Covered by beige patterned blanket. Relaxed posture in comfortable indoor setting."

NOT: "An endearing image captures a cat in deep sleep..."

Respond with JSON in this exact format:
{
  "title": "specific descriptive title",
  "summary": "concise description under 70 words",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name",
  "suggestedFileName": "clean_filename_without_spaces"
}`;

    const contents = [
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
      `Analyze and describe the content concisely. Focus on:
      - Key subjects, objects, and activities
      - Setting, environment, and context
      - Notable colors, style, or composition
      - Any visible text or writing
      - Important details for searchability
      
Write descriptions without phrases like "the image shows" or "this image contains" - describe directly what is present.
      
Title example: "Golden retriever playing in park" or "Modern kitchen with marble countertops"
      
Filename example: "golden_retriever_playing_park" or "modern_kitchen_marble_countertops"
      
      ${fileName ? `\nOriginal file name: ${fileName}` : ""}`,
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            tags: { 
              type: "array",
              items: { type: "string" }
            },
            category: { type: "string" },
            suggestedFileName: { type: "string" }
          },
          required: ["title", "summary", "tags", "category"],
        },
      },
      contents: contents,
    });

    const rawJson = response.text;
    console.log(`Gemini Raw JSON: ${rawJson}`);

    if (rawJson) {
      const result = JSON.parse(rawJson);
      
      return {
        title: result.title || fileName || "Image Content",
        summary: result.summary || "Image content analyzed with AI",
        tags: Array.isArray(result.tags) ? result.tags : ["image"],
        category: result.category || "Visual Content",
        metadata: {
          analyzed: true,
          fileName: fileName || 'untitled',
          suggestedFileName: result.suggestedFileName || null,
          processedWith: 'gemini-2.5-flash'
        }
      };
    } else {
      throw new Error("Empty response from Gemini model");
    }
  } catch (error) {
    console.error("Error processing image with Gemini:", error);
    throw new Error(`Failed to process image with Gemini: ${error}`);
  }
}

export async function analyzeImage(jpegImagePath: string): Promise<string> {
  const imageBytes = fs.readFileSync(jpegImagePath);

  const contents = [
    {
      inlineData: {
        data: imageBytes.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    `Analyze this image in detail and describe its key elements, context,
and any notable aspects.`,
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: contents,
  });

  return response.text || "";
}

export async function processTextContent(content: string): Promise<ProcessedContent> {
  try {
    const systemPrompt = `You are an AI assistant that processes text content for a personal knowledge management system. Analyze the provided text and extract a concise title, summary, relevant tags, and category.

CRITICAL REQUIREMENTS:
- Summary must be under 70 words
- Title should be descriptive and concise
- Tags should be relevant and searchable
- Category should be meaningful

Respond with JSON in this exact format:
{
  "title": "specific descriptive title",
  "summary": "concise summary under 70 words",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            tags: { 
              type: "array",
              items: { type: "string" }
            },
            category: { type: "string" }
          },
          required: ["title", "summary", "tags", "category"],
        },
      },
      contents: `Analyze this text content and provide structured metadata:\n\n${content}`,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      title: result.title || "Untitled Content",
      summary: result.summary || "No summary available",
      tags: Array.isArray(result.tags) ? result.tags : [],
      category: result.category || "General"
    };
  } catch (error) {
    console.error("Error processing text content with Gemini:", error);
    throw new Error(`Failed to process text content with Gemini: ${error}`);
  }
}

export async function processLinkContent(url: string): Promise<ProcessedContent> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes web links for a personal knowledge management system. Analyze the provided URL and extract metadata about it.

CRITICAL REQUIREMENTS:
- Summary must be under 70 words
- Extract meaningful information from the URL structure
- Generate relevant tags and category
- Detect video platforms (YouTube, Vimeo, etc.)

Respond with JSON in this exact format:
{
  "title": "descriptive title",
  "summary": "concise description under 70 words",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name",
  "metadata": {
    "domain": "example.com",
    "platform": "youtube|vimeo|website",
    "videoId": "id_if_video"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            tags: { 
              type: "array",
              items: { type: "string" }
            },
            category: { type: "string" },
            metadata: {
              type: "object",
              properties: {
                domain: { type: "string" },
                platform: { type: "string" },
                videoId: { type: "string" }
              }
            }
          },
          required: ["title", "summary", "tags", "category"],
        },
      },
      contents: `Analyze this URL and provide structured metadata:\n\nURL: ${url}`,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      title: result.title || url,
      summary: result.summary || `Link to ${url}`,
      tags: Array.isArray(result.tags) ? result.tags : ["link"],
      category: result.category || "Web Links",
      metadata: result.metadata || { domain: new URL(url).hostname }
    };
  } catch (error) {
    console.error("Error processing link with Gemini:", error);
    throw new Error(`Failed to process link with Gemini: ${error}`);
  }
}

export async function processDocumentContent(filePath: string, fileName: string): Promise<ProcessedContent> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes document files for a personal knowledge management system. Based on the filename and type, generate appropriate metadata.

CRITICAL REQUIREMENTS:
- Summary must be under 70 words
- Generate relevant tags based on filename and type
- Categorize appropriately

Respond with JSON in this exact format:
{
  "title": "descriptive title",
  "summary": "concise description under 70 words",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            tags: { 
              type: "array",
              items: { type: "string" }
            },
            category: { type: "string" }
          },
          required: ["title", "summary", "tags", "category"],
        },
      },
      contents: `Analyze this document and provide structured metadata:\n\nFile name: ${fileName}\nFile path: ${filePath}`,
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      title: result.title || fileName,
      summary: result.summary || `Document: ${fileName}`,
      tags: Array.isArray(result.tags) ? result.tags : ["document"],
      category: result.category || "Documents"
    };
  } catch (error) {
    console.error("Error processing document with Gemini:", error);
    throw new Error(`Failed to process document with Gemini: ${error}`);
  }
}

export async function transcribeAudio(filePath: string): Promise<{ text: string }> {
  // Note: Gemini doesn't have built-in audio transcription
  // This is a placeholder that returns basic metadata
  try {
    return {
      text: `Audio file transcription not available. File: ${filePath}`
    };
  } catch (error) {
    console.error("Error with audio transcription:", error);
    throw new Error(`Audio transcription not supported: ${error}`);
  }
}

export async function searchKnowledgeBase(query: string, items: any[]): Promise<any[]> {
  try {
    const systemPrompt = `You are an AI assistant that searches through a knowledge base. Given a search query and a list of knowledge items, identify the most relevant items that match the query.

Analyze each item's title, summary, content, tags, and type to determine relevance.
Return the IDs of the most relevant items in order of relevance.

Query: "${query}"

Respond with JSON in this format:
{
  "relevantIds": ["id1", "id2", "id3"]
}`;

    const itemsText = items.map(item => 
      `ID: ${item.id}\nTitle: ${item.title}\nSummary: ${item.summary || ''}\nType: ${item.type}\nTags: ${item.knowledgeItemTags?.map((kt: any) => kt.tag.name).join(', ') || ''}\n---`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            relevantIds: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["relevantIds"],
        },
      },
      contents: `Search through these items:\n\n${itemsText}`,
    });

    const result = JSON.parse(response.text || "{}");
    const relevantIds = result.relevantIds || [];
    
    // Return items in order of relevance
    return relevantIds.map((id: string) => items.find(item => item.id === id)).filter(Boolean);
  } catch (error) {
    console.error("Error searching with Gemini:", error);
    // Fallback to simple keyword matching
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.title?.toLowerCase().includes(lowerQuery) ||
      item.summary?.toLowerCase().includes(lowerQuery) ||
      item.content?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }
}

export async function summarizeText(text: string): Promise<string> {
  const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Something went wrong";
}
