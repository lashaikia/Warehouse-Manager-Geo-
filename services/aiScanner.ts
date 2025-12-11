import { GoogleGenAI, Type } from "@google/genai";

// ინიციალიზაცია
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ScannedItem {
  nomenclature: string;
  name: string;
  category: string;
  warehouse: string; // Added warehouse
  quantity: number;
  unit: string;
}

export const scanDocumentImage = async (base64Image: string): Promise<ScannedItem[]> => {
  try {
    const cleanBase64 = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image of a warehouse document/table. 
            Extract a list of products/items.
            For each item, identify:
            1. Nomenclature/Code (string) - Look for columns like 'Code', 'ID', 'კოდი'.
            2. Name (string) - Look for 'Name', 'Description', 'დასახელება'.
            3. Category (string) - Look for 'Category', 'კატეგორია'.
            4. Warehouse (string) - Look for 'Warehouse', 'Location', 'საწყობი'.
            5. Quantity (number) - Look for 'Qty', 'Amount', 'რაოდენობა', 'ნაშთი'.
            6. Unit (string) - Look for 'Unit', 'Dimensions', 'განზომილება', 'ერთეული'. Return exact text found (e.g. 'ცალი', 'კგ').
            
            Return the result in JSON format.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nomenclature: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              warehouse: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING }
            },
            required: ['name', 'quantity']
          }
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return [];

  } catch (error) {
    console.error("AI Scan Error:", error);
    throw new Error("დოკუმენტის დამუშავება ვერ მოხერხდა. სცადეთ თავიდან.");
  }
};