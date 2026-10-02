import type {
  GeneratePayload,
  GenerateResponse,
  TestKeyResponse,
} from '../types'

export async function generateHairstyle(
  payload: GeneratePayload,
  apiKey: string,
): Promise<GenerateResponse> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  let data: GenerateResponse
  try {
    data = (await response.json()) as GenerateResponse
  } catch {
    return {
      success: false,
      error: 'Unexpected response from the generation service.',
    }
  }

  if (!response.ok && data.success !== false) {
    return {
      success: false,
      error: `Request failed (${response.status}). Please try again.`,
    }
  }

  return data
}

export async function testApiKey(apiKey: string): Promise<TestKeyResponse> {
  const response = await fetch('/api/test-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gemini-key': apiKey,
    },
  })

  try {
    return (await response.json()) as TestKeyResponse
  } catch {
    return { valid: false, error: 'Could not validate API key.' }
  }
}

export function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const commaIndex = dataUrl.indexOf(',')
      const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
        dataUrl,
      })
    }
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

export function downloadImage(dataUrlOrBase64: string, mimeType = 'image/png') {
  const href = dataUrlOrBase64.startsWith('data:')
    ? dataUrlOrBase64
    : `data:${mimeType};base64,${dataUrlOrBase64}`

  const link = document.createElement('a')
  link.href = href
  link.download = `styleshift-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
