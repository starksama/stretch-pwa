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
    weeklyGoalDays: 5,
    language: 'en',
    lastTab: 'today',
    actionPackMode: 'seed',
    actionPackUrl: '',
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
    return sanitizeState(parsed);
  } catch {
    return cloneDefaultState();
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

function sanitizeState(input) {
  const safe = cloneDefaultState();
  if (!input || typeof input !== 'object') return safe;

  if (input.progressByDate && typeof input.progressByDate === 'object') {
    for (const [dateKey, entry] of Object.entries(input.progressByDate)) {
      if (!entry || typeof entry !== 'object') continue;
      safe.progressByDate[dateKey] = {
        completedStretchIds: Array.isArray(entry.completedStretchIds)
          ? entry.completedStretchIds.filter((value) => typeof value === 'string')
          : [],
        lastUpdatedAt:
          typeof entry.lastUpdatedAt === 'string' ? entry.lastUpdatedAt : new Date().toISOString(),
      };
    }
  }

  if (Array.isArray(input.completedDates)) {
    safe.completedDates = input.completedDates.filter((value) => typeof value === 'string');
  }

  if (Array.isArray(input.customRoutines)) {
    safe.customRoutines = input.customRoutines
      .filter((routine) => routine && typeof routine === 'object')
      .map((routine) => ({
        id: typeof routine.id === 'string' ? routine.id : `routine-${Date.now()}`,
        name: typeof routine.name === 'string' ? routine.name : 'Untitled',
        stretchIds: Array.isArray(routine.stretchIds)
          ? routine.stretchIds.filter((value) => typeof value === 'string')
          : [],
        createdAt:
          typeof routine.createdAt === 'string' ? routine.createdAt : new Date().toISOString(),
        ...(typeof routine.updatedAt === 'string' ? { updatedAt: routine.updatedAt } : {}),
      }));
  }

  if (input.guidedSession && typeof input.guidedSession === 'object') {
    const session = input.guidedSession;
    safe.guidedSession = {
      id: typeof session.id === 'string' ? session.id : `session-${Date.now()}`,
      dateKey: typeof session.dateKey === 'string' ? session.dateKey : '',
      sourceLabel: typeof session.sourceLabel === 'string' ? session.sourceLabel : 'Session',
      stretchIds: Array.isArray(session.stretchIds)
        ? session.stretchIds.filter((value) => typeof value === 'string')
        : [],
      currentIndex: Number.isInteger(session.currentIndex) ? session.currentIndex : 0,
      remainingSec: Number.isFinite(session.remainingSec) ? Math.max(1, session.remainingSec) : 60,
      isRunning: Boolean(session.isRunning),
      startedAt:
        typeof session.startedAt === 'string' ? session.startedAt : new Date().toISOString(),
      completedStretchIds: Array.isArray(session.completedStretchIds)
        ? session.completedStretchIds.filter((value) => typeof value === 'string')
        : [],
    };
  }

  if (Array.isArray(input.sessionHistory)) {
    safe.sessionHistory = input.sessionHistory
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : `hist-${Date.now()}`,
        sourceLabel: typeof entry.sourceLabel === 'string' ? entry.sourceLabel : 'Session',
        completed: Number.isFinite(entry.completed) ? entry.completed : 0,
        total: Number.isFinite(entry.total) ? entry.total : 0,
        endedReason: typeof entry.endedReason === 'string' ? entry.endedReason : 'ended',
        endedAt:
          typeof entry.endedAt === 'string' ? entry.endedAt : new Date().toISOString(),
      }));
  }

  if (input.settings && typeof input.settings === 'object') {
    safe.settings = {
      healthSyncEnabled: Boolean(input.settings.healthSyncEnabled),
      cueMode:
        typeof input.settings.cueMode === 'string'
          ? input.settings.cueMode
          : defaultState.settings.cueMode,
      weeklyGoalDays: Number.isFinite(Number(input.settings.weeklyGoalDays))
        ? Number(input.settings.weeklyGoalDays)
        : defaultState.settings.weeklyGoalDays,
      language:
        input.settings.language === 'zh-TW' || input.settings.language === 'en'
          ? input.settings.language
          : defaultState.settings.language,
      lastTab:
        ['today', 'guided', 'routines', 'history', 'settings'].includes(input.settings.lastTab)
          ? input.settings.lastTab
          : defaultState.settings.lastTab,
      actionPackMode:
        input.settings.actionPackMode === 'url' ? 'url' : defaultState.settings.actionPackMode,
      actionPackUrl:
        typeof input.settings.actionPackUrl === 'string'
          ? input.settings.actionPackUrl.slice(0, 300)
          : defaultState.settings.actionPackUrl,
    };
  }

  return safe;
}
