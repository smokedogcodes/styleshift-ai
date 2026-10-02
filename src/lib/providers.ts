export type ApiProvider = 'auto' | 'gemini' | 'openai'

export type ResolvedProvider = 'gemini' | 'openai'

/** Infer provider from common API key prefixes. */
export function detectProviderFromKey(apiKey: string): ResolvedProvider | null {
  const key = apiKey.trim()
  if (!key) return null

  if (key.startsWith('AIza') || key.startsWith('AI')) {
    return 'gemini'
  }

  // OpenAI project keys, user keys, and service accounts
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
  if (preferred === 'gemini' || preferred === 'openai') {
    return preferred
  }
  return detectProviderFromKey(apiKey)
}

export const PROVIDER_LABELS: Record<ResolvedProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
}
