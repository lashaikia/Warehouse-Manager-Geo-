import { GoogleGenAI, Type } from "@google/genai";

// ინიციალიზაცია
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ScannedItem {
  nomenclature: string;
  name: string;
  quantity: number;
  unit: string;
}

export const scanDocumentImage = async (base64Image: string): Promise<ScannedItem[]> => {
  try {
    // სურათის ფორმატირების გასწორება (data:image/png;base64, ნაწილის მოცილება)
    const cleanBase64 = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // ვუშვებთ რომ უმეტესად JPEG/PNG იქნება
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image of a warehouse document/table. 
            Extract a list of products/items.
            For each item, identify:
            1. Nomenclature/Code (string) - Look for columns like 'Code', 'ID', 'კოდი'.
            2. Name (string) - Look for 'Name', 'Description', 'დასახელება'.
            3. Quantity (number) - Look for 'Qty', 'Amount', 'რაოდენობა', 'ნაშთი'.
            4. Unit (string) - Look for 'Unit', 'Dimensions', 'განზომილება'. Map strictly to one of: 'pcs', 'kg', 'm', 'l'. Default to 'pcs' if unclear.
            
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
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING, enum: ['pcs', 'kg', 'm', 'l'] }
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