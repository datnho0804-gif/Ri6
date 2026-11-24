import type { LogType } from '../../types/models';

export type SemanticTone =
  | 'ok'
  | 'warn'
  | 'danger'
  | 'info'
  | 'tc'
  | 'ph'
  | 'water'
  | 'sec'
  | 'ai'
  | 'neutral';

export const TONE_CONTAINER_CLASSES: Record<SemanticTone, string> = {
  ok: 'bg-ok-container text-ok',
  warn: 'bg-warn-container text-warn',
  danger: 'bg-danger-container text-danger',
  info: 'bg-info-container text-info',
  tc: 'bg-tertiary-container text-on-tertiary-container',
  ph: 'bg-ph-container text-ph',
  water: 'bg-water-container text-water',
  sec: 'bg-secondary-container text-on-secondary-container',
  ai: 'bg-ai-container text-ai',
  neutral: 'bg-surface-2 text-text-2',
};

export const TONE_TEXT_CLASSES: Record<SemanticTone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
  tc: 'text-on-tertiary-container',
  ph: 'text-ph',
  water: 'text-water',
  sec: 'text-secondary',
  ai: 'text-ai',
  neutral: 'text-text',
};

export const LOG_TYPE_TONE: Record<LogType, SemanticTone> = {
  'bon-phan': 'ok',
  'phun-thuoc': 'info',
  tuoi: 'water',
  'do-ph': 'ph',
  'cat-tia': 'sec',
  'sau-benh': 'danger',
  'lam-bong': 'tc',
  ai: 'ai',
  khac: 'neutral',
};
