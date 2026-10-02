import { useCallback, useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Lightbulb, Trash2, Upload } from 'lucide-react'
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '../lib/constants'
import { fileToBase64 } from '../lib/api'
import { cn } from '../lib/cn'

interface ImageUploaderProps {
  previewUrl: string | null
  onImageReady: (data: {
    base64: string
    mimeType: string
    dataUrl: string
  }) => void
  onRemove: () => void
  onError: (message: string) => void
}

export function ImageUploader({
  previewUrl,
  onImageReady,
  onRemove,
  onError,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      if (
        !ACCEPTED_IMAGE_TYPES.includes(
          file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
        )
      ) {
        onError('Please upload a JPG, PNG, or WEBP image.')
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        onError('Image must be 5MB or smaller.')
        return
      }
      try {
        const result = await fileToBase64(file)
        onImageReady(result)
      } catch {
        onError('Failed to read the selected image.')
      }
    },
    [onError, onImageReady],
  )

  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }

  return (
    <section className="panel p-5 sm:p-6">
      <p className="step-label">Step 1</p>
      <h2 className="mb-4 font-display text-2xl font-semibold text-white">
        Upload Your Portrait
      </h2>

      {previewUrl ? (
        <div className="animate-fade-in space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
            <img
              src={previewUrl}
              alt="Uploaded portrait preview"
              className="mx-auto max-h-80 w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-secondary"
            >
              <Upload className="h-4 w-4" />
              Change photo
            </button>
            <button type="button" onClick={onRemove} className="btn-secondary text-red-300">
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
            dragging
              ? 'border-accent bg-accent/10 shadow-glow-sm'
              : 'border-white/15 bg-zinc-950/40 hover:border-accent/40 hover:bg-accent/5',
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ImagePlus className="h-7 w-7" />
          </div>
          <div>
            <p className="text-base font-medium text-white">
              Drag &amp; drop your selfie here
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              or click to browse · JPG, PNG, WEBP · max 5MB
            </p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void processFile(file)
          e.target.value = ''
        }}
      />

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm text-zinc-300">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Use front-facing lighting, a clean background, and a neutral
          expression for best results.
        </p>
      </div>
    </section>
  )
}
