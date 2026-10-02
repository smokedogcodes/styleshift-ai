import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Navbar } from './components/Navbar'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ImageUploader } from './components/ImageUploader'
import { StyleSelector } from './components/StyleSelector'
import { ComparisonViewer } from './components/ComparisonViewer'
import { NotificationToast } from './components/NotificationToast'
import { generateHairstyle } from './lib/api'
import {
  HAIR_COLOR_PRESETS,
  LOADING_MESSAGES,
  MALE_HAIRSTYLES,
  getHairstylesForGender,
} from './lib/constants'
import {
  clearApiKey,
  getStoredApiKey,
  getStoredProvider,
  isRememberKeyEnabled,
  saveApiKey,
} from './lib/storage'
import type { ApiProvider } from './lib/providers'
import type { Gender, ToastMessage, ToastType } from './types'

function App() {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey() || '')
  const [apiProvider, setApiProvider] = useState<ApiProvider>(() =>
    getStoredProvider(),
  )
  const [rememberKey, setRememberKey] = useState(() => isRememberKeyEnabled())
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)

  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [gender, setGender] = useState<Gender>('male')
  const [styleId, setStyleId] = useState(MALE_HAIRSTYLES[0].id)
  const [colorId, setColorId] = useState(HAIR_COLOR_PRESETS[0].id)
  const [customPrompt, setCustomPrompt] = useState('')
  const [customOpen, setCustomOpen] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultMime, setResultMime] = useState('image/png')

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastTimers = useRef<Map<string, number>>(new Map())

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      toastTimers.current.delete(id)
    }
  }, [])

  const pushToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((prev) => [...prev, { id, type, message }])
      const timer = window.setTimeout(() => dismissToast(id), 5000)
      toastTimers.current.set(id, timer)
    },
    [dismissToast],
  )

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  useEffect(() => {
    if (!generating) {
      setLoadingMsgIndex(0)
      return
    }
    const interval = window.setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => window.clearInterval(interval)
  }, [generating])

  const canGenerate = Boolean(previewUrl && imageBase64 && apiKey.trim()) && !generating

  const runGenerate = async () => {
    if (!imageBase64 || !apiKey.trim()) {
      if (!apiKey.trim()) {
        setApiKeyModalOpen(true)
        pushToast('info', 'Add an image-capable API key to generate.')
      }
      return
    }

    const styles = getHairstylesForGender(gender)
    const style = styles.find((s) => s.id === styleId)?.name || styleId
    const color =
      HAIR_COLOR_PRESETS.find((c) => c.id === colorId)?.name || colorId

    setGenerating(true)
    setResultUrl(null)

    try {
      const response = await generateHairstyle(
        {
          imageBase64,
          mimeType: imageMime,
          style,
          color,
          gender,
          customPrompt: customPrompt.trim() || undefined,
        },
        apiKey.trim(),
        apiProvider,
      )

      if (!response.success) {
        pushToast('error', response.error)
        if (response.error.toLowerCase().includes('api key')) {
          setApiKeyModalOpen(true)
        }
        return
      }

      const dataUrl = `data:${response.mimeType};base64,${response.image}`
      setResultUrl(dataUrl)
      setResultMime(response.mimeType)
      pushToast('success', 'Hairstyle generated successfully.')
    } catch {
      pushToast(
        'error',
        'Network error. Check your connection or try wrangler pages dev for local API.',
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar
        hasApiKey={Boolean(apiKey.trim())}
        onOpenApiKey={() => setApiKeyModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 max-w-2xl animate-fade-in">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Try a new look in seconds
          </h2>
          <p className="mt-2 text-base text-zinc-400 sm:text-lg">
            Upload a portrait, pick a hairstyle and color, and generate a
            photorealistic update — face locked, hair only.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ImageUploader
              previewUrl={previewUrl}
              onImageReady={({ base64, mimeType, dataUrl }) => {
                setImageBase64(base64)
                setImageMime(mimeType)
                setPreviewUrl(dataUrl)
                setResultUrl(null)
              }}
              onRemove={() => {
                setImageBase64(null)
                setPreviewUrl(null)
                setResultUrl(null)
              }}
              onError={(msg) => pushToast('error', msg)}
            />

            <StyleSelector
              gender={gender}
              selectedStyleId={styleId}
              selectedColorId={colorId}
              customPrompt={customPrompt}
              customOpen={customOpen}
              onGenderChange={(next) => {
                setGender(next)
                const nextStyles = getHairstylesForGender(next)
                setStyleId(nextStyles[0].id)
                setResultUrl(null)
              }}
              onStyleChange={setStyleId}
              onColorChange={setColorId}
              onCustomPromptChange={setCustomPrompt}
              onCustomOpenChange={setCustomOpen}
            />
          </div>

          <div className="space-y-6">
            <section className="panel p-5 sm:p-6">
              <p className="step-label">Step 3</p>
              <h2 className="mb-2 font-display text-2xl font-semibold text-white">
                Generate &amp; Compare
              </h2>
              <p className="mb-5 text-sm text-zinc-500">
                Facial geometry stays locked. Only hair and hairline are
                rewritten.
              </p>

              <button
                type="button"
                onClick={() => void runGenerate()}
                disabled={!canGenerate}
                className="btn-primary w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Hairstyle
                  </>
                )}
              </button>

              {!apiKey.trim() && (
                <p className="mt-3 text-sm text-amber-300/90">
                  An API key is required.{' '}
                  <button
                    type="button"
                    className="underline hover:text-amber-200"
                    onClick={() => setApiKeyModalOpen(true)}
                  >
                    Add your API key
                  </button>
                </p>
              )}
              {apiKey.trim() && !previewUrl && (
                <p className="mt-3 text-sm text-zinc-500">
                  Upload a portrait to enable generation.
                </p>
              )}
            </section>

            {generating && (
              <div className="panel animate-fade-in space-y-4 p-5 sm:p-6">
                <div className="aspect-[3/4] w-full animate-pulse-soft rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 sm:aspect-[4/5]" />
                <div className="flex items-center justify-center gap-2 text-sm text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </div>
              </div>
            )}

            {!generating && resultUrl && previewUrl && (
              <ComparisonViewer
                beforeUrl={previewUrl}
                afterUrl={resultUrl}
                afterMimeType={resultMime}
                onRegenerate={() => void runGenerate()}
                onTryAnother={() => {
                  setResultUrl(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </div>
        </div>

        <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
          StyleShift AI · Bring Your Own Key · Zero server storage of keys or
          photos
        </footer>
      </main>

      <ApiKeyModal
        open={apiKeyModalOpen}
        initialKey={apiKey}
        initialProvider={apiProvider}
        rememberInitially={rememberKey}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={(key, remember, provider) => {
          saveApiKey(key, remember, provider)
          setApiKey(key)
          setApiProvider(provider)
          setRememberKey(remember)
          pushToast('success', 'API key saved in this browser.')
        }}
        onClear={() => {
          clearApiKey()
          setApiKey('')
          setApiProvider('auto')
          setRememberKey(false)
          pushToast('info', 'API key cleared.')
        }}
      />

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
