export function createGuidedSession({
  sessionId,
  dateKey,
  sourceLabel,
  stretchIds,
  completedStretchIds,
  stretchById,
}) {
  const validStretchIds = stretchIds.filter((id) => Boolean(stretchById[id]));
  if (!validStretchIds.length) return null;

  const completedSet = new Set(completedStretchIds.filter((id) => validStretchIds.includes(id)));
  const firstPendingIndex = validStretchIds.findIndex((id) => !completedSet.has(id));
  const currentIndex = firstPendingIndex === -1 ? 0 : firstPendingIndex;
  const activeId = validStretchIds[currentIndex];

  return {
    id: sessionId,
    dateKey,
    sourceLabel,
    stretchIds: validStretchIds,
    currentIndex,
    remainingSec: stretchById[activeId].durationSec,
    isRunning: false,
    startedAt: new Date().toISOString(),
    completedStretchIds: [...completedSet],
  };
}

export function clampSessionToLibrary(session, stretchById, dateKey) {
  if (!session || session.dateKey !== dateKey || !session.stretchIds?.length) return null;

  const validStretchIds = session.stretchIds.filter((id) => Boolean(stretchById[id]));
  if (!validStretchIds.length || session.currentIndex < 0 || session.currentIndex >= validStretchIds.length) {
    return null;
  }

  const activeId = validStretchIds[session.currentIndex];
  const maxSec = stretchById[activeId].durationSec;
  const completedSet = new Set(session.completedStretchIds.filter((id) => validStretchIds.includes(id)));

  return {
    ...session,
    stretchIds: validStretchIds,
    remainingSec: Math.max(1, Math.min(session.remainingSec, maxSec)),
    completedStretchIds: [...completedSet],
  };
}

export function tickGuidedSession(session) {
  if (!session?.isRunning) return session;
  return { ...session, remainingSec: Math.max(0, session.remainingSec - 1) };
}

export function completeCurrentStretch(session, stretchById) {
  const currentStretchId = session.stretchIds[session.currentIndex];
  const mergedCompleted = [...new Set([...session.completedStretchIds, currentStretchId])];
  const nextIndex = session.currentIndex + 1;

  if (nextIndex >= session.stretchIds.length) {
    return {
      nextSession: null,
      finished: true,
      completedStretchIds: mergedCompleted,
    };
  }

  const nextId = session.stretchIds[nextIndex];
  return {
    nextSession: {
      ...session,
      currentIndex: nextIndex,
      remainingSec: stretchById[nextId].durationSec,
      completedStretchIds: mergedCompleted,
    },
    finished: false,
    completedStretchIds: mergedCompleted,
  };
}

export function getGuidedSessionProgress(session) {
  if (!session) return 0;
  return Math.min(session.completedStretchIds.length / session.stretchIds.length, 1);
}
