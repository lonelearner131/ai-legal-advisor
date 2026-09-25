import * as mammoth from 'mammoth';

export async function processDocumentForGemini(fileBuffer: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') {
    return {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return { text: result.value };
    } catch (e) {
      console.error('DOCX parse error:', e);
      throw new Error('Failed to parse Word document.');
    }
  }

  if (mimeType === 'text/plain') {
    return { text: fileBuffer.toString('utf-8') };
  }

  throw new Error('Unsupported document format. Please upload PDF, DOCX, or TXT files.');
}
