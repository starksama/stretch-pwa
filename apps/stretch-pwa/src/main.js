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
  rewindGuidedStep,
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
let pendingRoutineDeleteId = null;
let pendingHistoryClear = false;
let pendingGuidedEndConfirm = false;
let activeTab = 'today';
const APP_TABS = ['today', 'guided', 'routines', 'history', 'settings'];
let isGuidedTicking = false;
let renderCount = 0;
let renderDuringGuidedTicks = 0;

const I18N = {
  en: {
    today: 'Today',
    guided: 'Guided',
    routines: 'Routines',
    history: 'History',
    settings: 'Settings',
    dailyPlan: 'Daily Plan',
    doneCount: '{done}/{total} done',
    completeAll: 'Complete all',
    resetDay: 'Reset day',
    weeklyConsistency: 'Weekly Consistency',
    weeklyGoal: 'Weekly goal',
    daysLabel: '{done}/{goal} days',
    goalReached: 'Goal reached',
    goalReachedMsg: 'Weekly target achieved. Keep the streak alive.',
    guidedSession: 'Guided Session',
    startGuided: 'Start guided session',
    running: 'Running',
    paused: 'Paused',
    finishNow: 'Finish now',
    confirmFinish: 'Confirm finish',
    cancel: 'Cancel',
    skip: 'Skip',
    resume: 'Resume',
    pause: 'Pause',
    nextUp: 'Next: {name}',
    noNext: 'Final step',
    routinesTitle: 'Build Routine',
    routinesSubtitle: 'Save reusable stretch combos',
    editRoutine: 'Edit Routine',
    updateRoutine: 'Update and save changes',
    saveRoutine: 'Save routine',
    saveChanges: 'Save changes',
    cancelEdit: 'Cancel edit',
    duplicate: 'Duplicate',
    delete: 'Delete',
    confirmDelete: 'Confirm delete',
    start: 'Start',
    recentSessions: 'Recent Sessions',
    noSessions: 'No sessions yet',
    clearHistory: 'Clear history',
    confirmClear: 'Confirm clear',
    settingsTitle: 'Settings',
    language: 'Language',
    cues: 'Session Cues',
    cueType: 'Cue type',
    testCue: 'Test cue',
    healthSync: 'Health Sync (Preview)',
    recoveryReset: 'Recovery Reset',
    tabHint: 'Quick switch across key flows',
    onTrack: 'On track: {done}/{goal} days',
    nextPreview: 'Next: {name}',
    appTitle: 'Stretch Flow',
    streakLabel: 'Streak',
    eachSide: 'each side',
    mark: 'Mark',
    done: 'Done',
    nameLabel: 'Name',
    namePlaceholder: 'Example: Desk Reset',
    selectStretches: 'Select stretches',
    sessionFlow: '{minutes} min flow',
    guidedDescription: 'Hands-free timer with smooth step transitions.',
    stretchProgress: 'Stretch {index}/{total} · {completed}/{total} complete',
    minus10: '-10s',
    plus10: '+10s',
    momentumProtected: 'Momentum protected',
    noMissedDay: 'No missed day detected. Keep your rhythm.',
    restartMinutes: '{minutes} min restart',
    missedYesterdayDesc: 'Yesterday was missed. Run this short sequence to restart consistency.',
    historyLast: 'Last {count}',
    historyPopulate: 'Complete a guided flow to populate your recent history.',
    sessionFallback: 'Session',
    endedFallback: 'ended',
    unknownTime: 'Unknown time',
    cueFeedback: 'Feedback on stretch transitions',
    cueCurrent: 'Current mode: {mode}',
    cueTestPlayed: 'Cue test played ({mode}).',
    cueOff: 'Off',
    cueVibration: 'Vibration',
    cueSound: 'Sound',
    cueBoth: 'Vibration + Sound',
    syncPreviewDesc: 'Scaffold only. External API hooks are TODO-marked.',
    enableSyncScaffold: 'Enable sync scaffold',
    runDrySync: 'Run dry sync',
    noSyncYet: 'No sync run yet.',
    scaffoldEnabled: 'Scaffold enabled.',
    scaffoldDisabled: 'Scaffold disabled.',
    runningDrySync: 'Running dry sync...',
    syncSuccess: 'Sync success.',
    enableSyncFirst: 'Enable sync scaffold first.',
    syncSkipped: 'Dry sync skipped ({reason}).',
    routineUpdated: 'Routine updated.',
    routineSaved: 'Routine saved.',
    recoveryLabel: 'Recovery Reset',
    dailyPlanLabel: 'Daily Plan',
    routinePrefix: 'Routine: {name}',
    manualStop: 'manual stop',
    completed: 'completed',
    languageEnglish: 'English',
    languageTraditionalChinese: 'Traditional Chinese',
    activeSession: 'Active Session',
    returnGuided: 'Open Guided',
    currentStep: 'Current: {name}',
    undoStep: 'Undo Last',
  },
  'zh-TW': {
    today: '今日',
    guided: '引導',
    routines: '自訂課表',
    history: '紀錄',
    settings: '設定',
    dailyPlan: '今日計畫',
    doneCount: '已完成 {done}/{total}',
    completeAll: '全部完成',
    resetDay: '重置今日',
    weeklyConsistency: '本週一致性',
    weeklyGoal: '每週目標',
    daysLabel: '{done}/{goal} 天',
    goalReached: '已達成目標',
    goalReachedMsg: '本週目標已達成，保持連續！',
    guidedSession: '引導模式',
    startGuided: '開始引導',
    running: '進行中',
    paused: '已暫停',
    finishNow: '立即結束',
    confirmFinish: '確認結束',
    cancel: '取消',
    skip: '跳過',
    resume: '繼續',
    pause: '暫停',
    nextUp: '下一個：{name}',
    noNext: '最後一步',
    routinesTitle: '建立課表',
    routinesSubtitle: '儲存常用伸展組合',
    editRoutine: '編輯課表',
    updateRoutine: '更新並儲存',
    saveRoutine: '儲存課表',
    saveChanges: '儲存變更',
    cancelEdit: '取消編輯',
    duplicate: '複製',
    delete: '刪除',
    confirmDelete: '確認刪除',
    start: '開始',
    recentSessions: '最近紀錄',
    noSessions: '目前沒有紀錄',
    clearHistory: '清除紀錄',
    confirmClear: '確認清除',
    settingsTitle: '設定',
    language: '語言',
    cues: '提示回饋',
    cueType: '提示類型',
    testCue: '測試提示',
    healthSync: '健康同步（預覽）',
    recoveryReset: '恢復重啟',
    tabHint: '快速切換主要功能',
    onTrack: '本週進度 {done}/{goal}',
    nextPreview: '下一步：{name}',
    appTitle: 'Stretch Flow',
    streakLabel: '連續天數',
    eachSide: '每側',
    mark: '標記',
    done: '完成',
    nameLabel: '名稱',
    namePlaceholder: '例如：辦公桌重置',
    selectStretches: '選擇動作',
    sessionFlow: '{minutes} 分鐘流程',
    guidedDescription: '免手動計時，平滑切換每個動作。',
    stretchProgress: '動作 {index}/{total} · 已完成 {completed}/{total}',
    minus10: '-10秒',
    plus10: '+10秒',
    momentumProtected: '節奏已維持',
    noMissedDay: '昨天沒有漏掉訓練，維持目前節奏。',
    restartMinutes: '{minutes} 分鐘重啟',
    missedYesterdayDesc: '昨天中斷了，先完成這組短流程重啟習慣。',
    historyLast: '最近 {count} 次',
    historyPopulate: '完成一次引導流程後，這裡會顯示最近紀錄。',
    sessionFallback: '訓練',
    endedFallback: '結束',
    unknownTime: '時間未知',
    cueFeedback: '動作切換時的提示回饋',
    cueCurrent: '目前模式：{mode}',
    cueTestPlayed: '已播放提示（{mode}）。',
    cueOff: '關閉',
    cueVibration: '震動',
    cueSound: '聲音',
    cueBoth: '震動 + 聲音',
    syncPreviewDesc: '僅提供整合骨架，外部 API 連接待完成。',
    enableSyncScaffold: '啟用同步骨架',
    runDrySync: '執行模擬同步',
    noSyncYet: '尚未執行同步。',
    scaffoldEnabled: '已啟用同步骨架。',
    scaffoldDisabled: '已停用同步骨架。',
    runningDrySync: '正在執行模擬同步...',
    syncSuccess: '同步成功。',
    enableSyncFirst: '請先啟用同步骨架。',
    syncSkipped: '已略過模擬同步（{reason}）。',
    routineUpdated: '課表已更新。',
    routineSaved: '課表已儲存。',
    recoveryLabel: '恢復重啟',
    dailyPlanLabel: '每日計畫',
    routinePrefix: '課表：{name}',
    manualStop: '手動停止',
    completed: '完成',
    languageEnglish: '英文',
    languageTraditionalChinese: '繁體中文',
    activeSession: '進行中流程',
    returnGuided: '開啟引導',
    currentStep: '目前：{name}',
    undoStep: '上一步',
  },
};

