export type ApiProvider = 'auto' | 'gemini' | 'openai' | 'huggingface'

export type ResolvedProvider = 'gemini' | 'openai' | 'huggingface'

/** Infer provider from common API key prefixes. */
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

export const PROVIDER_LABELS: Record<ResolvedProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  huggingface: 'Hugging Face',
}
