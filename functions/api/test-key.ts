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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: corsHeaders })

export const onRequestPost: PagesFunction = async (context) => {
  const apiKey = context.request.headers.get('x-gemini-key')?.trim()
  if (!apiKey) {
    return jsonResponse({ valid: false, error: 'Missing API key.' }, 401)
  }

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      },
    )

    if (res.ok) {
      return jsonResponse({ valid: true })
    }

    if (res.status === 401 || res.status === 403) {
      return jsonResponse(
        { valid: false, error: 'Invalid API key.' },
        401,
      )
    }

    if (res.status === 429) {
      return jsonResponse(
        {
          valid: false,
          error: 'Rate limit exceeded while testing the key. Try again shortly.',
        },
        429,
      )
    }

    let message = 'Could not validate API key.'
    try {
      const data = (await res.json()) as { error?: { message?: string } }
      if (data.error?.message) message = data.error.message
    } catch {
      // ignore
    }

    return jsonResponse({ valid: false, error: message }, res.status)
  } catch {
    return jsonResponse(
      { valid: false, error: 'Could not reach Google AI Studio.' },
      502,
    )
  }
}
