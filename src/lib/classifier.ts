import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const CLASSIFY_MODEL = process.env.GEMINI_MODEL_CLASSIFY || 'gemini-3.1-flash-lite';

export type DocumentType = 'lease' | 'employment' | 'nda' | 'terms' | 'loan' | 'freelance' | 'other';

export async function classifyDocument(documentContent: any): Promise<DocumentType> {
  const prompt = `Analyze the provided document and classify it into exactly one of the following categories:
- lease
- employment
- nda
- terms
- loan
- freelance
- other

Respond ONLY with the category name in lowercase.`;

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: CLASSIFY_MODEL,
        contents: [
          { role: 'user', parts: [{ text: prompt }, documentContent] }
        ],
        config: {
          temperature: 0.1,
        }
      });
      
      const text = response.text?.trim().toLowerCase() || 'other';
      const validTypes: DocumentType[] = ['lease', 'employment', 'nda', 'terms', 'loan', 'freelance', 'other'];
      
      return validTypes.includes(text as DocumentType) ? (text as DocumentType) : 'other';
    } catch (error: any) {
      if (error.status === 503 && retries > 1) {
        retries--;
        console.log(`503 High Demand in classifier. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        console.error('Classification error:', error);
        return 'other'; // fallback
      }
    }
  }
  return 'other';
}
