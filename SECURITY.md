# Security Policies & Practices

## Secret Management
- The Gemini API Key is loaded via `process.env.GEMINI_API_KEY` on the server only. 
- It is never exposed in the client-side bundle. 
- A `.gitignore` file enforces that `.env` files are not committed to version control. An empty `.env.example` is provided instead.

## Data Privacy
- **In-Memory Processing**: The application stores parsed document text and tokens in a temporary memory session map. Files are never written to disk or to a database.
- **No Data Retention**: The MVP does not retain logs of full document contents or raw model outputs containing PII. Only minimal metadata (e.g., file size, document type, timestamps) is logged.

## Application Security
- **Upload Validation**: File uploads are strictly validated by MIME type (allowing only PDF, DOCX, and TXT) and capped at 8 MB to prevent abuse.
- **Rate Limiting**: An in-memory rate limiter restricts API calls (max 5 requests per minute per IP) to mitigate abuse and runaway costs.
- **Security Headers**: Standard security headers (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy) are configured in `next.config.mjs`.

## Dependency Auditing
- `npm audit` was successfully run before the final commit, and all critical and high vulnerabilities have been explicitly patched via `npm audit fix --force` and manual package updates.
