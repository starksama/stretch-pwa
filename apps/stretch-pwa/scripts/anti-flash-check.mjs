import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4174';
const ticks = Number(process.argv[3] || 12);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
  await page.click('[data-action="switch-tab"][data-tab="guided"]');
  await page.click('#guided-start');

  await page.evaluate(() => {
    const app = document.querySelector('#app');
    window.__antiFlash = {
      rootChildList: 0,
      rootSubtreeChildList: 0,
      charData: 0,
      cls: 0,
    };
    window.__tickTimes = [];
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__antiFlash.cls += entry.value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.target === app) {
          window.__antiFlash.rootChildList += 1;
        }
        if (mutation.type === 'childList') {
          window.__antiFlash.rootSubtreeChildList += 1;
        }
        if (mutation.type === 'characterData') {
          window.__antiFlash.charData += 1;
        }
      }
    });
    observer.observe(app, { childList: true, subtree: true, characterData: true });
    window.__antiFlashFirst = app.firstElementChild;
    const start = document.querySelector('[data-guided-time]')?.textContent || '';
    window.__antiFlashTimeStart = start;
    window.__tickTimes.push(start);
  });

  for (let i = 0; i < ticks; i += 1) {
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const value = document.querySelector('[data-guided-time]')?.textContent || '';
      window.__tickTimes.push(value);
    });
  }

  const result = await page.evaluate(() => {
    const app = document.querySelector('#app');
    return {
      sameFirst: app.firstElementChild === window.__antiFlashFirst,
      timeStart: window.__antiFlashTimeStart,
      timeEnd: document.querySelector('[data-guided-time]')?.textContent || '',
      tickTimes: window.__tickTimes || [],
      mutations: window.__antiFlash,
      debug: window.__stretchDebug || null,
    };
  });

  const pass =
    result.sameFirst &&
    result.mutations.rootChildList === 0 &&
    result.mutations.rootSubtreeChildList === 0 &&
    Number(result.mutations.cls || 0) === 0 &&
    result.tickTimes.length >= ticks + 1 &&
    Number(result.debug?.renderDuringGuidedTicks || 0) === 0;

  console.log(JSON.stringify(result, null, 2));
  if (!pass) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
