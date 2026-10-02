import { ChevronDown } from 'lucide-react'
import {
  HAIR_COLOR_PRESETS,
  getHairstylesForGender,
} from '../lib/constants'
import { cn } from '../lib/cn'
import type { Gender } from '../types'

interface StyleSelectorProps {
  gender: Gender
  selectedStyleId: string
  selectedColorId: string
  customPrompt: string
  customOpen: boolean
  onGenderChange: (gender: Gender) => void
  onStyleChange: (id: string) => void
  onColorChange: (id: string) => void
  onCustomPromptChange: (value: string) => void
  onCustomOpenChange: (open: boolean) => void
}

export function StyleSelector({
  gender,
  selectedStyleId,
  selectedColorId,
  customPrompt,
  customOpen,
  onGenderChange,
  onStyleChange,
  onColorChange,
  onCustomPromptChange,
  onCustomOpenChange,
}: StyleSelectorProps) {
  const styles = getHairstylesForGender(gender)

  return (
    <section className="panel space-y-6 p-5 sm:p-6">
      <div>
        <p className="step-label">Step 2</p>
        <h2 className="font-display text-2xl font-semibold text-white">
          Choose Hairstyle &amp; Color
        </h2>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Look for</h3>
        <div
          className="inline-flex w-full rounded-xl border border-white/10 bg-zinc-950/60 p-1 sm:w-auto"
          role="group"
          aria-label="Select gender for hairstyle presets"
        >
          {(
            [
              { id: 'male' as const, label: 'Male styles' },
              { id: 'female' as const, label: 'Female styles' },
            ] as const
          ).map((option) => {
            const selected = gender === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onGenderChange(option.id)}
                className={cn(
                  'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-none sm:min-w-[9rem]',
                  selected
                    ? 'bg-accent text-zinc-950 shadow-glow-sm'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Hairstyle</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {styles.map((style) => {
            const selected = selectedStyleId === style.id
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onStyleChange(style.id)}
                className={cn(
                  'group overflow-hidden rounded-xl border text-left transition',
                  selected
                    ? 'border-accent/70 bg-accent/10 shadow-glow-sm ring-1 ring-accent/40'
                    : 'border-white/10 bg-zinc-950/50 hover:border-white/25 hover:bg-white/5',
                )}
              >
                <div className="relative aspect-[5/6] overflow-hidden bg-zinc-900">
                  <img
                    src={style.image}
                    alt={style.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-200 backdrop-blur-sm">
                    {style.tag}
                  </span>
                </div>
                <div className="space-y-0.5 px-2.5 py-2.5">
                  <span className="block text-sm font-medium text-white">
                    {style.name}
                  </span>
                  <span className="block text-xs leading-snug text-zinc-500 line-clamp-2">
                    {style.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Hair Color</h3>
        <div className="flex flex-wrap gap-2">
          {HAIR_COLOR_PRESETS.map((color) => {
            const selected = selectedColorId === color.id
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onColorChange(color.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
                  selected
                    ? 'border-accent/60 bg-accent/10 text-white'
                    : 'border-white/10 bg-zinc-950/50 text-zinc-300 hover:border-white/20',
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/20 shadow-inner"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden
                />
                {color.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/40">
        <button
          type="button"
          onClick={() => onCustomOpenChange(!customOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={customOpen}
        >
          <div>
            <p className="text-sm font-semibold text-white">Custom Style Request</p>
            <p className="text-xs text-zinc-500">
              Optional — add specific instructions like balayage or beach waves
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-zinc-400 transition',
              customOpen && 'rotate-180',
            )}
          />
        </button>
        {customOpen && (
          <div className="border-t border-white/5 px-4 pb-4 pt-3">
            <textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              rows={3}
              placeholder='e.g. "Add subtle blonde balayage and loose beach waves"'
              className="w-full resize-y rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
        )}
      </div>
    </section>
  )
}
