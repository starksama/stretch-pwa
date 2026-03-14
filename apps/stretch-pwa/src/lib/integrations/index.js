import { syncWithGoogleHealth } from './googleHealthAdapter.js';
import { syncWithHealthConnect } from './healthConnectAdapter.js';

export async function syncWorkoutSnapshot({ provider, payload, enabled }) {
  if (!enabled) return { ok: false, skipped: true, reason: 'feature_flag_disabled' };

  if (provider === 'google-health') {
    return syncWithGoogleHealth(payload);
  }

  if (provider === 'health-connect') {
    return syncWithHealthConnect(payload);
  }

  return { ok: false, skipped: true, reason: 'unknown_provider' };
}
