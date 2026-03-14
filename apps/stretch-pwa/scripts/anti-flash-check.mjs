import { chromium } from 'playwright';

const target = process.argv[2] || 'http://127.0.0.1:4174';

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
    };
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
    window.__antiFlashTimeStart = document.querySelector('[data-guided-time]')?.textContent || '';
  });

  await page.waitForTimeout(4200);

  const result = await page.evaluate(() => {
    const app = document.querySelector('#app');
    return {
      sameFirst: app.firstElementChild === window.__antiFlashFirst,
      timeStart: window.__antiFlashTimeStart,
      timeEnd: document.querySelector('[data-guided-time]')?.textContent || '',
      mutations: window.__antiFlash,
      debug: window.__stretchDebug || null,
    };
  });

  const pass =
    result.sameFirst &&
    result.mutations.rootChildList === 0 &&
    result.mutations.rootSubtreeChildList === 0 &&
    Number(result.debug?.renderDuringGuidedTicks || 0) === 0;

  console.log(JSON.stringify(result, null, 2));
  if (!pass) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
