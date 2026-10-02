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

function mapGeminiError(status: number, message?: string): { status: number; error: string } {
  const lower = (message || '').toLowerCase()
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api key') ||
    lower.includes('permission') ||
    lower.includes('unauthenticated')
  ) {
    return { status: 401, error: 'Invalid API key. Please check your Gemini API key.' }
  }
  if (status === 429 || lower.includes('quota') || lower.includes('rate')) {
    return { status: 429, error: 'Rate limit exceeded. Please wait and try again.' }
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

  const geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent'

  let geminiRes: Response
  try {
    geminiRes = await fetch(geminiUrl, {
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
  } catch {
    return jsonResponse(
      { success: false, error: 'Could not reach Google AI Studio.' },
      502,
    )
  }

  let geminiData: GeminiResponse
  try {
    geminiData = (await geminiRes.json()) as GeminiResponse
  } catch {
    return jsonResponse(
      { success: false, error: 'Unexpected response from Gemini API.' },
      502,
    )
  }

  if (!geminiRes.ok || geminiData.error) {
    const mapped = mapGeminiError(
      geminiRes.status,
      geminiData.error?.message,
    )
    return jsonResponse({ success: false, error: mapped.error }, mapped.status)
  }

  const parts = geminiData.candidates?.[0]?.content?.parts
  const image = extractImage(parts)

  if (!image) {
    return jsonResponse(
      {
        success: false,
        error:
          'No image was returned. The model may have blocked the request — try another photo or style.',
      },
      502,
    )
  }

  return jsonResponse({
    success: true,
    image: image.data,
    mimeType: image.mimeType,
  })
}
