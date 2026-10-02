import type { HairColorPreset, HairstylePreset } from '../types'

export const GITHUB_REPO_URL = 'https://github.com/smokedogcodes/styleshift-ai'

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const LOADING_MESSAGES = [
  'Analyzing facial structure...',
  'Locking facial geometry...',
  'Synthesizing hairstyle...',
] as const

export const HAIRSTYLE_PRESETS: HairstylePreset[] = [
  {
    id: 'buzz-cut',
    name: 'Buzz Cut',
    tag: 'Short',
    description: 'Clean close-cropped cut',
  },
  {
    id: 'textured-crop',
    name: 'Textured Crop',
    tag: 'Modern',
    description: 'Messy textured top with faded sides',
  },
  {
    id: 'classic-pompadour',
    name: 'Classic Pompadour',
    tag: 'Classic',
    description: 'Voluminous swept-back crown',
  },
  {
    id: 'curtain-bangs',
    name: 'Curtain Bangs',
    tag: 'Soft',
    description: 'Center-parted face-framing bangs',
  },
  {
    id: 'wavy-bob',
    name: 'Wavy Bob',
    tag: 'Medium',
    description: 'Chin-length soft waves',
  },
  {
    id: 'shoulder-layers',
    name: 'Shoulder Length Layers',
    tag: 'Long',
    description: 'Layered shoulder-length hair',
  },
  {
    id: 'afro-fade',
    name: 'Afro / Fade',
    tag: 'Texture',
    description: 'Natural afro volume with faded sides',
  },
  {
    id: 'pixie-cut',
    name: 'Pixie Cut',
    tag: 'Short',
    description: 'Short cropped pixie with soft edges',
  },
]

export const HAIR_COLOR_PRESETS: HairColorPreset[] = [
  { id: 'natural-black', name: 'Natural Black', hex: '#1a1a1a' },
  { id: 'dark-chocolate', name: 'Dark Chocolate Brown', hex: '#3b2414' },
  { id: 'honey-blonde', name: 'Honey Blonde', hex: '#c9a227' },
  { id: 'platinum-silver', name: 'Platinum Silver', hex: '#d4d4d8' },
  { id: 'auburn-red', name: 'Auburn Red', hex: '#8b3a2a' },
  { id: 'pastel-pink', name: 'Pastel Pink', hex: '#f9a8d4' },
  { id: 'emerald-green', name: 'Emerald Green', hex: '#059669' },
]
