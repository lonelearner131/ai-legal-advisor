import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSessionData } from '@/lib/sessionCache';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ANALYSIS_MODEL = process.env.GEMINI_MODEL_ANALYSIS || 'gemini-3-flash-preview';

export const maxDuration = 60; // Max execution time

export async function POST(req: NextRequest) {
  try {
    const { sessionId, mode, query } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = getSessionData(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    const { documentContent, docType, checklistConfig } = session;

    let systemPrompt = `You are Dhanush's legal-literacy assistant. You explain and summarize; you do not give definitive legal advice or predict case outcomes. Flag clauses whose meaning depends on jurisdiction. Never invent a clause that isn't in the provided document. If asked something outside the uploaded document or general legal literacy, say so and redirect. Close high-stakes answers by recommending the user confirm with a licensed attorney before acting.\n\n`;

    let promptText = '';

    if (mode === 'summary') {
      promptText = `Provide a plain-language summary of what this document actually commits the user to.
Focus on:
1. Obligations
2. Deadlines
3. Financial terms
4. Red-flag/unusual clauses.

Use the following checklist configuration to guide your extraction for this ${docType}:
${JSON.stringify(checklistConfig, null, 2)}

Format the output in clear Markdown. For risks/clauses, tag each with a severity (High/Medium/Low) clearly in text.
At the end, provide a 'Prepare for a lawyer' checklist tailored to these risks.`;
    } else if (mode === 'chat') {
      promptText = `The user is asking a question about the uploaded document.
Question: ${query}

Ground your answer ONLY in the text actually provided. Do not hallucinate clause numbers or facts not present.`;
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    let responseStream;
    let retries = 3;
    let delay = 1000;
    
    while (retries > 0) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: ANALYSIS_MODEL,
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + promptText }, documentContent] }
          ],
          config: {
            temperature: 0.2,
          }
        });
        break; // Success
      } catch (e: any) {
        if (e.status === 503 && retries > 1) {
          retries--;
          console.log(`503 High Demand. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw e;
        }
      }
    }
    
    if (!responseStream) {
       throw new Error("Failed to generate response after retries.");
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
