import { useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  X,
} from 'lucide-react'
import { testApiKey } from '../lib/api'
import { cn } from '../lib/cn'
import {
  detectProviderFromKey,
  type ApiProvider,
} from '../lib/providers'

interface ApiKeyModalProps {
  open: boolean
  initialKey: string
  initialProvider: ApiProvider
  rememberInitially: boolean
  onClose: () => void
  onSave: (key: string, remember: boolean, provider: ApiProvider) => void
  onClear: () => void
}

export function ApiKeyModal({
  open,
  initialKey,
  initialProvider,
  rememberInitially,
  onClose,
  onSave,
  onClear,
}: ApiKeyModalProps) {
  const [key, setKey] = useState(initialKey)
  const [provider, setProvider] = useState<ApiProvider>(initialProvider)
  const [remember, setRemember] = useState(rememberInitially)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      setKey(initialKey)
      setProvider(initialProvider)
      setRemember(rememberInitially)
      setShowKey(false)
      setTestResult(null)
    }
  }, [open, initialKey, initialProvider, rememberInitially])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const detected = detectProviderFromKey(key)
  const effectiveProvider = provider === 'auto' ? detected : provider

  const handleTest = async () => {
    const trimmed = key.trim()
    if (!trimmed) {
      setTestResult({ ok: false, message: 'Enter an API key first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testApiKey(trimmed, provider)
      setTestResult({
        ok: result.valid,
        message: result.valid
          ? result.message ||
            `Key is valid${result.provider ? ` (${result.provider})` : ''}.`
          : result.error || 'Invalid API key.',
      })
    } catch {
      setTestResult({
        ok: false,
        message: 'Could not reach the validation endpoint.',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="animate-slide-up w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-glow sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="api-key-title" className="text-lg font-semibold text-white">
                Image API Key
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Bring any key that can edit/generate images. We auto-detect
                Google Gemini or OpenAI from the key format, then generate only
                if that provider supports image output. Keys stay in this
                browser only.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          Provider
        </label>
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-zinc-950/60 p-1">
          {(
            [
              { id: 'auto' as const, label: 'Auto' },
              { id: 'gemini' as const, label: 'Gemini' },
              { id: 'openai' as const, label: 'OpenAI' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setProvider(option.id)
                setTestResult(null)
              }}
              className={cn(
                'rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm',
                provider === option.id
                  ? 'bg-accent text-zinc-950'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {provider === 'auto' && (
          <p className="mb-3 text-xs text-zinc-500">
            {detected
              ? `Detected: ${detected === 'gemini' ? 'Google Gemini' : 'OpenAI'}`
              : 'Paste a key starting with AIza… (Gemini) or sk-… (OpenAI).'}
          </p>
        )}

        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          API Key
        </label>
        <div className="relative mb-3">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setTestResult(null)
            }}
            placeholder={
              effectiveProvider === 'openai' ? 'sk-...' : 'AIza... or sk-...'
            }
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-600 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-accent focus:ring-accent/40"
          />
          Remember key on this device
        </label>

        <div className="mb-4 flex flex-col gap-2 text-sm">
          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            Get a Google Gemini API key
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            Get an OpenAI API key
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-xs leading-relaxed text-zinc-500">
            Gemini image models need a billed Google project. OpenAI needs a
            plan that includes image edits (`gpt-image-1` / DALL·E).
          </p>
        </div>

        {testResult && (
          <div
            className={cn(
              'mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm',
              testResult.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300',
            )}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {testResult.message}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onClear()
              setKey('')
              setProvider('auto')
              setTestResult(null)
            }}
            className="btn-secondary text-zinc-400"
          >
            Clear Key
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="btn-secondary flex-1 sm:flex-none"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing…
                </>
              ) : (
                'Test Key'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!key.trim()) return
                onSave(key.trim(), remember, provider)
                onClose()
              }}
              disabled={!key.trim()}
              className="btn-primary flex-1 sm:flex-none"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
