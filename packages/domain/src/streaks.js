function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getActiveStreak(completedDateKeys, todayDateKey) {
  if (!completedDateKeys?.length) return 0;

  const set = new Set(completedDateKeys);
  let streak = 0;

  const cursor = new Date(`${todayDateKey}T00:00:00`);
  while (true) {
    const key = toLocalDateKey(cursor);
    if (!set.has(key)) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function hasCompletedPlan(progressForDate, planStretchCount) {
  if (!progressForDate) return false;
  return progressForDate.completedStretchIds.length >= planStretchCount;
}
