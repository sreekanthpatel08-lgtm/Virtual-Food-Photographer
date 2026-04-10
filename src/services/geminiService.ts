import { GoogleGenAI, Type } from "@google/genai";
import { Dish, PhotoStyle, ImageSize } from "../types";

// Note: API_KEY is injected by AI Studio after user selects it.
// We should create a new instance right before making an API call.

const STYLE_PROMPTS: Record<PhotoStyle, string> = {
  rustic: "Rustic/Dark aesthetic: Moody lighting, dark wood background, high contrast, artisanal feel, deep shadows, rustic textures, warm tones, shallow depth of field.",
  modern: "Bright/Modern aesthetic: Clean white background, natural daylight, minimalist styling, vibrant colors, airy atmosphere, sharp focus, high-end commercial look.",
  social: "Social Media aesthetic: Flat lay photography, overhead view (90 degrees), trendy plating, colorful garnishes, lifestyle aesthetic, bright and even lighting, Instagram-worthy."
};

export async function parseMenu(text: string): Promise<Dish[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract a list of dishes from this menu text. For each dish, provide a name and a short descriptive summary of its ingredients and presentation. Return as a JSON array of objects with "name" and "description" fields.
    
    Menu Text:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "description"]
        }
      }
    }
  });

  const dishes: any[] = JSON.parse(response.text || "[]");
  return dishes.map((d, index) => ({
    id: `dish-${index}-${Date.now()}`,
    name: d.name,
    description: d.description
  }));
}

export async function generateDishImage(
  dish: Dish, 
  style: PhotoStyle, 
  size: ImageSize
): Promise<string> {
  const selectedKey = process.env.API_KEY;
  const defaultKey = process.env.GEMINI_API_KEY;
  
  // Ensure we don't use "undefined" or "null" as strings
  const apiKey = (selectedKey && selectedKey !== 'undefined' && selectedKey !== 'null') 
    ? selectedKey 
    : defaultKey;

  const ai = new GoogleGenAI({ apiKey });
  
  const styleContext = STYLE_PROMPTS[style];
  const prompt = `Professional food photography of ${dish.name}. ${dish.description}. ${styleContext} High-end restaurant quality, 8k resolution, photorealistic, appetizing, masterfully plated.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: size
      }
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image was generated.");
}

export async function checkApiKey(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.aistudio) return true;
  return await window.aistudio.hasSelectedApiKey();
}

export async function requestApiKey(): Promise<void> {
  if (typeof window === 'undefined' || !window.aistudio) return;
  await window.aistudio.openSelectKey();
}
