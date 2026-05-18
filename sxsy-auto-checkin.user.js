// ==UserScript==
// @name         尚香书苑 SXSY Auto Check-in
// @namespace    https://sxsy*.com/
// @version      1.2.2
// @description  尚香书苑 SXSY k_misign daily check-in userscript with already-signed detection and arithmetic prompt solving.
// @author       angus
// @include      https://sxsy*.com/*
// @downloadURL  https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js
// @updateURL    https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const SITE_NAME = '尚香书苑';
  const SCRIPT = `${SITE_NAME} SXSY Auto Check-in`;
  const SIGN_PAGE = '/plugin.php?id=k_misign:sign';
  const WAIT_TIMEOUT_MS = 12000;
  const WAIT_INTERVAL_MS = 500;

  installPromptSolver();

  GM_registerMenuCommand('尚香书苑 SXSY: retry check-in now', () => {
    run(true);
  });

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

  function pageText() {
    return document.body ? document.body.innerText : '';
  }

  function pageHtml() {
    return document.body ? document.body.innerHTML : '';
  }

  function pageShowsAlreadySigned() {
    const signedPhrases = [
      '\u5df2\u7b7e\u5230',
      '\u5df2\u7c3d\u5230',
      '\u4eca\u65e5\u5df2',
      '\u4eca\u5929\u5df2',
      '\u60a8\u4eca\u5929\u5df2',
      '\u60a8\u5df2\u7b7e\u5230',
      '\u60a8\u5df2\u7c3d\u5230'
    ];
    const text = pageText();
    if (signedPhrases.some((phrase) => text.includes(phrase))) return true;

    return ['alt', 'title', 'aria-label'].some((attribute) =>
      signedPhrases.some((phrase) => document.querySelector(`[${attribute}*="${phrase}"]`))
    );
  }

  function pageShowsNotSigned() {
    const unsignedPhrases = [
      '\u60a8\u4eca\u5929\u8fd8\u6ca1\u6709\u7b7e\u5230',
      '\u60a8\u4eca\u5929\u9084\u6c92\u6709\u7c3d\u5230',
      '\u8fd8\u6ca1\u6709\u7b7e\u5230',
      '\u9084\u6c92\u6709\u7c3d\u5230'
    ];
    const text = pageText();
    return unsignedPhrases.some((phrase) => text.includes(phrase));
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
    log(`${SITE_NAME}: opening sign-in plugin page to detect this account's current state.`);
    location.assign(`${location.origin}${SIGN_PAGE}`);
  }

  function skipClick(reason) {
    log(reason);
  }

  async function run(force = false) {
    if (isLoginPage()) {
      log('Login page detected. Sign in manually first, then open the site again.');
      return;
    }

    if (!isSignPage()) {
      if (pageShowsAlreadySigned()) {
        skipClick(`${SITE_NAME}: page shows already checked in today. Skip clicking.`);
        return;
      }

      goToSignPage();
      return;
    }

    if (pageShowsAlreadySigned()) {
      skipClick(`${SITE_NAME}: page shows already checked in today. Skip clicking.`);
      return;
    }

    const button = await waitForButton();
    if (pageShowsAlreadySigned()) {
      skipClick(`${SITE_NAME}: page shows already checked in today. Skip clicking.`);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(() => run(false), 700), { once: true });
  } else {
    window.setTimeout(() => run(false), 700);
  }
})();
