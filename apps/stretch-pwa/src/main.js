import { getDateKey, getDailyPlan } from '../../../packages/domain/src/planner.js';
import { defaultStretchLibrary } from '../../../packages/domain/src/models.js';
import { getActiveStreak, hasCompletedPlan } from '../../../packages/domain/src/streaks.js';
import { createRoutine, validateRoutineInput } from '../../../packages/domain/src/routines.js';
import {
  clampSessionToLibrary,
  completeCurrentStretch,
  createGuidedSession,
  getGuidedSessionProgress,
  tickGuidedSession,
} from '../../../packages/domain/src/session.js';
import { loadState, saveState } from '../../../packages/storage/src/localStore.js';
import { syncWorkoutSnapshot } from '../../../packages/integrations/health-sync/src/index.js';
import { featureFlags } from './config/featureFlags.js';

const appRoot = document.querySelector('#app');
const state = loadState();
const todayDateKey = getDateKey();
const plan = getDailyPlan(todayDateKey, defaultStretchLibrary);
const stretchById = Object.fromEntries(defaultStretchLibrary.map((item) => [item.id, item]));
let guidedTimerId = null;

if (!state.progressByDate[todayDateKey]) {
  state.progressByDate[todayDateKey] = {
    completedStretchIds: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}
state.guidedSession = clampSessionToLibrary(state.guidedSession, stretchById, todayDateKey);

persistAndRender();
registerServiceWorker();

function persistAndRender() {
  const todayProgress = state.progressByDate[todayDateKey];
  if (state.guidedSession) {
    const merged = new Set([...todayProgress.completedStretchIds, ...state.guidedSession.completedStretchIds]);
    todayProgress.completedStretchIds = [...merged];
  }

  const completedCount = todayProgress.completedStretchIds.length;
  const completionRatio = Math.min(completedCount / plan.stretches.length, 1);

  if (hasCompletedPlan(todayProgress, plan.stretches.length) && !state.completedDates.includes(todayDateKey)) {
    state.completedDates.push(todayDateKey);
  }

  state.completedDates = Array.from(new Set(state.completedDates)).sort();
  saveState(state);
  syncGuidedTimer();
  render({ completedCount, completionRatio, guidedProgress: getGuidedSessionProgress(state.guidedSession) });
}

function render({ completedCount, completionRatio, guidedProgress }) {
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

    ${renderGuidedSessionCard(guidedProgress)}

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
            <div class="routine-actions">
              <button class="ghost-btn" data-action="start-routine" data-id="${routine.id}">Start</button>
              <button class="ghost-btn danger-btn" data-action="delete-routine" data-id="${routine.id}">Delete</button>
            </div>
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

function renderGuidedSessionCard(guidedProgress) {
  const session = state.guidedSession;
  const activeStretch = session ? stretchById[session.stretchIds[session.currentIndex]] : null;
  const totalMinutes = Math.ceil(plan.totalSeconds / 60);
  const totalStretches = session?.stretchIds.length || plan.stretches.length;
  const completed = session?.completedStretchIds.length || 0;

  if (!session || !activeStretch) {
    return `
      <section class="card guided-card enter-up delay-2">
        <header class="section-head">
          <h2>Guided Session</h2>
          <p class="muted">${totalMinutes} min flow</p>
        </header>
        <p class="muted">Hands-free stretch timer with auto-advance and completion sync.</p>
        <button class="primary-btn" id="guided-start">Start guided session</button>
      </section>
    `;
  }

  const sessionPercent = Math.round(guidedProgress * 100);
  const stretchPercent = Math.round(((activeStretch.durationSec - session.remainingSec) / activeStretch.durationSec) * 100);
  const statusLabel = session.isRunning ? 'Running' : 'Paused';

  return `
    <section class="card guided-card enter-up delay-2">
      <header class="section-head">
        <h2>Guided Session</h2>
        <p class="muted">${escapeHtml(session.sourceLabel)} · ${statusLabel}</p>
      </header>
      <p class="guided-title">${escapeHtml(activeStretch.name)}</p>
      <p class="guided-time">${formatTimer(session.remainingSec)}</p>
      <p class="muted">Stretch ${session.currentIndex + 1}/${totalStretches} · ${completed}/${totalStretches} complete</p>
      <div class="progress-track" aria-hidden="true">
        <span style="width:${Math.max(0, Math.min(stretchPercent, 100))}%"></span>
      </div>
      <div class="progress-track whole" aria-hidden="true">
        <span style="width:${sessionPercent}%"></span>
      </div>
      <div class="guided-actions">
        <button class="ghost-btn" id="guided-toggle">${session.isRunning ? 'Pause' : 'Resume'}</button>
        <button class="ghost-btn" id="guided-skip">Skip</button>
        <button class="ghost-btn" id="guided-end">Finish now</button>
      </div>
    </section>
  `;
}

function bindEvents() {
  const guidedStart = appRoot.querySelector('#guided-start');
  if (guidedStart) {
    guidedStart.addEventListener('click', () => {
      const nextSession = createGuidedSession({
        sessionId: plan.id,
        dateKey: todayDateKey,
        sourceLabel: 'Daily Plan',
        stretchIds: plan.stretches.map((stretch) => stretch.id),
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      persistAndRender();
    });
  }

  appRoot.querySelectorAll('[data-action="start-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      const routine = state.customRoutines.find((item) => item.id === routineId);
      if (!routine) return;

      const nextSession = createGuidedSession({
        sessionId: routine.id,
        dateKey: todayDateKey,
        sourceLabel: `Routine: ${routine.name}`,
        stretchIds: routine.stretchIds,
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="delete-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      state.customRoutines = state.customRoutines.filter((routine) => routine.id !== routineId);
      if (state.guidedSession?.id === routineId) {
        state.guidedSession = null;
      }
      persistAndRender();
    });
  });

  const guidedToggle = appRoot.querySelector('#guided-toggle');
  if (guidedToggle) {
    guidedToggle.addEventListener('click', () => {
      if (!state.guidedSession) return;
      state.guidedSession.isRunning = !state.guidedSession.isRunning;
      persistAndRender();
    });
  }

  const guidedSkip = appRoot.querySelector('#guided-skip');
  if (guidedSkip) {
    guidedSkip.addEventListener('click', () => {
      completeGuidedStep();
    });
  }

  const guidedEnd = appRoot.querySelector('#guided-end');
  if (guidedEnd) {
    guidedEnd.addEventListener('click', () => {
      if (!state.guidedSession) return;
      const merged = new Set([
        ...state.progressByDate[todayDateKey].completedStretchIds,
        ...state.guidedSession.completedStretchIds,
      ]);
      state.progressByDate[todayDateKey].completedStretchIds = [...merged];
      state.guidedSession = null;
      persistAndRender();
    });
  }

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

function syncGuidedTimer() {
  if (guidedTimerId) {
    clearInterval(guidedTimerId);
    guidedTimerId = null;
  }

  if (!state.guidedSession?.isRunning) return;

  guidedTimerId = window.setInterval(() => {
    if (!state.guidedSession?.isRunning) return;
    state.guidedSession = tickGuidedSession(state.guidedSession);

    if (state.guidedSession.remainingSec <= 0) {
      completeGuidedStep();
      return;
    }

    saveState(state);
    const tickCompletedCount = state.progressByDate[todayDateKey].completedStretchIds.length;
    render({
      completedCount: tickCompletedCount,
      completionRatio: Math.min(tickCompletedCount / plan.stretches.length, 1),
      guidedProgress: getGuidedSessionProgress(state.guidedSession),
    });
  }, 1000);
}

function completeGuidedStep() {
  if (!state.guidedSession) return;

  const result = completeCurrentStretch(state.guidedSession, stretchById);
  const merged = new Set([
    ...state.progressByDate[todayDateKey].completedStretchIds,
    ...result.completedStretchIds,
  ]);
  state.progressByDate[todayDateKey].completedStretchIds = [...merged];
  state.guidedSession = result.nextSession ? { ...result.nextSession, isRunning: true } : null;
  persistAndRender();
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

function formatTimer(totalSec) {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${`${sec}`.padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
