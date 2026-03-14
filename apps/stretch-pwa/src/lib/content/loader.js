import { seedActionPackV1 } from './seedPack.v1.js';
import { isValidActionPack } from './schema.js';

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
      return loadActionLibrary({ mode: 'download-pack', externalPack: remotePack });
    } catch {
      return loadActionLibrary({ mode: 'seed' });
    }
  }
  return loadActionLibrary({ mode, externalPack });
}

function resolveCandidatePack(mode, externalPack) {
  if (mode === 'external-api' || mode === 'download-pack') {
    return externalPack;
  }
  return seedActionPackV1;
}
