# San AI — Gemini-inspired UI starter

This version uses a clean, light, Gemini-inspired layout: compact left rail, centered welcome area, suggestion chips, and a floating prompt composer.

Backend setup is the same as the previous starter:
- Cloudflare Worker entry point: `src/worker.js`
- Static assets: `public`
- D1 binding: `DB`
- Worker secrets/variables: `XYRUS_API_KEY`, `XYRUS_BASE_URL`, `XYRUS_MODEL`

The API adapter assumes an OpenAI-compatible `/chat/completions` endpoint. Confirm Xyrus Router's exact base URL and model ID in its dashboard/docs before deployment. Never put the API key in frontend files.
