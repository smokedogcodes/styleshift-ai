import {
  buildHairPrompt,
  generateWithProvider,
  resolveProvider,
  type ApiProvider,
} from '../_shared/imageProviders'

interface GenerateBody {
  imageBase64?: string
  mimeType?: string
  style?: string
  color?: string
  gender?: 'male' | 'female'
  customPrompt?: string
  provider?: ApiProvider
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, x-api-key, x-gemini-key, x-api-provider',
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

function readApiKey(request: Request): string | null {
  return (
    request.headers.get('x-api-key')?.trim() ||
    request.headers.get('x-gemini-key')?.trim() ||
    null
  )
}

function readProvider(request: Request, body?: GenerateBody): ApiProvider {
  const header = request.headers.get('x-api-provider')?.trim().toLowerCase()
  if (
    header === 'gemini' ||
    header === 'openai' ||
    header === 'huggingface' ||
    header === 'auto'
  ) {
    return header
  }
  if (
    body?.provider === 'gemini' ||
    body?.provider === 'openai' ||
    body?.provider === 'huggingface' ||
    body?.provider === 'auto'
  ) {
    return body.provider
  }
  return 'auto'
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: corsHeaders })

export const onRequestPost: PagesFunction = async (context) => {
  const apiKey = readApiKey(context.request)
  if (!apiKey) {
    return jsonResponse(
      {
        success: false,
        error: 'Missing API key. Provide an x-api-key header.',
      },
      401,
    )
  }

  let body: GenerateBody
  try {
    body = (await context.request.json()) as GenerateBody
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body.' }, 400)
  }

  const preferred = readProvider(context.request, body)
  const provider = resolveProvider(apiKey, preferred)

  if (!provider) {
    return jsonResponse(
      {
        success: false,
        error:
          'Could not detect the API provider from this key. Choose Gemini, OpenAI, or Hugging Face in the key modal, or use a key starting with AIza (Gemini), sk- (OpenAI), or hf_ (Hugging Face).',
      },
      400,
    )
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
  const prompt = buildHairPrompt(style, color, gender, customPrompt)

  try {
    const result = await generateWithProvider(provider, {
      apiKey,
      prompt,
      mimeType,
      imageBase64,
    })

    if (!result.success) {
      return jsonResponse(
        { success: false, error: result.error, provider: result.provider },
        result.status,
      )
    }

    return jsonResponse({
      success: true,
      image: result.image,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
    })
  } catch {
    return jsonResponse(
      {
        success: false,
        error: 'Could not reach the image provider. Check your network and key.',
      },
      502,
    )
  }
}
