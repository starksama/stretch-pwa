export async function syncWithHealthConnect(payload) {
  // TODO(health-connect): bridge via native shell plugin (Android) and permission prompts.
  // TODO(health-connect): define write batching + conflict resolution strategy.
  void payload;
  return { ok: false, skipped: true, reason: 'not_implemented' };
}
