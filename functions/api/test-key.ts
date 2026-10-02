import {
  detectProviderFromKey,
  resolveProvider,
  testGeminiKey,
  testOpenAIKey,
  type ApiProvider,
} from '../_shared/imageProviders'

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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: corsHeaders })

export const onRequestPost: PagesFunction = async (context) => {
  const apiKey = readApiKey(context.request)
  if (!apiKey) {
    return jsonResponse({ valid: false, error: 'Missing API key.' }, 401)
  }

  let preferred: ApiProvider = 'auto'
  const header = context.request.headers.get('x-api-provider')?.trim().toLowerCase()
  if (header === 'gemini' || header === 'openai' || header === 'auto') {
    preferred = header
  } else {
    try {
      const body = (await context.request.json()) as { provider?: ApiProvider }
      if (
        body.provider === 'gemini' ||
        body.provider === 'openai' ||
        body.provider === 'auto'
      ) {
        preferred = body.provider
      }
    } catch {
      // no body is fine
    }
  }

  const provider = resolveProvider(apiKey, preferred)

  try {
    if (!provider) {
      // Ambiguous key — probe both
      const [gemini, openai] = await Promise.all([
        testGeminiKey(apiKey),
        testOpenAIKey(apiKey),
      ])
      if (gemini.valid) {
        return jsonResponse({
          valid: true,
          provider: 'gemini',
          message:
            'Key works with Google Gemini. Image generation still needs a billed Gemini project.',
        })
      }
      if (openai.valid) {
        return jsonResponse({
          valid: true,
          provider: 'openai',
          imageCapable: openai.imageCapable,
          message: openai.imageCapable
            ? 'Key works with OpenAI and image models are available.'
            : openai.error || 'Key works with OpenAI.',
        })
      }
      return jsonResponse(
        {
          valid: false,
          error:
            'Could not validate this key with Gemini or OpenAI. Choose a provider manually, or use an AIza… / sk-… key.',
        },
        401,
      )
    }

    if (provider === 'openai') {
      const result = await testOpenAIKey(apiKey)
      return jsonResponse(
        {
          valid: result.valid,
          provider: 'openai',
          imageCapable: result.imageCapable,
          error: result.valid ? undefined : result.error,
          message: result.valid
            ? result.imageCapable
              ? 'OpenAI key is valid and lists image models.'
              : result.error || 'OpenAI key is valid.'
            : undefined,
        },
        result.valid ? 200 : 401,
      )
    }

    const result = await testGeminiKey(apiKey)
    return jsonResponse(
      {
        valid: result.valid,
        provider: 'gemini',
        error: result.valid ? undefined : result.error,
        message: result.valid
          ? 'Gemini key is valid. Image models require a billed Google AI project.'
          : undefined,
      },
      result.valid ? 200 : 401,
    )
  } catch {
    return jsonResponse(
      {
        valid: false,
        error: 'Could not reach the provider to validate this key.',
        detected: detectProviderFromKey(apiKey),
      },
      502,
    )
  }
}
