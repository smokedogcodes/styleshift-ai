export type ApiProvider = 'auto' | 'gemini' | 'openai' | 'huggingface'

export type ResolvedProvider = 'gemini' | 'openai' | 'huggingface'

export function detectProviderFromKey(apiKey: string): ResolvedProvider | null {
  const key = apiKey.trim()
  if (!key) return null

  if (key.startsWith('hf_')) {
    return 'huggingface'
  }

  if (key.startsWith('AIza') || /^AI[a-zA-Z0-9_-]{20,}/.test(key)) {
    return 'gemini'
  }

  if (
    key.startsWith('sk-') ||
    key.startsWith('sk-proj-') ||
    key.startsWith('sk-svcacct-')
  ) {
    return 'openai'
  }

  return null
}

export function resolveProvider(
  apiKey: string,
  preferred: ApiProvider = 'auto',
): ResolvedProvider | null {
  if (
    preferred === 'gemini' ||
    preferred === 'openai' ||
    preferred === 'huggingface'
  ) {
    return preferred
  }
  return detectProviderFromKey(apiKey)
}

export function buildHairPrompt(
  style: string,
  color: string,
  gender?: 'male' | 'female',
  customPrompt?: string,
): string {
  const extra = customPrompt?.trim()
    ? ` Additional specifications: ${customPrompt.trim()}.`
    : ''
  const genderHint =
    gender === 'female'
      ? 'Style the hair as a feminine hairstyle cut and silhouette'
      : gender === 'male'
        ? 'Style the hair as a masculine hairstyle cut and silhouette'
        : 'Style the hair naturally for the subject'

  return (
    `Maintain absolute photographic consistency with the reference subject's face: ` +
    `preserve the exact facial geometry, eyes, nose, lips, jawline, skin tone, texture, ` +
    `lighting, and expression without any alteration. Only replace the hair with a ` +
    `photorealistic ${style} in ${color}. ${genderHint}.` +
    `${extra} ` +
    `Ensure natural scalp blending and seamless hairline edges.`
  )
}

export interface ProviderResult {
  success: true
  image: string
  mimeType: string
  provider: ResolvedProvider
  model: string
}

export interface ProviderFailure {
  success: false
  status: number
  error: string
  provider?: ResolvedProvider
}

type GenerateArgs = {
  apiKey: string
  prompt: string
  mimeType: string
  imageBase64: string
}

const GEMINI_MODELS = [
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
] as const

const OPENAI_EDIT_MODELS = ['gpt-image-1', 'dall-e-2'] as const

/** Hugging Face image-to-image via router.huggingface.co only.
 *  Do NOT use api-inference.huggingface.co — hostname is dead (causes CF error 1016).
 */
const HF_IMAGE_ATTEMPTS = [
  {
    model: 'black-forest-labs/FLUX.1-Kontext-dev',
    url: 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-Kontext-dev',
  },
  {
    model: 'Qwen/Qwen-Image-Edit',
    url: 'https://router.huggingface.co/hf-inference/models/Qwen/Qwen-Image-Edit',
  },
  {
    model: 'black-forest-labs/FLUX.1-Kontext-pro',
    url: 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-Kontext-pro',
  },
] as const

function isBillingRequiredError(status: number, message?: string): boolean {
  const lower = (message || '').toLowerCase()
  return (
    lower.includes('free_tier') ||
    lower.includes('free tier') ||
    (lower.includes('limit: 0') && status === 429) ||
    lower.includes('billing') ||
    lower.includes('not available') ||
    lower.includes('not supported on the free')
  )
}

function mapGeminiMessage(status: number, message?: string): string {
  const lower = (message || '').toLowerCase()
  if (isBillingRequiredError(status, message)) {
    return (
      'Google Gemini image models require a billed project (free-tier image quota is 0). ' +
      'Enable billing in AI Studio, or use an OpenAI / Hugging Face key instead.'
    )
  }
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission')
  ) {
    return 'Invalid Google Gemini API key.'
  }
  if (status === 429) {
    return 'Gemini rate limit or quota exceeded. Wait and try again, or switch providers.'
  }
  return message || 'Gemini image generation failed.'
}

