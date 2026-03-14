const STORAGE_KEY = 'stretch-flow-v1';

const defaultState = {
  progressByDate: {},
  completedDates: [],
  customRoutines: [],
  guidedSession: null,
  sessionHistory: [],
  settings: {
    healthSyncEnabled: false,
    cueMode: 'vibration',
  },
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultState();

    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaultState(),
      ...parsed,
      settings: {
        ...defaultState.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDefaultState() {
  return cloneDefaultState();
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
