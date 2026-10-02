export type ApiProvider = 'auto' | 'gemini' | 'openai'
export type ResolvedProvider = 'gemini' | 'openai'

export function detectProviderFromKey(apiKey: string): ResolvedProvider | null {
  const key = apiKey.trim()
  if (!key) return null
  if (key.startsWith('AIza') || /^AI[a-zA-Z0-9_-]{10,}/.test(key)) {
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
  if (preferred === 'gemini' || preferred === 'openai') return preferred
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
      'Enable billing in AI Studio, or use an OpenAI key that supports image edits instead.'
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

    if (isBillingRequiredError(res.status, data.error?.message)) {
      break
    }
    if (res.status === 401 || res.status === 403) {
      break
    }
  }

  return { success: false, status: lastStatus, error: lastError, provider: 'gemini' }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
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
    // dall-e-2 supports response_format; gpt-image-1 returns b64 by default in many accounts
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
          const buf = await imgRes.arrayBuffer()
          const bytesOut = new Uint8Array(buf)
          let binary = ''
          for (let i = 0; i < bytesOut.length; i++) {
            binary += String.fromCharCode(bytesOut[i])
          }
          return {
            success: true,
            image: btoa(binary),
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

    // Model not available — try next
    const msg = (data.error?.message || '').toLowerCase()
    if (
      res.status === 404 ||
      msg.includes('model') ||
      msg.includes('not found') ||
      msg.includes('does not exist')
    ) {
      continue
    }
    if (res.status === 401 || res.status === 403) {
      break
    }
  }

  return { success: false, status: lastStatus, error: lastError, provider: 'openai' }
}

export async function generateWithProvider(
  provider: ResolvedProvider,
  args: GenerateArgs,
): Promise<ProviderResult | ProviderFailure> {
  if (provider === 'openai') {
    return generateWithOpenAI(args)
  }
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
  if (res.ok) {
    return { valid: true, provider: 'gemini' }
  }
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