function mapOpenAIMessage(status: number, message?: string): string {
  const lower = (message || '').toLowerCase()
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('incorrect api key') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication')
  ) {
    return 'Invalid OpenAI API key.'
  }
  if (status === 429 || lower.includes('rate limit')) {
    return 'OpenAI rate limit exceeded. Wait and try again, or check your plan/billing.'
  }
  if (lower.includes('billing') || lower.includes('quota')) {
    return 'OpenAI billing/quota issue. Add credits or enable billing for image generation.'
  }
  return message || 'OpenAI image generation failed.'
}

function sanitizeProviderError(status: number, message?: string): string {
  const raw = (message || '').replace(/\s+/g, ' ').trim()
  const lower = raw.toLowerCase()

  if (
    lower.includes('error code: 1016') ||
    lower.includes('origin dns') ||
    lower.includes('could not be resolved') ||
    lower.includes('getaddrinfo') ||
    lower.includes('enotfound')
  ) {
    return 'Could not reach the image provider (DNS/network). Try again, or switch provider (Gemini / OpenAI / Hugging Face).'
  }

  if (lower.includes('<!doctype html') || lower.includes('<html')) {
    return `Provider returned an HTTP ${status} error page. Check your key permissions and try again.`
  }

  // Keep messages short for toasts
  if (raw.length > 280) {
    return `${raw.slice(0, 277)}...`
  }

  return raw
}

function mapHuggingFaceMessage(status: number, message?: string): string {
  const cleaned = sanitizeProviderError(status, message)
  const lower = cleaned.toLowerCase()
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('authentication')
  ) {
    return 'Invalid Hugging Face token. Create a token with Inference Providers permission.'
  }
  if (
    lower.includes('inference providers') ||
    lower.includes('make sure to have inference') ||
    lower.includes('permissions')
  ) {
    return 'This Hugging Face token needs “Inference Providers” permission (and often HF credits / Pro).'
  }
  if (status === 429 || lower.includes('rate') || lower.includes('quota')) {
    return 'Hugging Face rate limit or quota exceeded. Wait, or check your HF billing/credits.'
  }
  if (status === 503 || lower.includes('loading') || lower.includes('currently loading')) {
    return 'Hugging Face model is loading. Wait ~20s and try again.'
  }
  if (cleaned) return cleaned
  return 'Hugging Face image generation failed.'
}

interface GeminiPart {
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
}

function extractGeminiImage(parts: GeminiPart[] | undefined) {
  if (!parts) return null
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data
    if (inline?.data) {
      return {
        data: inline.data,
        mimeType:
          inline.mimeType ||
          (inline as { mime_type?: string }).mime_type ||
          'image/png',
      }
    }
  }
  return null
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function generateWithGemini(
  args: GenerateArgs,
): Promise<ProviderResult | ProviderFailure> {
  let lastError = 'Gemini image generation failed.'
  let lastStatus = 502

  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': args.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: args.prompt },
                {
                  inline_data: {
                    mime_type: args.mimeType,
                    data: args.imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      },
    )

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
      candidates?: Array<{
        content?: { parts?: GeminiPart[] }
        finishReason?: string
      }>
    }

    if (res.ok && !data.error) {
      const image = extractGeminiImage(data.candidates?.[0]?.content?.parts)
      if (image) {
        return {
          success: true,
          image: image.data,
          mimeType: image.mimeType,
          provider: 'gemini',
          model,
        }
      }
      lastStatus = 502
      lastError =
        'Gemini returned no image. The model may have blocked this photo — try another.'
      continue
    }

    lastStatus = res.status
    lastError = mapGeminiMessage(res.status, data.error?.message)

    if (isBillingRequiredError(res.status, data.error?.message)) break
    if (res.status === 401 || res.status === 403) break
  }

  return { success: false, status: lastStatus, error: lastError, provider: 'gemini' }
}

