import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSessionData } from '@/lib/sessionCache';
import { processDocumentForGemini } from '@/lib/parseDocument';
import { checkRateLimit } from '@/lib/rateLimit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ANALYSIS_MODEL = process.env.GEMINI_MODEL_ANALYSIS || 'gemini-3-flash-preview';

export const maxDuration = 60; // Max execution time

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const file = formData.get('file') as File;
    
    if (!sessionId || !file) {
      return NextResponse.json({ error: 'Session ID and comparison file are required' }, { status: 400 });
    }

    const session = getSessionData(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    const { documentContent: originalContent, docType } = session;

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const newContent = await processDocumentForGemini(buffer, file.type);
    
    let systemPrompt = `You are a legal-literacy assistant comparing two ${docType} documents. You explain differences in plain language. Do not give definitive legal advice. Flag clauses whose meaning depends on jurisdiction. Never invent a clause that isn't in the provided documents.\n\n`;
    
    let promptText = `Please compare Document 1 (Original) and Document 2 (New).
Provide a structured Markdown diff of the key changes (using bullet points or diff code blocks) followed by an explanation of what changed and why it matters to the user (e.g. "The new version increases your notice period from 30 to 60 days, giving you less flexibility to leave").

IMPORTANT: Focus on obligations, liabilities, money, and deadlines.`;

    let responseStream;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: ANALYSIS_MODEL,
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + promptText }, { text: '--- DOCUMENT 1 (Original) ---' }, originalContent, { text: '--- DOCUMENT 2 (New) ---' }, newContent] }
          ],
          config: {
            temperature: 0.1,
          }
        });
        break;
      } catch (e: any) {
        if (e.status === 503 && retries > 1) {
          retries--;
          console.log(`503 High Demand in compare. Retrying in ${delay}ms...`);
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
    console.error('Compare Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
