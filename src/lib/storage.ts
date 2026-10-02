import type { ApiProvider } from './providers'

const SESSION_KEY = 'styleshift_api_key'
const LOCAL_KEY = 'styleshift_api_key'
const REMEMBER_FLAG = 'styleshift_remember_key'
const PROVIDER_KEY = 'styleshift_api_provider'

const LEGACY_SESSION = 'styleshift_gemini_key'
const LEGACY_LOCAL = 'styleshift_gemini_key'

export function getStoredApiKey(): string | null {
  try {
    const remembered = localStorage.getItem(REMEMBER_FLAG) === 'true'
    if (remembered) {
      return localStorage.getItem(LOCAL_KEY) || localStorage.getItem(LEGACY_LOCAL)
    }
    return (
      sessionStorage.getItem(SESSION_KEY) ||
      sessionStorage.getItem(LEGACY_SESSION)
    )
  } catch {
    return null
  }
}

export function getStoredProvider(): ApiProvider {
  try {
    const value = localStorage.getItem(PROVIDER_KEY)
    if (
      value === 'gemini' ||
      value === 'openai' ||
      value === 'huggingface' ||
      value === 'auto'
    ) {
      return value
    }
  } catch {
    // ignore
  }
  return 'auto'
}

export function isRememberKeyEnabled(): boolean {
  try {
    return localStorage.getItem(REMEMBER_FLAG) === 'true'
  } catch {
    return false
  }
}

export function saveApiKey(
  key: string,
  remember: boolean,
  provider: ApiProvider = 'auto',
): void {
  const trimmed = key.trim()
  try {
    localStorage.setItem(PROVIDER_KEY, provider)
    if (remember) {
      localStorage.setItem(LOCAL_KEY, trimmed)
      localStorage.setItem(REMEMBER_FLAG, 'true')
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(LEGACY_SESSION)
      localStorage.removeItem(LEGACY_LOCAL)
    } else {
      sessionStorage.setItem(SESSION_KEY, trimmed)
      localStorage.removeItem(LOCAL_KEY)
      localStorage.removeItem(LEGACY_LOCAL)
      localStorage.setItem(REMEMBER_FLAG, 'false')
    }
  } catch {
    // Storage may be unavailable in private browsing
  }
}

export function clearApiKey(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(LEGACY_SESSION)
    localStorage.removeItem(LOCAL_KEY)
    localStorage.removeItem(LEGACY_LOCAL)
    localStorage.removeItem(PROVIDER_KEY)
    localStorage.setItem(REMEMBER_FLAG, 'false')
  } catch {
    // ignore
  }
}
