export function createGuidedSession(plan, completedStretchIds) {
  const firstPendingIndex = plan.stretches.findIndex((stretch) => !completedStretchIds.includes(stretch.id));
  const activeIndex = firstPendingIndex === -1 ? 0 : firstPendingIndex;
  const activeStretch = plan.stretches[activeIndex];

  return {
    planId: plan.id,
    dateKey: plan.dateKey,
    currentIndex: activeIndex,
    remainingSec: activeStretch.durationSec,
    isRunning: false,
    startedAt: new Date().toISOString(),
    completedStretchIds: [...new Set(completedStretchIds)],
  };
}

export function clampSessionToPlan(session, plan) {
  if (!session || session.planId !== plan.id || session.dateKey !== plan.dateKey) {
    return null;
  }

  if (session.currentIndex < 0 || session.currentIndex >= plan.stretches.length) {
    return null;
  }

  const stretch = plan.stretches[session.currentIndex];
  return {
    ...session,
    remainingSec: Math.max(1, Math.min(session.remainingSec, stretch.durationSec)),
    completedStretchIds: [...new Set(session.completedStretchIds)],
  };
}

export function tickGuidedSession(session) {
  if (!session?.isRunning) return session;
  return { ...session, remainingSec: Math.max(0, session.remainingSec - 1) };
}

export function completeCurrentStretch(session, plan) {
  const stretch = plan.stretches[session.currentIndex];
  const mergedCompleted = [...new Set([...session.completedStretchIds, stretch.id])];
  const nextIndex = session.currentIndex + 1;

  if (nextIndex >= plan.stretches.length) {
    return {
      nextSession: null,
      finished: true,
      completedStretchIds: mergedCompleted,
    };
  }

  return {
    nextSession: {
      ...session,
      currentIndex: nextIndex,
      remainingSec: plan.stretches[nextIndex].durationSec,
      completedStretchIds: mergedCompleted,
    },
    finished: false,
    completedStretchIds: mergedCompleted,
  };
}

export function getGuidedSessionProgress(session, total) {
  if (!session) return 0;
  return Math.min(session.completedStretchIds.length / total, 1);
}
