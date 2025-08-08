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

export async function processImageWithGemini(base64Image: string, fileName?: string): Promise<ProcessedContent> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes images for a personal knowledge management system. Provide detailed, specific analysis including what's in the image, the context, style, colors, people, objects, text, activities, and any other relevant details. Create descriptive, searchable tags and categorize appropriately. 

IMPORTANT: Generate a descriptive, meaningful title that describes what's actually in the image - not just 'image' or 'photo'. Make the title specific and informative.

Respond with JSON in this exact format:
{
  "title": "specific descriptive title",
  "summary": "detailed description of image content",
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
      `Analyze this image in detail and provide comprehensive structured metadata. Pay attention to:
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

export async function summarizeText(text: string): Promise<string> {
  const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Something went wrong";
}
