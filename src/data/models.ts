import type { ModelId, ModelInfo } from '@/types'

export const MODELS: ModelInfo[] = [
  {
    id: 'prism-pro',
    name: 'Prism Pro',
    tagline: 'గాఢమైన ఆలోచన · Deep reasoning',
    badge: 'Recommended',
    description: 'Gemini 3.8 Flash — best for long documents, detailed drafting and analysis.',
    apiModel: 'gemini-3.8-flash',
  },
  {
    id: 'prism-fast',
    name: 'Prism Standard',
    tagline: 'వేగవంతమైన సమాధానం · Fast',
    description: 'Gemini 3.5 Flash — balanced speed and quality for everyday duty queries.',
    apiModel: 'gemini-3.5-flash',
  },
  {
    id: 'prism-lite',
    name: 'Prism Lite',
    tagline: 'అత్యంత వేగంగా · Fastest',
    description: 'Gemini 3.5 Flash-Lite — quickest replies for short questions.',
    apiModel: 'gemini-3.5-flash-lite',
  },
]

/**
 * Tried in order when the selected model is rejected (HTTP 404).
 * Google retires and restricts model IDs without notice — e.g. the whole
 * gemini-2.5-* family now returns 404 for projects created after mid-2026 —
 * so we fall back automatically instead of showing the user an error.
 */
export const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
]

export const DEFAULT_MODEL: ModelId = 'prism-pro'

export const modelById = (id: string): ModelInfo =>
  MODELS.find((m) => m.id === id) ?? MODELS[0]