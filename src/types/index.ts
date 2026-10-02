export interface HairstylePreset {
  id: string
  name: string
  tag: string
  description: string
}

export interface HairColorPreset {
  id: string
  name: string
  hex: string
}

export interface GeneratePayload {
  imageBase64: string
  mimeType: string
  style: string
  color: string
  customPrompt?: string
}

export interface GenerateSuccessResponse {
  success: true
  image: string
  mimeType: string
}

export interface GenerateErrorResponse {
  success: false
  error: string
}

export type GenerateResponse = GenerateSuccessResponse | GenerateErrorResponse

export interface TestKeyResponse {
  valid: boolean
  error?: string
}

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}
