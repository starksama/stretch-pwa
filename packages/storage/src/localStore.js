const STORAGE_KEY = 'stretch-flow-v1';

const defaultState = {
  progressByDate: {},
  completedDates: [],
  customRoutines: [],
  settings: {
    healthSyncEnabled: false,
  },
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
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
  return structuredClone(defaultState);
}
