export async function syncWithGoogleHealth(payload) {
  // TODO(health-sync): wire OAuth + read/write scopes + retry policy.
  // TODO(health-sync): map local stretch/workout sessions to Google Health data types.
  void payload;
  return { ok: false, skipped: true, reason: 'not_implemented' };
}