function currentLanguage() {
  return state.settings.language === 'zh-TW' ? 'zh-TW' : 'en';
}

function t(key, vars = {}) {
  const lang = currentLanguage();
  const source = I18N[lang] || I18N.en;
  const fallback = I18N.en[key] || key;
  let value = source[key] || fallback;
  Object.entries(vars).forEach(([k, v]) => {
    value = value.split(`{${k}}`).join(String(v));
  });
  return value;
}

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
    if (APP_TABS.includes(state.settings.lastTab)) {
      activeTab = state.settings.lastTab;
    }

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
  renderCount += 1;
  if (isGuidedTicking) {
    renderDuringGuidedTicks += 1;
  }
  exposeDebugCounters();
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

  const tabButton = (tabId, label) =>
    `<button class="tab-btn ${activeTab === tabId ? 'active' : ''}" data-action="switch-tab" data-tab="${tabId}">${label}</button>`;

  const todaySection = `
    <section class="hero card enter-up">
      <div>
        <p class="eyebrow">${t('today')} • ${plan.dateKey}</p>
        <h1>${t('appTitle')}</h1>
        <p class="muted">${capitalize(plan.focus)} · ${Math.ceil(plan.totalSeconds / 60)} min</p>
      </div>
      <img src="./assets/illustration-stretch.svg" class="hero-art" alt="Abstract stretching illustration" />
    </section>

    <section class="card enter-up delay-2">
      <header class="section-head">
        <h2>${t('dailyPlan')}</h2>
        <p class="muted">${t('doneCount', { done: completedCount, total: plan.stretches.length })}</p>
      </header>
      <div class="today-inline-stats">
        <p><strong>${Math.round(completionRatio * 100)}%</strong> ${t('dailyPlan')}</p>
        <p><strong>${streak}</strong> ${t('streakLabel')}</p>
      </div>
      <div class="guided-actions top-gap">
        <button class="primary-btn" id="today-start-guided">${t('startGuided')}</button>
        <button class="ghost-btn" data-action="switch-tab" data-tab="routines">${t('routines')}</button>
      </div>
      <p class="muted top-gap">${plan.stretches.length} stretches are ready in Guided mode.</p>
    </section>
  `;

  const routinesSection = `
    <section class="card enter-up delay-3">
      <header class="section-head">
        <h2>${editingRoutine ? t('editRoutine') : t('routinesTitle')}</h2>
        <p class="muted">${editingRoutine ? t('updateRoutine') : t('routinesSubtitle')}</p>
      </header>
      <form id="routine-form" class="routine-form">
        <label>
          ${t('nameLabel')}
          <input name="name" maxlength="40" placeholder="${t('namePlaceholder')}" value="${escapeHtml(editingRoutine?.name || '')}" required />
        </label>
        <fieldset>
          <legend>${t('selectStretches')}</legend>
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
        <button type="submit" class="primary-btn">${editingRoutine ? t('saveChanges') : t('saveRoutine')}</button>
        ${editingRoutine ? `<button type="button" class="ghost-btn" id="routine-cancel">${t('cancelEdit')}</button>` : ''}
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
              <button class="ghost-btn" data-action="start-routine" data-id="${routine.id}">${t('start')}</button>
              <button class="ghost-btn" data-action="duplicate-routine" data-id="${routine.id}">${t('duplicate')}</button>
              <button class="ghost-btn" data-action="edit-routine" data-id="${routine.id}">${t('editRoutine')}</button>
              ${
                pendingRoutineDeleteId === routine.id
                  ? `
              <button class="ghost-btn danger-btn" data-action="confirm-delete-routine" data-id="${routine.id}">${t('confirmDelete')}</button>
              <button class="ghost-btn" data-action="cancel-delete-routine" data-id="${routine.id}">${t('cancel')}</button>
              `
                  : `<button class="ghost-btn danger-btn" data-action="delete-routine" data-id="${routine.id}">${t('delete')}</button>`
              }
            </div>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>
  `;

  let activeView = '';
  if (activeTab === 'today') activeView = todaySection;
  if (activeTab === 'guided') activeView = renderGuidedSessionCard(guidedProgress);
  if (activeTab === 'routines') activeView = routinesSection;
  if (activeTab === 'history') activeView = renderSessionHistoryCard();
  if (activeTab === 'settings') {
    activeView = `${renderSessionCueCard()} ${featureFlags.healthSyncScaffold ? renderIntegrationCard() : ''}`;
  }

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="app-topbar">
        <div class="app-topbar-copy">
          <h2>${t('appTitle')}</h2>
          <p class="muted">${t('tabHint')}</p>
        </div>
        <label class="stack-field lang-switch">
          ${t('language')}
          <select id="language-select">
            <option value="en" ${currentLanguage() === 'en' ? 'selected' : ''}>${t('languageEnglish')}</option>
            <option value="zh-TW" ${currentLanguage() === 'zh-TW' ? 'selected' : ''}>${t('languageTraditionalChinese')}</option>
          </select>
        </label>
      </header>

      <section class="app-view" data-active-tab="${activeTab}">
        ${activeView}
        ${activeTab !== 'guided' ? renderGuidedDock(guidedProgress) : ''}
      </section>

      <nav class="tab-nav app-tabbar">
        ${tabButton('today', t('today'))}
        ${tabButton('guided', t('guided'))}
        ${tabButton('routines', t('routines'))}
        ${tabButton('history', t('history'))}
        ${tabButton('settings', t('settings'))}
      </nav>
    </div>
  `;

  bindEvents();
}

function renderIntegrationCard() {
  return `
    <section class="card enter-up delay-3">
      <header class="section-head">
        <h2>${t('healthSync')}</h2>
        <p class="muted">${t('syncPreviewDesc')}</p>
      </header>
      <div class="integration-actions">
        <label class="switch-row">
          <span>${t('enableSyncScaffold')}</span>
          <input type="checkbox" id="sync-enabled" ${state.settings.healthSyncEnabled ? 'checked' : ''} />
        </label>
        <button class="ghost-btn" id="sync-now">${t('runDrySync')}</button>
        <p class="muted" id="sync-msg">${t('noSyncYet')}</p>
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
          <h2>${t('guidedSession')}</h2>
          <p class="muted">${t('sessionFlow', { minutes: totalMinutes })}</p>
        </header>
        <p class="muted">${t('guidedDescription')}</p>
        <button class="primary-btn" id="guided-start">${t('startGuided')}</button>
      </section>
    `;
  }

  const sessionPercent = Math.round(guidedProgress * 100);
  const stretchPercent = Math.round(((activeStretch.durationSec - session.remainingSec) / activeStretch.durationSec) * 100);
  const statusLabel = session.isRunning ? t('running') : t('paused');
  const nextStretch = stretchById[session.stretchIds[session.currentIndex + 1]];
  const nextLabel = nextStretch ? t('nextPreview', { name: nextStretch.name }) : t('noNext');

  return `
    <section class="card guided-card enter-up delay-2">
      <header class="section-head">
        <h2>${t('guidedSession')}</h2>
        <p class="muted" data-guided-status>${escapeHtml(session.sourceLabel)} · ${statusLabel}</p>
      </header>
      <p class="guided-title" data-guided-title>${escapeHtml(activeStretch.name)}</p>
      <p class="guided-time" data-guided-time>${formatTimer(session.remainingSec)}</p>
      <p class="muted" data-guided-step>${t('stretchProgress', { index: session.currentIndex + 1, total: totalStretches, completed })}</p>
      <p class="muted" data-guided-next>${escapeHtml(nextLabel)}</p>
      <div class="progress-track" aria-hidden="true">
        <span data-guided-stretch-track style="width:${Math.max(0, Math.min(stretchPercent, 100))}%"></span>
      </div>
      <div class="progress-track whole" aria-hidden="true">
        <span data-guided-session-track style="width:${sessionPercent}%"></span>
      </div>
      <div class="guided-actions">
        <button class="ghost-btn" id="guided-minus">${t('minus10')}</button>
        <button class="ghost-btn" id="guided-plus">${t('plus10')}</button>
        <button class="ghost-btn" id="guided-toggle">${session.isRunning ? t('pause') : t('resume')}</button>
        <button class="ghost-btn" id="guided-undo">${t('undoStep')}</button>
        <button class="ghost-btn" id="guided-skip">${t('skip')}</button>
        ${
          pendingGuidedEndConfirm
            ? `
        <button class="ghost-btn danger-btn" id="guided-end-confirm">${t('confirmFinish')}</button>
        <button class="ghost-btn" id="guided-end-cancel">${t('cancel')}</button>
        `
            : `<button class="ghost-btn" id="guided-end">${t('finishNow')}</button>`
        }
      </div>
    </section>
  `;
}

function renderGuidedDock(guidedProgress) {
  const session = state.guidedSession;
  if (!session) return '';
  const activeStretch = stretchById[session.stretchIds[session.currentIndex]];
  if (!activeStretch) return '';
  const statusLabel = session.isRunning ? t('running') : t('paused');

  return `
    <section class="card guided-dock enter-up delay-2">
      <header class="section-head">
        <h2>${t('activeSession')}</h2>
        <p class="muted" data-dock-status>${statusLabel}</p>
      </header>
      <p class="muted" data-dock-step>${t('currentStep', { name: activeStretch.name })}</p>
      <p class="guided-time mini" data-dock-time>${formatTimer(session.remainingSec)}</p>
      <div class="progress-track" aria-hidden="true">
        <span data-dock-track style="width:${Math.round(guidedProgress * 100)}%"></span>
      </div>
      <div class="guided-actions">
        <button class="ghost-btn" id="dock-open-guided">${t('returnGuided')}</button>
        <button class="ghost-btn" id="dock-toggle-guided">${session.isRunning ? t('pause') : t('resume')}</button>
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
          <h2>${t('recoveryReset')}</h2>
          <p class="muted">${t('momentumProtected')}</p>
        </header>
        <p class="muted">${t('noMissedDay')}</p>
      </section>
    `;
  }

  return `
    <section class="card enter-up delay-2">
      <header class="section-head">
        <h2>${t('recoveryReset')}</h2>
        <p class="muted">${t('restartMinutes', { minutes: recoveryMinutes })}</p>
      </header>
      <p class="muted">${t('missedYesterdayDesc')}</p>
      <p class="muted">${recoveryPlan.map((item) => escapeHtml(item.name)).join(' · ')}</p>
      <button class="primary-btn" id="recovery-start">${t('startGuided')}</button>
    </section>
  `;
}

function renderSessionHistoryCard() {
  const history = (state.sessionHistory || []).slice(0, 5);
  if (!history.length) {
    return `
      <section class="card enter-up delay-2">
        <header class="section-head">
          <h2>${t('recentSessions')}</h2>
          <p class="muted">${t('noSessions')}</p>
        </header>
        <p class="muted">${t('historyPopulate')}</p>
      </section>
    `;
  }

  return `
    <section class="card enter-up delay-2">
      <header class="section-head">
        <div class="stack-head">
          <h2>${t('recentSessions')}</h2>
          <p class="muted">${t('historyLast', { count: history.length })}</p>
        </div>
        <div class="inline-actions">
          ${
            pendingHistoryClear
              ? `
          <button class="ghost-btn danger-btn" id="history-clear-confirm">${t('confirmClear')}</button>
          <button class="ghost-btn" id="history-clear-cancel">${t('cancel')}</button>
          `
              : `<button class="ghost-btn" id="history-clear">${t('clearHistory')}</button>`
          }
        </div>
      </header>
      <ul class="history-list">
        ${history
          .map(
            (entry) => `
          <li>
            <strong>${escapeHtml(entry.sourceLabel || t('sessionFallback'))}</strong>
            <small>${entry.completed || 0}/${entry.total || 0} · ${escapeHtml(entry.endedReason || t('endedFallback'))} · ${formatDateTime(entry.endedAt)}</small>
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
        <h2>${t('cues')}</h2>
        <p class="muted">${t('cueFeedback')}</p>
      </header>
      <label class="stack-field">
        ${t('cueType')}
        <select id="cue-mode">
          <option value="off" ${cueMode === 'off' ? 'selected' : ''}>${t('cueOff')}</option>
          <option value="vibration" ${cueMode === 'vibration' ? 'selected' : ''}>${t('cueVibration')}</option>
          <option value="sound" ${cueMode === 'sound' ? 'selected' : ''}>${t('cueSound')}</option>
          <option value="both" ${cueMode === 'both' ? 'selected' : ''}>${t('cueBoth')}</option>
        </select>
      </label>
      <button class="ghost-btn" id="cue-test">${t('testCue')}</button>
      <p class="muted" id="cue-msg">${t('cueCurrent', { mode: escapeHtml(cueMode) })}</p>
    </section>
  `;
}

function bindEvents() {
  appRoot.querySelectorAll('[data-action="switch-tab"]').forEach((button) => {
    button.addEventListener('click', () => {
      const { tab } = button.dataset;
      if (!APP_TABS.includes(tab)) return;
      activeTab = tab;
      state.settings.lastTab = tab;
      saveState(state);
      persistAndRender();
    });
  });

  const languageSelect = appRoot.querySelector('#language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      state.settings.language = languageSelect.value === 'zh-TW' ? 'zh-TW' : 'en';
      saveState(state);
      persistAndRender();
    });
  }

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
        sourceLabel: t('recoveryLabel'),
        stretchIds: recoveryPlan.map((item) => item.id),
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      pendingGuidedEndConfirm = false;
      if (activeTab !== 'guided') {
        activeTab = 'guided';
        state.settings.lastTab = 'guided';
      }
      persistAndRender();
    });
  }

  const guidedStart = appRoot.querySelector('#guided-start');
  const todayStartGuided = appRoot.querySelector('#today-start-guided');
  if (todayStartGuided) {
    todayStartGuided.addEventListener('click', () => {
      const nextSession = createGuidedSession({
        sessionId: plan.id,
        dateKey: todayDateKey,
        sourceLabel: t('dailyPlanLabel'),
        stretchIds: plan.stretches.map((stretch) => stretch.id),
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      activeTab = 'guided';
      state.settings.lastTab = 'guided';
      persistAndRender();
    });
  }

  if (guidedStart) {
    guidedStart.addEventListener('click', () => {
      const nextSession = createGuidedSession({
        sessionId: plan.id,
        dateKey: todayDateKey,
        sourceLabel: t('dailyPlanLabel'),
        stretchIds: plan.stretches.map((stretch) => stretch.id),
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      state.guidedSession = { ...nextSession, isRunning: true };
      if (activeTab !== 'guided') {
        activeTab = 'guided';
        state.settings.lastTab = 'guided';
      }
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
        sourceLabel: t('routinePrefix', { name: routine.name }),
        stretchIds: routine.stretchIds,
        completedStretchIds: state.progressByDate[todayDateKey].completedStretchIds,
        stretchById,
      });
      if (!nextSession) return;
      pendingRoutineDeleteId = null;
      state.guidedSession = { ...nextSession, isRunning: true };
      pendingGuidedEndConfirm = false;
      if (activeTab !== 'guided') {
        activeTab = 'guided';
        state.settings.lastTab = 'guided';
      }
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="duplicate-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      const routine = state.customRoutines.find((item) => item.id === routineId);
      if (!routine) return;

      const suffix = ' Copy';
      const baseAllowed = 40 - suffix.length;
      const base = routine.name.trim().slice(0, baseAllowed);
      const duplicateName = `${base}${suffix}`;
      state.customRoutines = [
        createRoutine(duplicateName, routine.stretchIds),
        ...state.customRoutines,
      ];
      pendingRoutineDeleteId = null;
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="edit-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      const routine = state.customRoutines.find((item) => item.id === routineId);
      if (!routine) return;
      routineEditorId = routine.id;
      pendingRoutineDeleteId = null;
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="delete-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      pendingRoutineDeleteId = button.dataset.id;
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="cancel-delete-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      if (pendingRoutineDeleteId !== button.dataset.id) return;
      pendingRoutineDeleteId = null;
      persistAndRender();
    });
  });

  appRoot.querySelectorAll('[data-action="confirm-delete-routine"]').forEach((button) => {
    button.addEventListener('click', () => {
      const routineId = button.dataset.id;
      state.customRoutines = state.customRoutines.filter((routine) => routine.id !== routineId);
      if (routineEditorId === routineId) {
        routineEditorId = null;
      }
      pendingRoutineDeleteId = null;
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

  const dockOpenGuided = appRoot.querySelector('#dock-open-guided');
  if (dockOpenGuided) {
    dockOpenGuided.addEventListener('click', () => {
      activeTab = 'guided';
      state.settings.lastTab = 'guided';
      saveState(state);
      persistAndRender();
    });
  }

  const dockToggleGuided = appRoot.querySelector('#dock-toggle-guided');
  if (dockToggleGuided) {
    dockToggleGuided.addEventListener('click', () => {
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

  const guidedUndo = appRoot.querySelector('#guided-undo');
  if (guidedUndo) {
    guidedUndo.addEventListener('click', () => {
      undoGuidedStep();
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
      pendingGuidedEndConfirm = true;
      persistAndRender();
    });
  }

  const guidedEndCancel = appRoot.querySelector('#guided-end-cancel');
  if (guidedEndCancel) {
    guidedEndCancel.addEventListener('click', () => {
      pendingGuidedEndConfirm = false;
      persistAndRender();
    });
  }

  const guidedEndConfirm = appRoot.querySelector('#guided-end-confirm');
  if (guidedEndConfirm) {
    guidedEndConfirm.addEventListener('click', () => {
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
        endedReason: t('manualStop'),
      });
      pendingGuidedEndConfirm = false;
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
        msgEl.textContent = t('routineUpdated');
        routineEditorId = null;
      } else {
        state.customRoutines = [createRoutine(name, selected), ...state.customRoutines];
        msgEl.textContent = t('routineSaved');
      }
      pendingRoutineDeleteId = null;

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
  const historyClear = appRoot.querySelector('#history-clear');
  const historyClearConfirm = appRoot.querySelector('#history-clear-confirm');
  const historyClearCancel = appRoot.querySelector('#history-clear-cancel');

  if (syncToggle) {
    syncToggle.addEventListener('change', () => {
      state.settings.healthSyncEnabled = syncToggle.checked;
      saveState(state);
      if (syncMsg) syncMsg.textContent = syncToggle.checked ? t('scaffoldEnabled') : t('scaffoldDisabled');
    });
  }

  if (syncButton && syncMsg) {
    syncButton.addEventListener('click', async () => {
      syncMsg.textContent = t('runningDrySync');
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
        syncMsg.textContent = t('syncSuccess');
      } else if (result.reason === 'feature_flag_disabled') {
        syncMsg.textContent = t('enableSyncFirst');
      } else {
        syncMsg.textContent = t('syncSkipped', { reason: result.reason });
      }
    });
  }

  if (cueMode) {
    cueMode.addEventListener('change', () => {
      state.settings.cueMode = cueMode.value;
      saveState(state);
      if (cueMsg) cueMsg.textContent = t('cueCurrent', { mode: cueMode.value });
    });
  }

  if (cueTest) {
    cueTest.addEventListener('click', () => {
      playCompletionCue(state.settings.cueMode);
      if (cueMsg) cueMsg.textContent = t('cueTestPlayed', { mode: state.settings.cueMode });
    });
  }

  if (weeklyGoal) {
    weeklyGoal.addEventListener('change', () => {
      state.settings.weeklyGoalDays = Number(weeklyGoal.value);
      saveState(state);
      persistAndRender();
    });
  }

  if (historyClear) {
    historyClear.addEventListener('click', () => {
      pendingHistoryClear = true;
      persistAndRender();
    });
  }

  if (historyClearCancel) {
    historyClearCancel.addEventListener('click', () => {
      pendingHistoryClear = false;
      persistAndRender();
    });
  }

  if (historyClearConfirm) {
    historyClearConfirm.addEventListener('click', () => {
      state.sessionHistory = [];
      pendingHistoryClear = false;
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
    isGuidedTicking = true;
    try {
      state.guidedSession = tickGuidedSession(state.guidedSession);

      if (state.guidedSession.remainingSec <= 0) {
        completeGuidedStep();
        return;
      }

      // Avoid storage writes every second to reduce UI jank.
      if (state.guidedSession.remainingSec % 5 === 0) {
        saveState(state);
      }
      refreshGuidedLiveElements({ tickOnly: true });
    } finally {
      isGuidedTicking = false;
      exposeDebugCounters();
    }
  }, 1000);
}

function refreshGuidedLiveElements({ tickOnly = false } = {}) {
  const session = state.guidedSession;
  if (!session) return;

  const activeStretch = stretchById[session.stretchIds[session.currentIndex]];
  if (!activeStretch) return;

  const nextStretch = stretchById[session.stretchIds[session.currentIndex + 1]];
  const statusEl = appRoot.querySelector('[data-guided-status]');
  const titleEl = appRoot.querySelector('[data-guided-title]');
  const timeEl = appRoot.querySelector('[data-guided-time]');
  const stepEl = appRoot.querySelector('[data-guided-step]');
  const nextEl = appRoot.querySelector('[data-guided-next]');
  const stretchTrack = appRoot.querySelector('[data-guided-stretch-track]');
  const sessionTrack = appRoot.querySelector('[data-guided-session-track]');
  const toggleBtn = appRoot.querySelector('#guided-toggle');
  const dockStatus = appRoot.querySelector('[data-dock-status]');
  const dockStep = appRoot.querySelector('[data-dock-step]');
  const dockTime = appRoot.querySelector('[data-dock-time]');
  const dockTrack = appRoot.querySelector('[data-dock-track]');
  const dockToggleBtn = appRoot.querySelector('#dock-toggle-guided');

  const totalStretches = session.stretchIds.length || plan.stretches.length;
  const completed = session.completedStretchIds.length;
  const statusLabel = session.isRunning ? t('running') : t('paused');
  const nextLabel = nextStretch ? t('nextPreview', { name: nextStretch.name }) : t('noNext');
  const stretchPercent = Math.round(((activeStretch.durationSec - session.remainingSec) / activeStretch.durationSec) * 100);
  const sessionPercent = Math.round(getGuidedSessionProgress(session) * 100);

  if (!tickOnly) {
    setNodeText(statusEl, `${session.sourceLabel} · ${statusLabel}`);
    setNodeText(titleEl, activeStretch.name);
    setNodeText(stepEl, t('stretchProgress', {
      index: session.currentIndex + 1,
      total: totalStretches,
      completed,
    }));
    setNodeText(nextEl, nextLabel);
    if (sessionTrack) sessionTrack.style.width = `${Math.max(0, Math.min(sessionPercent, 100))}%`;
    if (toggleBtn) setNodeText(toggleBtn, session.isRunning ? t('pause') : t('resume'));
    if (dockStatus) setNodeText(dockStatus, statusLabel);
    if (dockStep) setNodeText(dockStep, t('currentStep', { name: activeStretch.name }));
    if (dockTrack) dockTrack.style.width = `${Math.max(0, Math.min(sessionPercent, 100))}%`;
    if (dockToggleBtn) setNodeText(dockToggleBtn, session.isRunning ? t('pause') : t('resume'));
  }

  setNodeText(timeEl, formatTimer(session.remainingSec));
  setNodeText(dockTime, formatTimer(session.remainingSec));
  if (stretchTrack) stretchTrack.style.width = `${Math.max(0, Math.min(stretchPercent, 100))}%`;
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
      endedReason: t('completed'),
    });
  }
  state.guidedSession = result.nextSession ? { ...result.nextSession, isRunning: true } : null;
  persistAndRender();
}

function undoGuidedStep() {
  if (!state.guidedSession) return;
  const rewindId = state.guidedSession.stretchIds[Math.max(state.guidedSession.currentIndex - 1, 0)];
  state.guidedSession = rewindGuidedStep(state.guidedSession, stretchById);
  if (rewindId) {
    state.progressByDate[todayDateKey].completedStretchIds = state.progressByDate[todayDateKey].completedStretchIds.filter(
      (id) => id !== rewindId
    );
  }
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
      const msg = appRoot?.querySelector('#sync-msg');
      if (msg) {
        msg.textContent = 'App update ready. Reopen app when convenient.';
      }
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
  if (Number.isNaN(date.getTime())) return t('unknownTime');
  const locale = currentLanguage() === 'zh-TW' ? 'zh-TW' : 'en-US';
  return date.toLocaleString(locale, {
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
  pendingHistoryClear = false;
  pendingGuidedEndConfirm = false;
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

function setNodeText(element, value) {
  if (!element) return;
  const next = String(value);
  if (
    element.childNodes.length === 1 &&
    element.firstChild &&
    element.firstChild.nodeType === Node.TEXT_NODE
  ) {
    if (element.firstChild.nodeValue !== next) {
      element.firstChild.nodeValue = next;
    }
    return;
  }
  if (element.textContent !== next) {
    element.textContent = next;
  }
}

function exposeDebugCounters() {
  window.__stretchDebug = {
    renderCount,
    renderDuringGuidedTicks,
  };
}
