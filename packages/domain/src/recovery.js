export function buildRecoveryPlan(library, count = 3) {
  return library
    .slice()
    .sort((a, b) => {
      if (a.intensity !== b.intensity) return a.intensity - b.intensity;
      return a.durationSec - b.durationSec;
    })
    .slice(0, count);
}

export function getYesterdayDateKey(todayDateKey) {
  const today = new Date(`${todayDateKey}T00:00:00`);
  today.setDate(today.getDate() - 1);
  const y = today.getFullYear();
  const m = `${today.getMonth() + 1}`.padStart(2, '0');
  const d = `${today.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
