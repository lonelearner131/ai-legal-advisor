import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit } from '../src/lib/rateLimit';

// Mock GoogleGenAI for classifier test
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({ text: 'lease' })
    }
  }
}));

import { classifyDocument } from '../src/lib/classifier';

describe('Unit Tests', () => {
  it('Rate limiter works', () => {
    const ip = '127.0.0.1';
    expect(checkRateLimit(ip, 2, 60000)).toBe(true);
    expect(checkRateLimit(ip, 2, 60000)).toBe(true);
    expect(checkRateLimit(ip, 2, 60000)).toBe(false); // 3rd request should fail
  });

  it('Classifier returns expected document type', async () => {
    const docType = await classifyDocument({ text: 'This is a lease agreement' });
    expect(docType).toBe('lease');
  });
});
