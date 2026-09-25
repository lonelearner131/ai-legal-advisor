# Virtual Prompt Wars: AI Legal Assistance (Dhanush's Assistant)

## Persona & Vertical
**Vertical**: AI for Legal Assistance & Access.  
**Persona**: "Dhanush" — a non-lawyer (renter, freelancer, or new hire) who needs to quickly understand a lease, NDA, or employment contract before signing. Dhanush is not looking for binding legal advice; she just wants to spot red flags, understand her commitments, and know exactly what to ask a real lawyer.

## Approach and Logic
This app uses a multi-step dynamic AI pipeline:
1. **Document Upload & Parsing**: A user uploads a document (PDF, DOCX, TXT). It's read in-memory.
2. **Classification (`gemini-3.1-flash-lite`)**: A lightweight call categorizes the document (e.g. lease, nda, employment).
3. **Dynamic Configuration Steerage**: Based on the detected type, the app loads a specific JSON configuration (e.g., `src/config/checklists/lease.json`) containing the key clauses and risks to look out for.
4. **Analysis & Checklist (`gemini-3-flash-preview`)**: The heavier analysis model summarizes the document, extracts risks mapped against the dynamic config, and generates a tailored checklist of questions to bring to a lawyer.
5. **Contextual Chat & Diffing**: The user can chat specifically with the document's content, or upload a second document to automatically trigger a structured comparison (diff) highlighting changes in obligations or deadlines.

## Architecture & Local Setup
The application is built on **Next.js 14+ (App Router)** with **Tailwind CSS**. 
The AI integration uses the official `@google/genai` SDK in server-side API routes (`/api/analyze`, `/api/generate`, `/api/compare`), ensuring the API key never hits the client. Data is stored purely in an in-memory session cache.

### Setup Instructions
1. Clone the repository.
2. Run `npm install`
3. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.
4. Run the development server: `npm run dev`
5. Visit `http://localhost:3000`

### Testing
- Run Unit Tests: `npm run test`
- Run End-to-End Tests: `npm run test:e2e` (Requires `npx playwright install` first).

## Assumptions
- MVP supports English-language documents up to 8 MB.
- This is an in-memory session MVP: there are no user accounts, database persistence, or long-term storage in this version (privacy by design).
- The user uses a modern browser capable of Server-Sent Events (streaming).

## Limitations & Responsible Use
**This is general information, not legal advice.** The AI explains and summarizes but does not predict case outcomes or offer binding counsel. Users are persistently reminded to verify high-stakes clauses with a licensed attorney before acting. The bot is strictly prompted not to invent clauses or answer questions outside the uploaded context.

## Accessibility
The application is fully keyboard operable, uses ARIA attributes/live regions for streaming outputs, and ensures all risk color-coding is paired with readable text and icons (no color-only indicators), targeting WCAG 2.1 AA standards.
