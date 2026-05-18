// ==UserScript==
// @name         SXSY Auto Check-in
// @namespace    https://sxsy*.com/
// @version      1.1.0
// @description  Auto-click SXSY k_misign daily check-in and solve the browser arithmetic prompt.
// @author       angus
// @include      https://sxsy*.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT = 'SXSY Auto Check-in';
  const LAST_ATTEMPT_DAY_KEY = 'sxsy:last-attempt-day';
  const SESSION_STARTED_KEY = 'sxsy:auto-checkin-started';
  const SIGN_PAGE = '/plugin.php?id=k_misign:sign';
  const WAIT_TIMEOUT_MS = 12000;
  const WAIT_INTERVAL_MS = 500;

  installPromptSolver();

  GM_registerMenuCommand('SXSY: retry check-in now', () => {
    GM_setValue(LAST_ATTEMPT_DAY_KEY, '');
    sessionStorage.removeItem(SESSION_STARTED_KEY);
    run(true);
  });

  function todayKey() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function log(message, detail) {
    if (detail === undefined) {
      console.info(`[${SCRIPT}] ${message}`);
      return;
    }
    console.info(`[${SCRIPT}] ${message}`, detail);
  }

  function notify(text) {
    try {
      GM_notification({ title: SCRIPT, text, timeout: 4500 });
    } catch (_) {
      log(text);
    }
  }

  function solveArithmeticPrompt(message) {
    const text = String(message || '').replace(/\s+/g, ' ');
    const match = text.match(/(-?\d+)\s*([+\-xX*/])\s*(-?\d+)\s*=/);
    if (!match) return null;

    const left = Number(match[1]);
    const op = match[2];
    const right = Number(match[3]);
    let answer = null;

    if (op === '+') answer = left + right;
    if (op === '-') answer = left - right;
    if (op === 'x' || op === 'X' || op === '*') answer = left * right;
    if (op === '/' && right !== 0) answer = left / right;

    return Number.isFinite(answer) ? String(answer) : null;
  }

  function installPromptSolver() {
    const pageWindow = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
    if (pageWindow.__sxsyPromptSolverInstalled) return;
    pageWindow.__sxsyPromptSolverInstalled = true;

    const originalPrompt = pageWindow.prompt.bind(pageWindow);
    pageWindow.prompt = function sxsyPrompt(message, defaultValue) {
      const answer = solveArithmeticPrompt(message);
      if (answer !== null) {
        log(`Solved sign-in prompt: ${message} -> ${answer}`);
        return answer;
      }
      return originalPrompt(message, defaultValue);
    };
  }

  function isLoginPage() {
    return /member\.php\?.*mod=logging/.test(location.href) ||
      /action=login/.test(location.href) ||
      document.querySelector('input[name="username"], input[name="password"]');
  }

  function isSignPage() {
    return location.pathname.endsWith('/plugin.php') &&
      location.search.includes('id=k_misign:sign');
  }

  function findSignPageButton() {
    return document.querySelector('#JD_sign[href*="operation=qiandao"][href*="format=text"]');
  }

  function hasAnyCheckinLink() {
    return Boolean(document.querySelector('a[href*="operation=qiandao"], #fx_checkin_b[src*="mini.gif"]'));
  }

  function waitForButton() {
    return new Promise((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const button = findSignPageButton();
        if (button || Date.now() - started >= WAIT_TIMEOUT_MS) {
          clearInterval(timer);
          resolve(button);
        }
      }, WAIT_INTERVAL_MS);
    });
  }

  function goToSignPage() {
    if (isSignPage()) return;
    sessionStorage.setItem(SESSION_STARTED_KEY, todayKey());
    location.assign(`${location.origin}${SIGN_PAGE}`);
  }

  async function run(force = false) {
    if (isLoginPage()) {
      log('Login page detected. Sign in manually first, then open the site again.');
      return;
    }

    const today = todayKey();
    if (!force && GM_getValue(LAST_ATTEMPT_DAY_KEY, '') === today) {
      log(`Already attempted today: ${today}`);
      return;
    }

    if (!isSignPage()) {
      if (force || hasAnyCheckinLink() || sessionStorage.getItem(SESSION_STARTED_KEY) === today) {
        goToSignPage();
      }
      return;
    }

    const button = await waitForButton();
    if (!button) {
      if (!hasAnyCheckinLink()) {
        GM_setValue(LAST_ATTEMPT_DAY_KEY, today);
        log('No check-in link found. Treating page as already checked in.');
      } else {
        log('Check-in button #JD_sign not found within timeout.');
      }
      return;
    }

    GM_setValue(LAST_ATTEMPT_DAY_KEY, today);
    log('Clicking #JD_sign. Browser prompt will be solved automatically.');
    button.click();
    notify('SXSY check-in clicked.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(() => run(false), 700), { once: true });
  } else {
    window.setTimeout(() => run(false), 700);
  }
})();
