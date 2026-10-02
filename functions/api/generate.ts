interface GenerateBody {
  imageBase64?: string
  mimeType?: string
  style?: string
  color?: string
  gender?: 'male' | 'female'
  customPrompt?: string
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType?: string
    data?: string
  }
  inline_data?: {
    mime_type?: string
    data?: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[]
    }
    finishReason?: string
  }>
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-gemini-key',
}

/**
 * Image models are paid-only on the Gemini API (free tier quota is 0).
 * Prefer the cheapest current Nano Banana Lite model, then fall back.
 */
const IMAGE_MODELS = [
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
] as const

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function buildPrompt(
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

function isBillingRequiredError(status: number, message?: string): boolean {
  const lower = (message || '').toLowerCase()
  return (
    lower.includes('free_tier') ||
    lower.includes('free tier') ||
    (lower.includes('limit: 0') && status === 429) ||
    (lower.includes('quota') && lower.includes('0') && status === 429) ||
    lower.includes('billing') ||
    lower.includes('not available') ||
    lower.includes('not supported on the free')
  )
}

function mapGeminiError(
  status: number,
  message?: string,
): { status: number; error: string } {
  const lower = (message || '').toLowerCase()

  if (isBillingRequiredError(status, message)) {
    return {
      status: 402,
      error:
        'Gemini image models require a billed Google AI project (not free-tier). In AI Studio open your project → enable Billing / upgrade to Paid Tier 1, then create a new API key from that project. Free keys return “rate limit” because image quota is 0.',
    }
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('permission') ||
    lower.includes('unauthenticated') ||
    lower.includes('api_key_invalid')
  ) {
    return { status: 401, error: 'Invalid API key. Please check your Gemini API key.' }
  }

  if (status === 429 || lower.includes('resource_exhausted')) {
    return {
      status: 429,
      error:
        'Rate limit or quota exceeded for this project. Wait a minute, or check Rate Limits in Google AI Studio.',
    }
  }

  if (status === 404 || lower.includes('not found') || lower.includes('is not found')) {
    return {
      status: 404,
      error:
        'This image model is not available for your key/region. Enable billing and use a current Nano Banana model in AI Studio.',
    }
  }

  if (status === 400) {
    return {
      status: 400,
      error: message || 'Invalid request. Check your image and try again.',
    }
  }

  return {
    status: status >= 400 ? status : 502,
    error: message || 'Generation failed. Please try again.',
  }
}

function extractImage(parts: GeminiPart[] | undefined): { data: string; mimeType: string } | null {
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

async function callGeminiModel(
  model: string,
  apiKey: string,
  prompt: string,
  mimeType: string,
  imageBase64: string,
): Promise<{ ok: boolean; status: number; data: GeminiResponse }> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  })

  let data: GeminiResponse
  try {
    data = (await res.json()) as GeminiResponse
  } catch {
    data = { error: { message: 'Unexpected response from Gemini API.' } }
  }

  return { ok: res.ok && !data.error, status: res.status, data }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: corsHeaders })

export const onRequestPost: PagesFunction = async (context) => {
  const apiKey = context.request.headers.get('x-gemini-key')?.trim()
  if (!apiKey) {
    return jsonResponse(
      { success: false, error: 'Missing API key. Provide x-gemini-key header.' },
      401,
    )
  }

  let body: GenerateBody
  try {
    body = (await context.request.json()) as GenerateBody
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body.' }, 400)
  }

  const { style, color, gender, customPrompt } = body
  let { imageBase64, mimeType } = body

  if (!imageBase64 || !style || !color) {
    return jsonResponse(
      {
        success: false,
        error: 'Missing required fields: imageBase64, style, and color.',
      },
      400,
    )
  }

  if (imageBase64.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(imageBase64)
    if (match) {
      mimeType = mimeType || match[1]
      imageBase64 = match[2]
    }
  }

  mimeType = mimeType || 'image/jpeg'
  const prompt = buildPrompt(style, color, gender, customPrompt)

  let lastFailure: { status: number; message?: string } | null = null

  try {
    for (const model of IMAGE_MODELS) {
      const result = await callGeminiModel(
        model,
        apiKey,
        prompt,
        mimeType,
        imageBase64,
      )

      if (result.ok) {
        const parts = result.data.candidates?.[0]?.content?.parts
        const image = extractImage(parts)
        if (image) {
          return jsonResponse({
            success: true,
            image: image.data,
            mimeType: image.mimeType,
            model,
          })
        }

        lastFailure = {
          status: 502,
          message:
            result.data.candidates?.[0]?.finishReason
              ? `Model blocked the image (${result.data.candidates[0].finishReason}). Try another photo.`
              : 'No image was returned. Try another photo or style.',
        }
        continue
      }

      const message = result.data.error?.message
      lastFailure = { status: result.status, message }

      // Don't keep retrying other models if billing/free-tier is the issue
      if (isBillingRequiredError(result.status, message)) {
        break
      }

      // Invalid key — stop immediately
      if (result.status === 401 || result.status === 403) {
        break
      }
    }
  } catch {
    return jsonResponse(
      { success: false, error: 'Could not reach Google AI Studio.' },
      502,
    )
  }

  const mapped = mapGeminiError(
    lastFailure?.status || 502,
    lastFailure?.message,
  )
  return jsonResponse({ success: false, error: mapped.error }, mapped.status)
}
