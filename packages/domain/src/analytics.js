export function getRecentCompletionWindow({ todayDateKey, completedDates, days = 7 }) {
  const completedSet = new Set(completedDates);
  const today = new Date(`${todayDateKey}T00:00:00`);
  const window = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() - i);
    const key = toLocalDateKey(cursor);
    window.push({
      dateKey: key,
      isComplete: completedSet.has(key),
      dayLabel: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }

  return window;
}

export function getCompletionRate(completionWindow) {
  if (!completionWindow.length) return 0;
  const completeCount = completionWindow.filter((day) => day.isComplete).length;
  return Math.round((completeCount / completionWindow.length) * 100);
}

function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
