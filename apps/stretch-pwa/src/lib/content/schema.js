const REQUIRED_LOCALES = ['en', 'zh-TW'];

export function isValidActionPack(pack) {
  if (!pack || typeof pack !== 'object') return false;
  if (typeof pack.version !== 'string' || !pack.version.startsWith('1.')) return false;
  if (!Array.isArray(pack.actions) || !pack.actions.length) return false;

  return pack.actions.every(isValidAction);
}

function isValidAction(action) {
  if (!action || typeof action !== 'object') return false;
  if (typeof action.id !== 'string' || !action.id) return false;
  if (!Number.isFinite(action.durationSec) || action.durationSec < 10) return false;
  if (typeof action.sideAware !== 'boolean') return false;
  if (typeof action.focus !== 'string') return false;
  if (!Number.isFinite(action.intensity)) return false;
  if (!action.instructions || typeof action.instructions !== 'object') return false;
  if (!action.quality || typeof action.quality !== 'object') return false;

  const hasLocales = REQUIRED_LOCALES.every((locale) => isValidInstruction(action.instructions[locale]));
  if (!hasLocales) return false;

  if (typeof action.quality.difficulty !== 'string') return false;
  if (typeof action.quality.bodyArea !== 'string') return false;
  if (!Array.isArray(action.quality.tags)) return false;

  return true;
}

function isValidInstruction(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return (
    typeof entry.title === 'string' &&
    typeof entry.description === 'string' &&
    typeof entry.formCue === 'string' &&
    typeof entry.breathingCue === 'string' &&
    typeof entry.warning === 'string' &&
    typeof entry.alternative === 'string'
  );
}
