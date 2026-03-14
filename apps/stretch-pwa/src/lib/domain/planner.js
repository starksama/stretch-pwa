import { defaultStretchLibrary, StretchFocus } from './models.js';

const focusRotation = [
  StretchFocus.MOBILITY,
  StretchFocus.FLEXIBILITY,
  StretchFocus.POSTURE,
  StretchFocus.RECOVERY,
];

function daySeed(dateKey) {
  return dateKey
    .split('-')
    .join('')
    .split('')
    .reduce((sum, part) => sum + Number(part), 0);
}

export function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyPlan(dateKey, library = defaultStretchLibrary) {
  const seed = daySeed(dateKey);
  const targetFocus = focusRotation[seed % focusRotation.length];
  const focused = library.filter((item) => item.focus === targetFocus);
  const extras = library.filter((item) => item.focus !== targetFocus);

  const ordered = [...focused, ...extras]
    .sort((a, b) => (a.durationSec === b.durationSec ? a.name.localeCompare(b.name) : a.durationSec - b.durationSec));

  return {
    id: `plan-${dateKey}`,
    dateKey,
    focus: targetFocus,
    stretches: ordered.slice(0, 5),
    totalSeconds: ordered.slice(0, 5).reduce((sum, item) => sum + item.durationSec, 0),
  };
}
