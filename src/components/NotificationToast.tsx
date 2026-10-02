import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import type { ToastMessage } from '../types'
import { cn } from '../lib/cn'

interface NotificationToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto animate-slide-up flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md',
              toast.type === 'success' &&
                'border-emerald-500/30 bg-emerald-950/90 text-emerald-100',
              toast.type === 'error' &&
                'border-red-500/30 bg-red-950/90 text-red-100',
              toast.type === 'info' &&
                'border-accent/30 bg-zinc-900/95 text-zinc-100',
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