export async function generateWithOpenAI(
  args: GenerateArgs,
): Promise<ProviderResult | ProviderFailure> {
  let lastError = 'OpenAI image generation failed.'
  let lastStatus = 502

  for (const model of OPENAI_EDIT_MODELS) {
    const form = new FormData()
    const bytes = base64ToUint8Array(args.imageBase64)
    const extension = args.mimeType.includes('png')
      ? 'png'
      : args.mimeType.includes('webp')
        ? 'webp'
        : 'jpg'
    form.append(
      'image',
      new Blob([bytes.buffer as ArrayBuffer], { type: args.mimeType }),
      `portrait.${extension}`,
    )
    form.append('prompt', args.prompt)
    form.append('model', model)
    form.append('n', '1')
    if (model === 'dall-e-2') {
      form.append('response_format', 'b64_json')
      form.append('size', '1024x1024')
    }

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: form,
    })

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
      data?: Array<{ b64_json?: string; url?: string }>
    }

    if (res.ok && data.data?.[0]) {
      if (data.data[0].b64_json) {
        return {
          success: true,
          image: data.data[0].b64_json,
          mimeType: 'image/png',
          provider: 'openai',
          model,
        }
      }
      if (data.data[0].url) {
        const imgRes = await fetch(data.data[0].url)
        if (imgRes.ok) {
          return {
            success: true,
            image: arrayBufferToBase64(await imgRes.arrayBuffer()),
            mimeType: imgRes.headers.get('content-type') || 'image/png',
            provider: 'openai',
            model,
          }
        }
      }
      lastStatus = 502
      lastError = 'OpenAI returned no image data.'
      continue
    }

    lastStatus = res.status
    lastError = mapOpenAIMessage(res.status, data.error?.message)

    const msg = (data.error?.message || '').toLowerCase()
    if (
      res.status === 404 ||
      msg.includes('model') ||
      msg.includes('not found') ||
      msg.includes('does not exist')
    ) {
      continue
    }
    if (res.status === 401 || res.status === 403) break
  }

  return { success: false, status: lastStatus, error: lastError, provider: 'openai' }
}

async function parseHfImageResponse(
  res: Response,
): Promise<{ data: string; mimeType: string } | null> {
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const data = (await res.json().catch(() => null)) as
      | {
          error?: string | { message?: string }
          image?: string
          images?: string[]
        }
      | null
    if (!data) return null
    const maybe =
      data.image ||
      (Array.isArray(data.images) ? data.images[0] : undefined)
    if (typeof maybe === 'string') {
      const cleaned = maybe.includes(',')
        ? maybe.slice(maybe.indexOf(',') + 1)
        : maybe
      return { data: cleaned, mimeType: 'image/png' }
    }
    return null
  }

  if (
    contentType.startsWith('image/') ||
    contentType.includes('octet-stream') ||
    contentType === ''
  ) {
    const buf = await res.arrayBuffer()
    if (!buf.byteLength) return null
    return {
      data: arrayBufferToBase64(buf),
      mimeType: contentType.startsWith('image/') ? contentType : 'image/png',
    }
  }

  return null
}

