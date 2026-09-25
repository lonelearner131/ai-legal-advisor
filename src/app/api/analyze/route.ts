import { NextRequest, NextResponse } from 'next/server';
import { processDocumentForGemini } from '@/lib/parseDocument';
import { classifyDocument } from '@/lib/classifier';
import { checkRateLimit } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';
import { setSessionData } from '@/lib/sessionCache';
import crypto from 'crypto';

export const maxDuration = 60; // Allow up to 60s for Gemini API

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(ip, 5, 60000)) { // 5 requests per minute
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Size limit check (8MB)
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
    }

    // Basic MIME type validation
    const allowedMimeTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse / format document for Gemini
    const documentContent = await processDocumentForGemini(buffer, file.type);
    
    // Log metadata only (privacy requirement)
    console.log(`[Upload] Time: ${new Date().toISOString()} | Size: ${file.size} bytes | Type: ${file.type}`);

    // Classify document
    const docType = await classifyDocument(documentContent);
    console.log(`[Classify] Detected type: ${docType}`);

    // Load config
    let checklistConfig = null;
    try {
      const configPath = path.join(process.cwd(), 'src', 'config', 'checklists', `${docType}.json`);
      if (fs.existsSync(configPath)) {
        checklistConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load config for', docType);
    }

    // Send formatted response
    const sessionId = 'sess_' + crypto.randomBytes(16).toString('hex');
    setSessionData(sessionId, {
      documentContent,
      docType,
      checklistConfig
    });

    return NextResponse.json({
      type: docType,
      config: checklistConfig,
      sessionId
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
