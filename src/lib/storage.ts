const SESSION_KEY = 'styleshift_gemini_key'
const LOCAL_KEY = 'styleshift_gemini_key'
const REMEMBER_FLAG = 'styleshift_remember_key'

export function getStoredApiKey(): string | null {
  try {
    const remembered = localStorage.getItem(REMEMBER_FLAG) === 'true'
    if (remembered) {
      return localStorage.getItem(LOCAL_KEY)
    }
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function isRememberKeyEnabled(): boolean {
  try {
    return localStorage.getItem(REMEMBER_FLAG) === 'true'
  } catch {
    return false
  }
}

export function saveApiKey(key: string, remember: boolean): void {
  const trimmed = key.trim()
  try {
    if (remember) {
      localStorage.setItem(LOCAL_KEY, trimmed)
      localStorage.setItem(REMEMBER_FLAG, 'true')
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, trimmed)
      localStorage.removeItem(LOCAL_KEY)
      localStorage.setItem(REMEMBER_FLAG, 'false')
    }
  } catch {
    // Storage may be unavailable in private browsing
  }
}

export function clearApiKey(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LOCAL_KEY)
    localStorage.setItem(REMEMBER_FLAG, 'false')
  } catch {
    // ignore
  }
}
