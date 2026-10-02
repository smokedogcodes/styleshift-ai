# StyleShift AI

AI Hairstyle & Hair Color Studio — upload a selfie, pick a style and color, generate a photorealistic update. **Bring Your Own Key (BYOK)** with Google AI Studio. No logins, no database, zero server storage of keys or photos.

Built with **Vite + React + TypeScript + Tailwind CSS + Lucide**, deployed on **Cloudflare Pages** with **Pages Functions**.

## Features

- Drag-and-drop portrait upload (JPG / PNG / WEBP, max 5MB)
- Hairstyle & hair color presets + optional custom prompt
- Zero Facial Drift prompting — only hair/hairline change
- Before/after comparison slider + HD download
- BYOK image API keys: **Auto-detect Google Gemini or OpenAI** (keys stored in `sessionStorage` / optional `localStorage`)

## Prerequisites

- Node.js 18+
- A BYOK image API key ([Google AI Studio](https://aistudio.google.com/api-keys) and/or [OpenAI](https://platform.openai.com/api-keys))
- (Deploy) GitHub account + Cloudflare account

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### With Pages Functions (required for Generate / Test Key)

The `/api/*` routes live in Cloudflare Pages Functions. For full local API support:

```bash
# Build static assets, then serve with Wrangler (Functions included)
npm run pages:dev
```

Or use Wrangler’s proxy around the Vite dev server (Wrangler 3.45+):

```bash
npx wrangler pages dev -- npm run dev
```

> Tip: `npm run dev` alone will load the UI, but Generate/Test Key need the Functions layer (`pages:dev` or `wrangler pages dev`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite UI only |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Preview static `dist/` (no Functions) |
| `npm run pages:dev` | Build + Wrangler Pages Functions locally |

## Project structure

```
functions/api/generate.ts   # POST /api/generate → Gemini image edit proxy
functions/api/test-key.ts   # POST /api/test-key → lightweight key validation
src/components/             # Navbar, uploader, selectors, comparison, toast
src/lib/                    # API client, storage, presets
wrangler.toml               # Pages output dir + compatibility date
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: StyleShift AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/styleshift-ai.git
git push -u origin main
```

Then update `GITHUB_REPO_URL` in `src/lib/constants.ts` to your repo URL.

## Deploy to Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your GitHub repository.
3. Configure build settings:
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Pages automatically picks up the `/functions` directory for `/api/generate` and `/api/test-key`.
5. After deploy, open the site, click **API Key Required**, paste your Gemini key, optionally **Test Key**, then generate.

No Cloudflare secrets are required — users supply their own Gemini keys via the `x-gemini-key` header.

## Privacy

- API keys: browser `sessionStorage` / optional `localStorage` only
- Photos: Base64 in memory / request body only; not written to disk or a database
- The Pages Function relays the request to Google and returns the result; nothing is persisted

## Model note

StyleShift routes your BYOK key to a provider that can return images:

| Provider | Key shape | Models tried |
|----------|-----------|--------------|
| Google Gemini | `AIza…` | `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-2.5-flash-image` |
| OpenAI | `sk-…` | `gpt-image-1` image edits, then `dall-e-2` edits |

Choose **Auto**, **Gemini**, or **OpenAI** in the key modal. Generation only proceeds through a provider that supports image output.

**Gemini note:** image models are paid-only on the API (free-tier quota is 0). Enable billing in AI Studio or use an OpenAI key with image access instead.

Face identity is reinforced via a strict system-style prompt in `functions/_shared/imageProviders.ts`.

## License

MIT
