import { seedActionPackV1 } from './seedPack.v1.js';
import { seedOfficeActionPackV1 } from './seedPack.office.v1.js';
import { seedRecoveryActionPackV1 } from './seedPack.recovery.v1.js';
import { isValidActionPack } from './schema.js';

const BUILTIN_PACKS = {
  seed: seedActionPackV1,
  'seed-office': seedOfficeActionPackV1,
  'seed-recovery': seedRecoveryActionPackV1,
};

export function loadActionLibrary(options = {}) {
  const { mode = 'seed', externalPack = null } = options;
  const candidate = resolveCandidatePack(mode, externalPack);
  const pack = isValidActionPack(candidate) ? candidate : seedActionPackV1;

  return {
    meta: {
      version: pack.version,
      source: pack.source || (pack === seedActionPackV1 ? 'seed/local' : 'external'),
      mode,
      usedFallback: pack !== candidate,
      rawPack: pack,
    },
    actions: pack.actions.map((action) => ({
      id: action.id,
      name: action.instructions.en.title,
      durationSec: action.durationSec,
      sideAware: action.sideAware,
      focus: action.focus,
      intensity: action.intensity,
      cues: [action.instructions.en.formCue, action.instructions.en.breathingCue],
      instructions: action.instructions,
      quality: action.quality,
    })),
  };
}

export async function loadActionLibraryFromSource(options = {}) {
  const { mode = 'seed', packUrl = '', externalPack = null, fetchImpl = fetch } = options;
  if (mode === 'url' && packUrl.trim()) {
    try {
      const response = await fetchImpl(packUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const remotePack = await response.json();
      const loaded = loadActionLibrary({ mode: 'download-pack', externalPack: remotePack });
      if (loaded.meta.usedFallback) {
        return {
          ...loaded,
          meta: {
            ...loaded.meta,
            error: 'invalid_schema',
          },
        };
      }
      return loaded;
    } catch (error) {
      const fallback = loadActionLibrary({ mode: 'seed' });
      return {
        ...fallback,
        meta: {
          ...fallback.meta,
          error: error instanceof Error ? error.message : 'load_failed',
          usedFallback: true,
        },
      };
    }
  }
  return loadActionLibrary({ mode, externalPack });
}

function resolveCandidatePack(mode, externalPack) {
  if (mode === 'external-api' || mode === 'download-pack') {
    return externalPack;
  }
  if (BUILTIN_PACKS[mode]) {
    return BUILTIN_PACKS[mode];
  }
  return seedActionPackV1;
}
