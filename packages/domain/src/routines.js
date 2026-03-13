export function createRoutine(name, stretchIds) {
  return {
    id: `routine-${Date.now()}`,
    name: name.trim(),
    stretchIds: [...new Set(stretchIds)],
    createdAt: new Date().toISOString(),
  };
}

export function validateRoutineInput(name, stretchIds) {
  if (!name || !name.trim()) return 'Routine name is required.';
  if (!stretchIds.length) return 'Select at least one stretch.';
  if (name.trim().length > 40) return 'Routine name must be 40 characters or fewer.';
  return null;
}
