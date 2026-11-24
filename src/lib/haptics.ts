/**
 * Triggers a light 10ms tactile vibration on Android devices when haptics are enabled (DESIGN §6).
 */
export function triggerHaptic(enabled = true, durationMs = 10): boolean {
  if (!enabled) return false;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      return Boolean(navigator.vibrate(durationMs));
    } catch {
      return false;
    }
  }
  return false;
}
