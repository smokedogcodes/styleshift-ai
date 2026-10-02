# StyleShift AI

AI Hairstyle & Hair Color Studio — upload a selfie, pick a style and color, generate a photorealistic update. **Bring Your Own Key (BYOK)** with Google AI Studio. No logins, no database, zero server storage of keys or photos.

Built with **Vite + React + TypeScript + Tailwind CSS + Lucide**, deployed on **Cloudflare Pages** with **Pages Functions**.

## Features

- Drag-and-drop portrait upload (JPG / PNG / WEBP, max 5MB)
- Hairstyle & hair color presets + optional custom prompt
- Zero Facial Drift prompting — only hair/hairline change
- Before/after comparison slider + HD download
- API key in `sessionStorage` (optional `localStorage` remember)

## Prerequisites

- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/api-keys) from Google AI Studio
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

Hairstyle editing uses Google’s Nano Banana image models via the Gemini API:

1. `gemini-3.1-flash-lite-image` (preferred)
2. `gemini-3.1-flash-image`
3. `gemini-2.5-flash-image`

**Important:** these image models are **not available on the free tier**. A free AI Studio key will often return HTTP 429 with `free_tier … limit: 0`, which looks like a rate limit but really means “quota is zero / billing required.”

To generate styles:

1. Open [Google AI Studio plan / billing](https://aistudio.google.com/plan_info) and enable billing (Paid Tier 1).
2. Create a new API key from that billed project: [API keys](https://aistudio.google.com/api-keys).
3. Paste the key into StyleShift AI.

Face identity is reinforced via a strict system-style prompt in `functions/api/generate.ts`.

## License

MIT
