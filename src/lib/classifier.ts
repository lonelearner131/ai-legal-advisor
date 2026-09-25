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
  } catch (error) {
    console.error('Classification error:', error);
    return 'other'; // fallback
  }
}
