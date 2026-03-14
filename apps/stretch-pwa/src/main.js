import { getDateKey, getDailyPlan } from './lib/domain/planner.js';
import { defaultStretchLibrary } from './lib/domain/models.js';
import { buildRecoveryPlan, getYesterdayDateKey } from './lib/domain/recovery.js';
import { getActiveStreak, hasCompletedPlan } from './lib/domain/streaks.js';
import { createRoutine, validateRoutineInput } from './lib/domain/routines.js';
import { getCompletionRate, getRecentCompletionWindow } from './lib/domain/analytics.js';
import {
  clampSessionToLibrary,
  completeCurrentStretch,
  createGuidedSession,
  getGuidedSessionProgress,
  tickGuidedSession,
} from './lib/domain/session.js';
import { clearState, loadState, saveState } from './lib/storage/localStore.js';
import { syncWorkoutSnapshot } from './lib/integrations/index.js';
import { featureFlags } from './config/featureFlags.js';

const appRoot = document.querySelector('#app');
const state = loadState();
const todayDateKey = getDateKey();
const plan = getDailyPlan(todayDateKey, defaultStretchLibrary);
const stretchById = Object.fromEntries(defaultStretchLibrary.map((item) => [item.id, item]));
let guidedTimerId = null;
let routineEditorId = null;
let hasFatalError = false;
let hasSwReloaded = false;

setupGlobalErrorHandling();
bootstrap();

