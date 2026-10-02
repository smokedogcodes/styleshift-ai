import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, RefreshCw, RotateCcw } from 'lucide-react'
import { downloadImage } from '../lib/api'

interface ComparisonViewerProps {
  beforeUrl: string
  afterUrl: string
  afterMimeType?: string
  onRegenerate: () => void
  onTryAnother: () => void
}

export function ComparisonViewer({
  beforeUrl,
  afterUrl,
  afterMimeType = 'image/png',
  onRegenerate,
  onTryAnother,
}: ComparisonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [containerWidth, setContainerWidth] = useState(0)
  const dragging = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, pct)))
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      updateFromClientX(e.clientX)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [updateFromClientX])

  return (
    <section className="panel animate-slide-up space-y-4 p-5 sm:p-6">
      <div>
        <p className="step-label">Result</p>
        <h2 className="font-display text-2xl font-semibold text-white">
          Before &amp; After
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Drag the slider to compare your original portrait with the new look.
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative aspect-[3/4] w-full max-h-[70vh] cursor-ew-resize overflow-hidden rounded-xl border border-white/10 bg-zinc-950 select-none sm:aspect-[4/5]"
        onPointerDown={(e) => {
          dragging.current = true
          updateFromClientX(e.clientX)
        }}
      >
        <img
          src={afterUrl}
          alt="Generated hairstyle result"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={beforeUrl}
            alt="Original portrait"
            className="absolute left-0 top-0 h-full max-w-none object-cover"
            style={{ width: containerWidth ? `${containerWidth}px` : '100%' }}
            draggable={false}
          />
        </div>

        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-glow-sm"
          style={{ left: `${position}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-zinc-950 text-xs font-semibold text-white shadow-glow">
            ↔
          </div>
        </div>

        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          Before
        </span>
        <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
          After
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => downloadImage(afterUrl, afterMimeType)}
          className="btn-primary"
        >
          <Download className="h-4 w-4" />
          Download HD Image
        </button>
        <button type="button" onClick={onRegenerate} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </button>
        <button type="button" onClick={onTryAnother} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
          Try Another Style
        </button>
      </div>
    </section>
  )
}
