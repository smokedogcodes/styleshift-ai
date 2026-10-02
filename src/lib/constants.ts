import type { Gender, HairColorPreset, HairstylePreset } from '../types'

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

export const MALE_HAIRSTYLES: HairstylePreset[] = [
  {
    id: 'buzz-cut',
    name: 'Buzz Cut',
    tag: 'Short',
    description: 'Clean close-cropped cut',
    gender: 'male',
    image: '/hairstyles/male/buzz-cut.svg',
  },
  {
    id: 'textured-crop',
    name: 'Textured Crop',
    tag: 'Modern',
    description: 'Messy textured top with faded sides',
    gender: 'male',
    image: '/hairstyles/male/textured-crop.svg',
  },
  {
    id: 'classic-pompadour',
    name: 'Classic Pompadour',
    tag: 'Classic',
    description: 'Voluminous swept-back crown',
    gender: 'male',
    image: '/hairstyles/male/classic-pompadour.svg',
  },
  {
    id: 'slick-back',
    name: 'Slick Back',
    tag: 'Clean',
    description: 'Polished hair combed straight back',
    gender: 'male',
    image: '/hairstyles/male/slick-back.svg',
  },
  {
    id: 'curtain-bangs-men',
    name: 'Curtain Bangs',
    tag: 'Soft',
    description: 'Center-parted face-framing fringe',
    gender: 'male',
    image: '/hairstyles/male/curtain-bangs-men.svg',
  },
  {
    id: 'man-bun',
    name: 'Man Bun',
    tag: 'Tied',
    description: 'Top knot with clean sides',
    gender: 'male',
    image: '/hairstyles/male/man-bun.svg',
  },
  {
    id: 'afro-fade',
    name: 'Afro / Fade',
    tag: 'Texture',
    description: 'Natural afro volume with faded sides',
    gender: 'male',
    image: '/hairstyles/male/afro-fade.svg',
  },
  {
    id: 'quiff',
    name: 'Quiff',
    tag: 'Volume',
    description: 'Lifted front with tapered sides',
    gender: 'male',
    image: '/hairstyles/male/quiff.svg',
  },
]

export const FEMALE_HAIRSTYLES: HairstylePreset[] = [
  {
    id: 'pixie-cut',
    name: 'Pixie Cut',
    tag: 'Short',
    description: 'Short cropped pixie with soft edges',
    gender: 'female',
    image: '/hairstyles/female/pixie-cut.svg',
  },
  {
    id: 'wavy-bob',
    name: 'Wavy Bob',
    tag: 'Medium',
    description: 'Chin-length soft waves',
    gender: 'female',
    image: '/hairstyles/female/wavy-bob.svg',
  },
  {
    id: 'curtain-bangs',
    name: 'Curtain Bangs',
    tag: 'Soft',
    description: 'Center-parted face-framing bangs',
    gender: 'female',
    image: '/hairstyles/female/curtain-bangs.svg',
  },
  {
    id: 'shoulder-layers',
    name: 'Shoulder Layers',
    tag: 'Long',
    description: 'Layered shoulder-length hair',
    gender: 'female',
    image: '/hairstyles/female/shoulder-layers.svg',
  },
  {
    id: 'long-straight',
    name: 'Long Straight',
    tag: 'Long',
    description: 'Sleek straight hair past the shoulders',
    gender: 'female',
    image: '/hairstyles/female/long-straight.svg',
  },
  {
    id: 'beach-waves',
    name: 'Beach Waves',
    tag: 'Wavy',
    description: 'Loose tousled beach waves',
    gender: 'female',
    image: '/hairstyles/female/beach-waves.svg',
  },
  {
    id: 'high-ponytail',
    name: 'High Ponytail',
    tag: 'Tied',
    description: 'High sleek ponytail',
    gender: 'female',
    image: '/hairstyles/female/high-ponytail.svg',
  },
  {
    id: 'natural-curls',
    name: 'Natural Curls',
    tag: 'Curly',
    description: 'Full voluminous natural curls',
    gender: 'female',
    image: '/hairstyles/female/natural-curls.svg',
  },
]

export const HAIRSTYLES_BY_GENDER: Record<Gender, HairstylePreset[]> = {
  male: MALE_HAIRSTYLES,
  female: FEMALE_HAIRSTYLES,
}

export function getHairstylesForGender(gender: Gender): HairstylePreset[] {
  return HAIRSTYLES_BY_GENDER[gender]
}

export const HAIR_COLOR_PRESETS: HairColorPreset[] = [
  { id: 'natural-black', name: 'Natural Black', hex: '#1a1a1a' },
  { id: 'dark-chocolate', name: 'Dark Chocolate Brown', hex: '#3b2414' },
  { id: 'honey-blonde', name: 'Honey Blonde', hex: '#c9a227' },
  { id: 'platinum-silver', name: 'Platinum Silver', hex: '#d4d4d8' },
  { id: 'auburn-red', name: 'Auburn Red', hex: '#8b3a2a' },
  { id: 'pastel-pink', name: 'Pastel Pink', hex: '#f9a8d4' },
  { id: 'emerald-green', name: 'Emerald Green', hex: '#059669' },
]
