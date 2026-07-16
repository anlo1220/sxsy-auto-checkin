// ==UserScript==
// @name         尚香书苑 SXSY Auto Check-in
// @namespace    https://sxsy*.com/
// @version      1.5.2
// @description  尚香书苑 SXSY k_misign daily check-in userscript with already-signed detection and arithmetic prompt solving.
// @author       anlo1220
// @include      https://sxsy*.com/*
// @downloadURL  https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js
// @updateURL    https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SITE_NAME = '尚香书苑';
  const SCRIPT = `${SITE_NAME} SXSY Auto Check-in`;
  const SIGN_PAGE = '/plugin.php?id=k_misign:sign';
  const RETURN_AFTER_SIGN_KEY = 'sxsy:auto-checkin:return-home-after-sign';
  const RETURN_PAGE_KEY = 'sxsy:auto-checkin:return-page';
  const RETURN_AFTER_SIGN_DEFAULT = true;
  const RETURN_AFTER_SIGN_DELAY_MS = 500;
  const WAIT_TIMEOUT_MS = 12000;
  const WAIT_INTERVAL_MS = 500;
  const SIGNED_PHRASES = [
    '\u5df2\u7b7e\u5230',
    '\u5df2\u7c3d\u5230',
    '\u4eca\u65e5\u5df2\u7b7e\u5230',
    '\u4eca\u65e5\u5df2\u7c3d\u5230',
    '\u4eca\u5929\u5df2\u7b7e\u5230',
    '\u4eca\u5929\u5df2\u7c3d\u5230',
    '\u60a8\u4eca\u5929\u5df2\u7b7e\u5230',
    '\u60a8\u4eca\u5929\u5df2\u7c3d\u5230',
    '\u60a8\u7684\u7b7e\u5230\u6392\u540d',
    '\u7b7e\u5230\u6210\u529f',
    '\u7c3d\u5230\u6210\u529f'
  ];
  const UNSIGNED_PHRASES = [
    '\u60a8\u4eca\u5929\u8fd8\u6ca1\u6709\u7b7e\u5230',
    '\u60a8\u4eca\u5929\u9084\u6c92\u6709\u7c3d\u5230',
    '\u8fd8\u6ca1\u6709\u7b7e\u5230',
    '\u9084\u6c92\u6709\u7c3d\u5230'
  ];

  let checkinConfirmed = false;

  installDialogHooks();
  registerMenuCommands();

  function registerMenuCommands() {
    GM_registerMenuCommand('尚香书苑 SXSY: retry check-in now', () => {
      run(true);
    });

    GM_registerMenuCommand(
      `尚香书苑 SXSY: 簽到後${shouldReturnAfterSign() ? '返回前一頁' : '留在簽到頁'} (click to change)`,
      configureReturnAfterSign
    );
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

  function shouldReturnAfterSign() {
    return Boolean(GM_getValue(RETURN_AFTER_SIGN_KEY, RETURN_AFTER_SIGN_DEFAULT));
  }

  function configureReturnAfterSign() {
    const current = shouldReturnAfterSign();
    const enabled = window.confirm(
      `${SITE_NAME} 簽到後要返回前一頁嗎？\n\n` +
      `目前設定：${current ? '簽到後返回前一頁' : '留在簽到頁'}\n\n` +
      '按「確定」= 簽到後返回前一頁\n' +
      '按「取消」= 留在簽到頁'
    );
    GM_setValue(RETURN_AFTER_SIGN_KEY, enabled);
    notify(`簽到後動作：${enabled ? '返回前一頁' : '留在簽到頁'}`);
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

  function installDialogHooks() {
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

    const originalAlert = pageWindow.alert.bind(pageWindow);
    pageWindow.alert = function sxsyAlert(message) {
      const text = String(message || '');
      if (SIGNED_PHRASES.some((phrase) => text.includes(phrase))) checkinConfirmed = true;
      return originalAlert(message);
    };
  }

  function isLoginPage() {
    return /member\.php\?.*mod=logging/.test(location.href) ||
      /action=login/.test(location.href) ||
      document.querySelector('input[name="username"], input[name="password"]');
  }

  function isSignUrl(url) {
    return url.searchParams.get('id') === 'k_misign:sign';
  }

  function isSignPage() {
    return isSignUrl(new URL(location.href));
  }

  function isCheckinActionPage() {
    return isSignPage() &&
      location.search.includes('operation=qiandao') &&
      location.search.includes('format=text');
  }

  function currentScriptName() {
    const parts = location.pathname.split('/');
    return (parts[parts.length - 1] || '').toLowerCase();
  }

  function isAutoStartPage() {
    const scriptName = currentScriptName();
    const mod = (new URLSearchParams(location.search).get('mod') || '').toLowerCase();
    if (!scriptName || scriptName === 'index.php') return true;
    return (scriptName === 'forum.php' || scriptName === 'portal.php') && (!mod || mod === 'index');
  }

  function pageHtml() {
    return document.body ? document.body.innerHTML : '';
  }

  function elementShowsSignedState(element) {
    if (!element) return false;
    const values = [
      element.innerText || element.textContent,
      element.getAttribute && element.getAttribute('alt'),
      element.getAttribute && element.getAttribute('title'),
      element.getAttribute && element.getAttribute('aria-label')
    ].filter(Boolean);
    return SIGNED_PHRASES.some((phrase) => values.some((value) => value.includes(phrase)));
  }

  function documentShowsSignedState(doc) {
    if (elementShowsSignedState(doc.body)) return true;
    return Array.from(doc.querySelectorAll(
      '#fx_checkin_b, #JD_sign, [alt*="签到"], [alt*="簽到"], [title*="签到"], [title*="簽到"], [aria-label*="签到"], [aria-label*="簽到"]'
    )).some(elementShowsSignedState);
  }

  function pageShowsAlreadySigned() {
    if (checkinConfirmed) return true;
    return documentShowsSignedState(document);
  }

  function documentShowsNotSigned(doc) {
    const text = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';
    return UNSIGNED_PHRASES.some((phrase) => text.includes(phrase)) ||
      Boolean(doc.querySelector('#JD_sign[href*="operation=qiandao"][href*="format=text"]'));
  }

  function pageShowsNotSigned() {
    return documentShowsNotSigned(document);
  }

  async function fetchSignPageState() {
    try {
      const response = await fetch(`${location.origin}${SIGN_PAGE}`, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) return 'unknown';

      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (/member\.php\?.*mod=logging|action=login/.test(response.url || '') ||
          doc.querySelector('input[name="username"], input[name="password"]')) return 'login';
      if (documentShowsSignedState(doc)) return 'signed';
      if (documentShowsNotSigned(doc)) return 'unsigned';
    } catch (error) {
      log('Could not inspect the sign-in page in the background.', error);
    }
    return 'unknown';
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

  function waitForSignedState() {
    return new Promise((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        const signed = pageShowsAlreadySigned();
        if (signed || Date.now() - started >= WAIT_TIMEOUT_MS) {
          clearInterval(timer);
          resolve(signed);
        }
      }, WAIT_INTERVAL_MS);
    });
  }

  function goToSignPage() {
    if (isSignPage()) return;
    try {
      sessionStorage.setItem(RETURN_PAGE_KEY, location.href);
    } catch (_) {
      log('Could not remember the return page. Homepage fallback will be used.');
    }
    log(`${SITE_NAME}: opening sign-in plugin page to detect this account's current state.`);
    location.assign(`${location.origin}${SIGN_PAGE}`);
  }

  function takeReturnPage() {
    let stored = '';
    try {
      stored = sessionStorage.getItem(RETURN_PAGE_KEY) || '';
      sessionStorage.removeItem(RETURN_PAGE_KEY);
    } catch (_) {
      log('Could not read the remembered return page.');
    }

    for (const candidate of [stored, document.referrer]) {
      try {
        const url = new URL(candidate);
        if (url.origin === location.origin && !isSignUrl(url)) return url.href;
      } catch (_) {
        // Ignore missing or invalid return URLs.
      }
    }
    return `${location.origin}/`;
  }

  function returnAfterSign() {
    const returnPage = takeReturnPage();
    if (!shouldReturnAfterSign()) {
      log('Return setting is off. Stay on the sign-in page after success.');
      return;
    }

    window.setTimeout(() => {
      log(`${SITE_NAME}: returning to ${returnPage}`);
      location.replace(returnPage);
    }, RETURN_AFTER_SIGN_DELAY_MS);
  }

  function skipClick(reason) {
    log(reason);
  }

  async function run(force = false) {
    if (isLoginPage()) {
      log('Login page detected. Sign in manually first, then open the site again.');
      return;
    }

    if (isCheckinActionPage()) {
      if (pageShowsAlreadySigned()) {
        log('Check-in success response detected.');
        returnAfterSign();
      } else {
        log('Check-in response did not confirm success. Stay on the response page.');
      }
      return;
    }

    if (!isSignPage()) {
      if (!force && !isAutoStartPage()) {
        skipClick('Non-start page detected. Skip automatic sign-in navigation.');
        return;
      }

      if (force) {
        goToSignPage();
        return;
      }

      const signState = await fetchSignPageState();
      if (signState === 'signed') {
        skipClick(`${SITE_NAME}: background check shows already checked in today.`);
        return;
      }
      if (signState === 'login') {
        log('Background check reached the login page. Sign in manually first.');
        return;
      }
      if (signState !== 'unsigned') {
        log('Background check could not determine sign-in state. Stay on the current page.');
        return;
      }

      goToSignPage();
      return;
    }

    if (pageShowsAlreadySigned()) {
      log(`${SITE_NAME}: page shows already checked in today.`);
      returnAfterSign();
      return;
    }

    const button = await waitForButton();
    if (pageShowsAlreadySigned()) {
      log(`${SITE_NAME}: page changed to already checked in.`);
      returnAfterSign();
      return;
    }

    if (!button) {
      if (!hasAnyCheckinLink() && !/operation=qiandao/.test(pageHtml())) {
        skipClick('No check-in link found. Skip clicking.');
      } else {
        log('Check-in button #JD_sign not found within timeout.');
      }
      return;
    }

    if (!force && !pageShowsNotSigned()) {
      log('Current page does not clearly show an unsigned state. Skip clicking.');
      return;
    }

    log('Clicking #JD_sign. Browser prompt will be solved automatically.');
    button.click();
    notify('SXSY check-in clicked.');
    if (await waitForSignedState()) {
      notify('SXSY check-in confirmed.');
      returnAfterSign();
    } else {
      log('Check-in was clicked, but the page did not confirm success. Stay on the sign-in page.');
      notify('SXSY check-in was not confirmed.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(() => run(false), 700), { once: true });
  } else {
    window.setTimeout(() => run(false), 700);
  }
})();