function bootstrap() {
  try {
    if (!state.progressByDate[todayDateKey]) {
      state.progressByDate[todayDateKey] = {
        completedStretchIds: [],
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    state.guidedSession = clampSessionToLibrary(state.guidedSession, stretchById, todayDateKey);

    persistAndRender();
    registerServiceWorker();
  } catch (error) {
    renderFatalError(error);
  }
}

function setupGlobalErrorHandling() {
  window.addEventListener('error', (event) => {
    renderFatalError(event.error || new Error(event.message || 'Unknown runtime error'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    renderFatalError(event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection'));
  });
}

function renderFatalError(error) {
  if (hasFatalError) return;
  hasFatalError = true;
  if (!appRoot) return;
  const message = error?.message ? String(error.message) : 'Unexpected runtime error';
  appRoot.innerHTML = `
    <section class="card">
      <h2>App Recovery</h2>
      <p class="muted">Stretch Flow hit a runtime error and paused rendering.</p>
      <p class="muted">Error: ${escapeHtml(message)}</p>
      <div class="guided-actions">
        <button class="primary-btn" id="fatal-reload">Reload app</button>
        <button class="ghost-btn" id="fatal-reset">Reset local app data</button>
      </div>
    </section>
  `;

  const reloadBtn = appRoot.querySelector('#fatal-reload');
  if (reloadBtn) reloadBtn.addEventListener('click', () => window.location.reload());

  const resetBtn = appRoot.querySelector('#fatal-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearState();
      window.location.reload();
    });
  }
}

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
  } else if (!hasCompletedPlan(todayProgress, plan.stretches.length)) {
    state.completedDates = state.completedDates.filter((dateKey) => dateKey !== todayDateKey);
  }

  state.completedDates = Array.from(new Set(state.completedDates)).sort();
  saveState(state);
  syncGuidedTimer();
  render({ completedCount, completionRatio, guidedProgress: getGuidedSessionProgress(state.guidedSession) });
}

function render({ completedCount, completionRatio, guidedProgress }) {
  const streak = getActiveStreak(state.completedDates, todayDateKey);
  const ringDash = Math.round(completionRatio * 283);
  const yesterdayDateKey = getYesterdayDateKey(todayDateKey);
  const hasHistory = state.completedDates.length > 0;
  const missedYesterday = hasHistory && !state.completedDates.includes(yesterdayDateKey);
  const recoveryPlan = buildRecoveryPlan(defaultStretchLibrary, 3);
  const editingRoutine = routineEditorId
    ? state.customRoutines.find((routine) => routine.id === routineEditorId) || null
    : null;
  const recentWindow = getRecentCompletionWindow({
    todayDateKey,
    completedDates: state.completedDates,
    days: 7,
  });
  const weeklyCompleteDays = recentWindow.filter((day) => day.isComplete).length;
  const parsedWeeklyGoal = Number(state.settings.weeklyGoalDays);
  const weeklyGoalDays = Number.isFinite(parsedWeeklyGoal)
    ? Math.max(3, Math.min(7, parsedWeeklyGoal))
    : 5;
  const weeklyGoalProgress = Math.min(weeklyCompleteDays / weeklyGoalDays, 1);
  const weeklyGoalAchieved = weeklyCompleteDays >= weeklyGoalDays;
  const weeklyRate = getCompletionRate(recentWindow);

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

    <section class="card enter-up delay-1">
      <header class="section-head">
        <h2>Weekly Consistency</h2>
        <p class="muted">${weeklyGoalAchieved ? 'Goal reached' : `${weeklyRate}% complete`}</p>
      </header>
      <div class="weekly-grid" role="img" aria-label="Last 7 days completion">
        ${recentWindow
          .map(
            (day) => `
          <div class="day-chip ${day.isComplete ? 'done' : ''}">
            <span>${escapeHtml(day.dayLabel)}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="goal-row">
        <label class="stack-field goal-field">
          Weekly goal
          <select id="weekly-goal">
            ${[3, 4, 5, 6, 7]
              .map((days) => `<option value="${days}" ${weeklyGoalDays === days ? 'selected' : ''}>${days} days</option>`)
              .join('')}
          </select>
        </label>
        <p class="muted">${weeklyCompleteDays}/${weeklyGoalDays} days</p>
      </div>
      <div class="weekly-goal-track" aria-hidden="true">
        <span style="width:${Math.round(weeklyGoalProgress * 100)}%"></span>
      </div>
      ${weeklyGoalAchieved ? '<p class=\"goal-achieved\">Weekly target achieved. Keep the streak alive.</p>' : ''}
    </section>

    ${renderSessionHistoryCard()}
    ${renderRecoveryCard({ missedYesterday, recoveryPlan })}
    ${renderGuidedSessionCard(guidedProgress)}

    <section class="card enter-up delay-2">
      <header class="section-head">
        <div class="stack-head">
          <h2>Daily Plan</h2>
          <p class="muted">${completedCount}/${plan.stretches.length} done</p>
        </div>
        <div class="inline-actions">
          <button class="ghost-btn" id="daily-complete-all">Complete all</button>
          <button class="ghost-btn" id="daily-reset">Reset day</button>
        </div>
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
        <h2>${editingRoutine ? 'Edit Routine' : 'Build Routine'}</h2>
        <p class="muted">${editingRoutine ? 'Update and save changes' : 'Save reusable stretch combos'}</p>
      </header>
      <form id="routine-form" class="routine-form">
        <label>
          Name
          <input name="name" maxlength="40" placeholder="Example: Desk Reset" value="${escapeHtml(editingRoutine?.name || '')}" required />
        </label>
        <fieldset>
          <legend>Select stretches</legend>
          <div class="choice-grid">
            ${defaultStretchLibrary
              .map(
                (item) => `
              <label class="choice-chip">
                <input type="checkbox" name="stretch" value="${item.id}" ${editingRoutine?.stretchIds?.includes(item.id) ? 'checked' : ''} />
                <span>${escapeHtml(item.name)}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </fieldset>
        <button type="submit" class="primary-btn">${editingRoutine ? 'Save changes' : 'Save routine'}</button>
        ${editingRoutine ? '<button type="button" class="ghost-btn" id="routine-cancel">Cancel edit</button>' : ''}
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
              <button class="ghost-btn" data-action="edit-routine" data-id="${routine.id}">Edit</button>
              <button class="ghost-btn danger-btn" data-action="delete-routine" data-id="${routine.id}">Delete</button>
            </div>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>

    ${renderSessionCueCard()}
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
        <button class="ghost-btn" id="guided-minus">-10s</button>
        <button class="ghost-btn" id="guided-plus">+10s</button>
        <button class="ghost-btn" id="guided-toggle">${session.isRunning ? 'Pause' : 'Resume'}</button>
        <button class="ghost-btn" id="guided-skip">Skip</button>
        <button class="ghost-btn" id="guided-end">Finish now</button>
      </div>
    </section>
  `;
}

function renderRecoveryCard({ missedYesterday, recoveryPlan }) {
  const recoveryMinutes = Math.ceil(recoveryPlan.reduce((sum, item) => sum + item.durationSec, 0) / 60);
  if (!missedYesterday) {
    return `
      <section class="card enter-up delay-2">
        <header class="section-head">
          <h2>Recovery Reset</h2>
          <p class="muted">Momentum protected</p>
        </header>
        <p class="muted">No missed day detected. Keep your current rhythm.</p>
      </section>
    `;
  }

  return `
    <section class="card enter-up delay-2">
      <header class="section-head">
        <h2>Recovery Reset</h2>
        <p class="muted">${recoveryMinutes} min restart</p>
      </header>
      <p class="muted">Yesterday was missed. Run this short sequence to restart consistency.</p>
      <p class="muted">${recoveryPlan.map((item) => escapeHtml(item.name)).join(' · ')}</p>
      <button class="primary-btn" id="recovery-start">Start recovery session</button>
    </section>
  `;
}

function renderSessionHistoryCard() {
  const history = (state.sessionHistory || []).slice(0, 5);
  if (!history.length) {
    return `
      <section class="card enter-up delay-2">
        <header class="section-head">
          <h2>Recent Sessions</h2>
          <p class="muted">No sessions yet</p>
        </header>
        <p class="muted">Complete a guided flow to populate your recent history.</p>
      </section>
    `;
  }

  return `
    <section class="card enter-up delay-2">
      <header class="section-head">
        <h2>Recent Sessions</h2>
        <p class="muted">Last ${history.length}</p>
      </header>
      <ul class="history-list">
        ${history
          .map(
            (entry) => `
          <li>
            <strong>${escapeHtml(entry.sourceLabel || 'Session')}</strong>
            <small>${entry.completed || 0}/${entry.total || 0} · ${escapeHtml(entry.endedReason || 'ended')} · ${formatDateTime(entry.endedAt)}</small>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>
  `;
}

function renderSessionCueCard() {
  const cueMode = state.settings.cueMode || 'vibration';
  return `
    <section class="card enter-up delay-3">
      <header class="section-head">
        <h2>Session Cues</h2>
        <p class="muted">Feedback on stretch transitions</p>
      </header>
      <label class="stack-field">
        Cue type
        <select id="cue-mode">
          <option value="off" ${cueMode === 'off' ? 'selected' : ''}>Off</option>
          <option value="vibration" ${cueMode === 'vibration' ? 'selected' : ''}>Vibration</option>
          <option value="sound" ${cueMode === 'sound' ? 'selected' : ''}>Sound</option>
          <option value="both" ${cueMode === 'both' ? 'selected' : ''}>Vibration + Sound</option>
        </select>
      </label>
      <button class="ghost-btn" id="cue-test">Test cue</button>
      <p class="muted" id="cue-msg">Current mode: ${escapeHtml(cueMode)}</p>
    </section>
  `;
}

function bindEvents() {
  const completeAll = appRoot.querySelector('#daily-complete-all');
  if (completeAll) {
    completeAll.addEventListener('click', () => {
      const merged = new Set([
        ...state.progressByDate[todayDateKey].completedStretchIds,
        ...plan.stretches.map((stretch) => stretch.id),
      ]);
      state.progressByDate[todayDateKey].completedStretchIds = [...merged];
      state.progressByDate[todayDateKey].lastUpdatedAt = new Date().toISOString();
      persistAndRender();
    });
  }

  const resetDay = appRoot.querySelector('#daily-reset');
  if (resetDay) {
    resetDay.addEventListener('click', () => {
      state.progressByDate[todayDateKey].completedStretchIds = [];
      state.progressByDate[todayDateKey].lastUpdatedAt = new Date().toISOString();
      persistAndRender();
    });
  }

  const recoveryStart = appRoot.querySelector('#recovery-start');
  if (recoveryStart) {
    recoveryStart.addEventListener('click', () => {
      const recoveryPlan = buildRecoveryPlan(defaultStretchLibrary, 3);
      const nextSession = createGuidedSession({
        sessionId: `recovery-${todayDateKey}`,
        dateKey: todayDateKey,
        sourceLabel: 'Recovery Reset',
        stretchIds: recoveryPlan.map((item) => item.id),
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      persistAndRender();
    });
  }

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

  appRoot.querySelectorAll('[data-action="edit-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      const routine = state.customRoutines.find((item) => item.id === routineId);
      if (!routine) return;
      routineEditorId = routine.id;
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="delete-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      state.customRoutines = state.customRoutines.filter((routine) => routine.id !== routineId);
      if (routineEditorId === routineId) {
        routineEditorId = null;
      }
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

  const guidedMinus = appRoot.querySelector('#guided-minus');
  if (guidedMinus) {
    guidedMinus.addEventListener('click', () => {
      adjustGuidedTime(-10);
    });
  }

  const guidedPlus = appRoot.querySelector('#guided-plus');
  if (guidedPlus) {
    guidedPlus.addEventListener('click', () => {
      adjustGuidedTime(10);
    });
  }

  const guidedEnd = appRoot.querySelector('#guided-end');
  if (guidedEnd) {
    guidedEnd.addEventListener('click', () => {
      if (!state.guidedSession) return;
      const session = state.guidedSession;
      const merged = new Set([
        ...state.progressByDate[todayDateKey].completedStretchIds,
        ...session.completedStretchIds,
      ]);
      state.progressByDate[todayDateKey].completedStretchIds = [...merged];
      appendSessionHistory({
        sourceLabel: session.sourceLabel,
        completed: session.completedStretchIds.length,
        total: session.stretchIds.length,
        endedReason: 'manual stop',
      });
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

      if (routineEditorId) {
        state.customRoutines = state.customRoutines.map((routine) =>
          routine.id === routineEditorId
            ? {
                ...routine,
                name: name.trim(),
                stretchIds: [...new Set(selected)],
                updatedAt: new Date().toISOString(),
              }
            : routine
        );
        msgEl.textContent = 'Routine updated.';
        routineEditorId = null;
      } else {
        state.customRoutines = [createRoutine(name, selected), ...state.customRoutines];
        msgEl.textContent = 'Routine saved.';
      }

      form.reset();
      persistAndRender();
    });
  }

  const cancelEditBtn = appRoot.querySelector('#routine-cancel');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      routineEditorId = null;
      persistAndRender();
    });
  }

  const syncToggle = appRoot.querySelector('#sync-enabled');
  const syncButton = appRoot.querySelector('#sync-now');
  const syncMsg = appRoot.querySelector('#sync-msg');
  const cueMode = appRoot.querySelector('#cue-mode');
  const cueTest = appRoot.querySelector('#cue-test');
  const cueMsg = appRoot.querySelector('#cue-msg');
  const weeklyGoal = appRoot.querySelector('#weekly-goal');

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

  if (cueMode) {
    cueMode.addEventListener('change', () => {
      state.settings.cueMode = cueMode.value;
      saveState(state);
      if (cueMsg) cueMsg.textContent = `Current mode: ${cueMode.value}`;
    });
  }

  if (cueTest) {
    cueTest.addEventListener('click', () => {
      playCompletionCue(state.settings.cueMode);
      if (cueMsg) cueMsg.textContent = `Cue test played (${state.settings.cueMode}).`;
    });
  }

  if (weeklyGoal) {
    weeklyGoal.addEventListener('change', () => {
      state.settings.weeklyGoalDays = Number(weeklyGoal.value);
      saveState(state);
      persistAndRender();
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

  const previousSession = state.guidedSession;
  const result = completeCurrentStretch(state.guidedSession, stretchById);
  const merged = new Set([
    ...state.progressByDate[todayDateKey].completedStretchIds,
    ...result.completedStretchIds,
  ]);
  state.progressByDate[todayDateKey].completedStretchIds = [...merged];
  playCompletionCue(state.settings.cueMode);
  if (result.finished) {
    appendSessionHistory({
      sourceLabel: previousSession.sourceLabel,
      completed: result.completedStretchIds.length,
      total: previousSession.stretchIds.length,
      endedReason: 'completed',
    });
  }
  state.guidedSession = result.nextSession ? { ...result.nextSession, isRunning: true } : null;
  persistAndRender();
}

function adjustGuidedTime(deltaSec) {
  if (!state.guidedSession) return;
  const currentId = state.guidedSession.stretchIds[state.guidedSession.currentIndex];
  const baseDuration = stretchById[currentId]?.durationSec || 60;
  const maxDuration = Math.max(baseDuration * 3, 180);
  const next = state.guidedSession.remainingSec + deltaSec;
  state.guidedSession.remainingSec = Math.max(5, Math.min(maxDuration, next));
  persistAndRender();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        registration.update().catch(() => {
          // No-op update failure.
        });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // No-op for offline registration failures.
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasSwReloaded) return;
      hasSwReloaded = true;
      window.location.reload();
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

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function appendSessionHistory({ sourceLabel, completed, total, endedReason }) {
  const nextEntry = {
    id: `hist-${Date.now()}`,
    sourceLabel,
    completed,
    total,
    endedReason,
    endedAt: new Date().toISOString(),
  };

  state.sessionHistory = [nextEntry, ...(state.sessionHistory || [])].slice(0, 30);
}

function playCompletionCue(cueMode) {
  if (!cueMode || cueMode === 'off') return;

  if ((cueMode === 'vibration' || cueMode === 'both') && typeof navigator.vibrate === 'function') {
    navigator.vibrate([70, 30, 70]);
  }

  if (cueMode === 'sound' || cueMode === 'both') {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioCtx = new AudioContextCtor();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.045;
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
      oscillator.onended = () => {
        audioCtx.close().catch(() => {
          // No-op cleanup failure.
        });
      };
    } catch {
      // No-op for browsers blocking autoplay/audio context.
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;')
    .split("'")
    .join('&#39;');
}
