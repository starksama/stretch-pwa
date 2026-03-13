import { getDateKey, getDailyPlan } from '../../../packages/domain/src/planner.js';
import { defaultStretchLibrary } from '../../../packages/domain/src/models.js';
import { getActiveStreak, hasCompletedPlan } from '../../../packages/domain/src/streaks.js';
import { createRoutine, validateRoutineInput } from '../../../packages/domain/src/routines.js';
import { loadState, saveState } from '../../../packages/storage/src/localStore.js';
import { syncWorkoutSnapshot } from '../../../packages/integrations/health-sync/src/index.js';
import { featureFlags } from './config/featureFlags.js';

const appRoot = document.querySelector('#app');
const state = loadState();
const todayDateKey = getDateKey();
const plan = getDailyPlan(todayDateKey, defaultStretchLibrary);

if (!state.progressByDate[todayDateKey]) {
  state.progressByDate[todayDateKey] = {
    completedStretchIds: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

persistAndRender();
registerServiceWorker();

function persistAndRender() {
  const todayProgress = state.progressByDate[todayDateKey];
  const completedCount = todayProgress.completedStretchIds.length;
  const completionRatio = Math.min(completedCount / plan.stretches.length, 1);

  if (hasCompletedPlan(todayProgress, plan.stretches.length) && !state.completedDates.includes(todayDateKey)) {
    state.completedDates.push(todayDateKey);
  }

  state.completedDates = Array.from(new Set(state.completedDates)).sort();
  saveState(state);

  render({ completedCount, completionRatio });
}

function render({ completedCount, completionRatio }) {
  const streak = getActiveStreak(state.completedDates, todayDateKey);
  const ringDash = Math.round(completionRatio * 283);

  appRoot.innerHTML = `
    <section class="hero card enter-up">
      <div>
        <p class="eyebrow">Today • ${plan.dateKey}</p>
        <h1>Stretch Flow</h1>
        <p class="muted">${capitalize(plan.focus)} focus · ${Math.ceil(plan.totalSeconds / 60)} min routine</p>
      </div>
      <img src="./assets/illustration-stretch.svg" class="hero-art" alt="Abstract stretching illustration" />
    </section>

    <section class="stats-grid enter-up delay-1">
      <article class="card stat-card">
        <div class="ring" role="img" aria-label="${Math.round(completionRatio * 100)} percent complete">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="45"></circle>
            <circle class="ring-fg" cx="50" cy="50" r="45" style="stroke-dasharray: ${ringDash} 283"></circle>
          </svg>
          <span>${Math.round(completionRatio * 100)}%</span>
        </div>
        <p class="muted">Daily completion</p>
      </article>
      <article class="card stat-card">
        <p class="stat-value">${streak}</p>
        <p class="muted">Day streak</p>
      </article>
      <article class="card stat-card">
        <p class="stat-value">${state.customRoutines.length}</p>
        <p class="muted">Custom routines</p>
      </article>
    </section>

    <section class="card enter-up delay-2">
      <header class="section-head">
        <h2>Daily Plan</h2>
        <p class="muted">${completedCount}/${plan.stretches.length} done</p>
      </header>
      <ul class="stretch-list">
        ${plan.stretches
          .map((item) => {
            const checked = state.progressByDate[todayDateKey].completedStretchIds.includes(item.id);
            return `
              <li class="stretch-item ${checked ? 'checked' : ''}">
                <button class="touch-btn" data-action="toggle-stretch" data-id="${item.id}">
                  <span>
                    <strong>${escapeHtml(item.name)}</strong>
                    <small>${item.durationSec}s${item.sideAware ? ' · each side' : ''}</small>
                  </span>
                  <span class="pill">${checked ? 'Done' : 'Mark'}</span>
                </button>
                <p class="cues">${item.cues.join(' · ')}</p>
              </li>
            `;
          })
          .join('')}
      </ul>
    </section>

    <section class="card enter-up delay-3">
      <header class="section-head">
        <h2>Build Routine</h2>
        <p class="muted">Save reusable stretch combos</p>
      </header>
      <form id="routine-form" class="routine-form">
        <label>
          Name
          <input name="name" maxlength="40" placeholder="Example: Desk Reset" required />
        </label>
        <fieldset>
          <legend>Select stretches</legend>
          <div class="choice-grid">
            ${defaultStretchLibrary
              .map(
                (item) => `
              <label class="choice-chip">
                <input type="checkbox" name="stretch" value="${item.id}" />
                <span>${escapeHtml(item.name)}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </fieldset>
        <button type="submit" class="primary-btn">Save routine</button>
        <p class="form-msg" id="routine-msg" aria-live="polite"></p>
      </form>
      <ul class="routine-list">
        ${state.customRoutines
          .map(
            (routine) => `
          <li>
            <h3>${escapeHtml(routine.name)}</h3>
            <p class="muted">${routine.stretchIds
              .map((id) => defaultStretchLibrary.find((stretch) => stretch.id === id)?.name)
              .filter(Boolean)
              .map((name) => escapeHtml(name))
              .join(' · ')}</p>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>

    ${featureFlags.healthSyncScaffold ? renderIntegrationCard() : ''}
  `;

  bindEvents();
}

function renderIntegrationCard() {
  return `
    <section class="card enter-up delay-3">
      <header class="section-head">
        <h2>Health Sync (Preview)</h2>
        <p class="muted">Scaffold only. External API hooks are TODO-marked.</p>
      </header>
      <div class="integration-actions">
        <label class="switch-row">
          <span>Enable sync scaffold</span>
          <input type="checkbox" id="sync-enabled" ${state.settings.healthSyncEnabled ? 'checked' : ''} />
        </label>
        <button class="ghost-btn" id="sync-now">Run dry sync</button>
        <p class="muted" id="sync-msg">No sync run yet.</p>
      </div>
    </section>
  `;
}

function bindEvents() {
  appRoot.querySelectorAll('[data-action="toggle-stretch"]').forEach((button) => {
    button.addEventListener('click', () => {
      const stretchId = button.dataset.id;
      const completed = state.progressByDate[todayDateKey].completedStretchIds;

      if (completed.includes(stretchId)) {
        state.progressByDate[todayDateKey].completedStretchIds = completed.filter((id) => id !== stretchId);
      } else {
        state.progressByDate[todayDateKey].completedStretchIds = [...completed, stretchId];
      }

      state.progressByDate[todayDateKey].lastUpdatedAt = new Date().toISOString();
      persistAndRender();
    });
  });

  const form = appRoot.querySelector('#routine-form');
  const msgEl = appRoot.querySelector('#routine-msg');
  if (form && msgEl) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const name = `${formData.get('name') || ''}`;
      const selected = formData.getAll('stretch').map(String);
      const validationError = validateRoutineInput(name, selected);

      if (validationError) {
        msgEl.textContent = validationError;
        return;
      }

      state.customRoutines = [createRoutine(name, selected), ...state.customRoutines];
      msgEl.textContent = 'Routine saved.';
      form.reset();
      persistAndRender();
    });
  }

  const syncToggle = appRoot.querySelector('#sync-enabled');
  const syncButton = appRoot.querySelector('#sync-now');
  const syncMsg = appRoot.querySelector('#sync-msg');

  if (syncToggle) {
    syncToggle.addEventListener('change', () => {
      state.settings.healthSyncEnabled = syncToggle.checked;
      saveState(state);
      if (syncMsg) syncMsg.textContent = syncToggle.checked ? 'Scaffold enabled.' : 'Scaffold disabled.';
    });
  }

  if (syncButton && syncMsg) {
    syncButton.addEventListener('click', async () => {
      syncMsg.textContent = 'Running dry sync...';
      const payload = {
        dateKey: todayDateKey,
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        total: plan.stretches.length,
      };

      const result = await syncWorkoutSnapshot({
        provider: 'health-connect',
        payload,
        enabled: state.settings.healthSyncEnabled,
      });

      if (result.ok) {
        syncMsg.textContent = 'Sync success.';
      } else if (result.reason === 'feature_flag_disabled') {
        syncMsg.textContent = 'Enable sync scaffold first.';
      } else {
        syncMsg.textContent = `Dry sync skipped (${result.reason}).`;
      }
    });
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // No-op for offline registration failures.
    });
  });
}

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