export async function generateWithHuggingFace(
  args: GenerateArgs,
): Promise<ProviderResult | ProviderFailure> {
  let lastError = 'Hugging Face image generation failed.'
  let lastStatus = 502

  const dataUrl = `data:${args.mimeType};base64,${args.imageBase64}`

  for (const attempt of HF_IMAGE_ATTEMPTS) {
    let res: Response
    try {
      res = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'image/png, application/json',
        },
        body: JSON.stringify({
          inputs: dataUrl,
          parameters: {
            prompt: args.prompt,
            guidance_scale: 7.5,
            num_inference_steps: 28,
          },
        }),
      })
    } catch (err) {
      lastStatus = 502
      lastError = sanitizeProviderError(
        502,
        err instanceof Error ? err.message : 'Network error contacting Hugging Face',
      )
      continue
    }

    if (res.ok) {
      const image = await parseHfImageResponse(res)
      if (image) {
        return {
          success: true,
          image: image.data,
          mimeType: image.mimeType,
          provider: 'huggingface',
          model: attempt.model,
        }
      }
      lastStatus = 502
      lastError = 'Hugging Face returned an empty image response.'
      continue
    }

    const errJson = (await res
      .clone()
      .json()
      .catch(() => ({}))) as {
      error?: string | { message?: string }
      estimated_time?: number
    }
    const rawMessage =
      typeof errJson.error === 'string'
        ? errJson.error
        : errJson.error?.message || (await res.text().catch(() => ''))

    lastStatus = res.status
    lastError = mapHuggingFaceMessage(res.status, rawMessage)

    if (res.status === 503) {
      return {
        success: false,
        status: 503,
        error: lastError,
        provider: 'huggingface',
      }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        status: res.status,
        error: lastError,
        provider: 'huggingface',
      }
    }
  }

  return {
    success: false,
    status: lastStatus,
    error: lastError,
    provider: 'huggingface',
  }
}

export async function generateWithProvider(
  provider: ResolvedProvider,
  args: GenerateArgs,
): Promise<ProviderResult | ProviderFailure> {
  if (provider === 'openai') return generateWithOpenAI(args)
  if (provider === 'huggingface') return generateWithHuggingFace(args)
  return generateWithGemini(args)
}

export async function testGeminiKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
  provider: 'gemini'
}> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
    {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
    },
  )
  if (res.ok) return { valid: true, provider: 'gemini' }
  if (res.status === 401 || res.status === 403) {
    return { valid: false, error: 'Invalid Google Gemini API key.', provider: 'gemini' }
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string }
  }
  return {
    valid: false,
    error: data.error?.message || 'Could not validate Gemini API key.',
    provider: 'gemini',
  }
}

export async function testOpenAIKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
  provider: 'openai'
  imageCapable?: boolean
}> {
  const res = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'Invalid OpenAI API key.', provider: 'openai' }
    }
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
    }
    return {
      valid: false,
      error: data.error?.message || 'Could not validate OpenAI API key.',
      provider: 'openai',
    }
  }

  const data = (await res.json().catch(() => ({}))) as {
    data?: Array<{ id?: string }>
  }
  const ids = (data.data || []).map((m) => m.id || '')
  const imageCapable = ids.some(
    (id) =>
      id.includes('gpt-image') ||
      id.includes('dall-e') ||
      id.includes('image'),
  )

  return {
    valid: true,
    provider: 'openai',
    imageCapable,
    error: imageCapable
      ? undefined
      : 'Key is valid, but no image models were listed. Image edits may still work depending on your plan.',
  }
}

export async function testHuggingFaceKey(apiKey: string): Promise<{
  valid: boolean
  error?: string
  provider: 'huggingface'
  message?: string
}> {
  const res = await fetch('https://huggingface.co/api/whoami-v2', {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      name?: string
      type?: string
    }
    return {
      valid: true,
      provider: 'huggingface',
      message: data.name
        ? `Hugging Face token is valid (${data.name}). Needs Inference Providers permission for image edits.`
        : 'Hugging Face token is valid. Needs Inference Providers permission for image edits.',
    }
  }

  if (res.status === 401 || res.status === 403) {
    return {
      valid: false,
      error: 'Invalid Hugging Face token.',
      provider: 'huggingface',
    }
  }

  return {
    valid: false,
    error: 'Could not validate Hugging Face token.',
    provider: 'huggingface',
  }
}
