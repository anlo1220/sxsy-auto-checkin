'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'sxsy-auto-checkin.user.js'), 'utf8');

function element(text = '') {
  return {
    textContent: text,
    innerText: text,
    innerHTML: text,
    parentElement: null,
    getAttribute() { return null; }
  };
}

async function runScenario(url, {
  bodyText = '',
  buttonResult = null,
  remoteState = 'unsigned',
  returnPage = '',
  referrer = ''
} = {}) {
  const parsed = new URL(url);
  const navigations = [];
  const queue = [];
  const body = element(bodyText);
  const button = buttonResult ? element() : null;

  const schedule = (callback) => {
    queue.push(callback);
    return queue.length;
  };
  const window = {
    alert() {},
    confirm() { return true; },
    prompt() { return null; },
    setTimeout: schedule
  };
  if (button) {
    button.click = () => {
      if (buttonResult === 'success') {
        body.textContent = '签到成功';
        body.innerText = '签到成功';
        body.innerHTML = '签到成功';
      }
      if (buttonResult === 'alert-success') window.alert('签到成功');
    };
  }
  const document = {
    readyState: 'complete',
    body,
    referrer,
    addEventListener() {},
    querySelector(selector) {
      if (selector === '#JD_sign[href*="operation=qiandao"][href*="format=text"]') return button;
      if (selector === 'a[href*="operation=qiandao"], #fx_checkin_b[src*="mini.gif"]') return button;
      return null;
    },
    querySelectorAll() { return []; }
  };
  const location = {
    href: parsed.href,
    pathname: parsed.pathname,
    search: parsed.search,
    origin: parsed.origin,
    assign(target) { navigations.push(target); },
    replace(target) { navigations.push(target); }
  };
  const storage = new Map(returnPage ? [['sxsy:auto-checkin:return-page', returnPage]] : []);
  const sessionStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    removeItem(key) { storage.delete(key); },
    setItem(key, value) { storage.set(key, String(value)); }
  };
  const remoteText = {
    signed: '已签到',
    unsigned: '您今天还没有签到',
    login: '',
    unknown: ''
  }[remoteState] || '';
  class DOMParser {
    parseFromString() {
      return {
        body: element(remoteText),
        querySelector(selector) {
          if (selector === 'input[name="username"], input[name="password"]') {
            return remoteState === 'login' ? element() : null;
          }
          if (selector === '#JD_sign[href*="operation=qiandao"][href*="format=text"]') {
            return remoteState === 'unsigned' ? element() : null;
          }
          return null;
        },
        querySelectorAll() { return []; }
      };
    }
  }
  async function fetch() {
    return {
      ok: remoteState !== 'http-error',
      url: remoteState === 'login'
        ? 'https://sxsy18.com/member.php?mod=logging'
        : 'https://sxsy18.com/plugin.php?id=k_misign:sign',
      async text() { return remoteText; }
    };
  }

  vm.runInNewContext(source, {
    Array,
    Boolean,
    Date,
    DOMParser,
    Number,
    Promise,
    Set,
    String,
    URL,
    URLSearchParams,
    clearInterval() {},
    console: { info() {} },
    document,
    fetch,
    location,
    sessionStorage,
    setInterval: schedule,
    unsafeWindow: window,
    window,
    GM_getValue(_key, fallback) { return fallback; },
    GM_notification() {},
    GM_registerMenuCommand() {},
    GM_setValue() {}
  }, { filename: 'sxsy-auto-checkin.user.js' });

  for (let count = 0; count < 20; count += 1) {
    if (queue.length) queue.shift()();
    await new Promise((resolve) => setImmediate(resolve));
    if (!queue.length) break;
  }
  return navigations;
}

async function main() {
  const signPage = 'https://sxsy18.com/plugin.php?id=k_misign:sign';
  assert.deepEqual(await runScenario('https://sxsy18.com/'), [signPage]);
  assert.deepEqual(await runScenario('https://sxsy18.com/forum.php'), [signPage]);
  assert.deepEqual(await runScenario('https://sxsy18.com/search.php?mod=forum'), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/forum.php?mod=viewthread&tid=1'), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/forum.php?mod=forumdisplay&fid=2'), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/', { bodyText: '帖子内容：我已签到' }), [signPage]);
  assert.deepEqual(await runScenario('https://sxsy18.com/', { remoteState: 'signed' }), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/', { remoteState: 'unknown' }), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/', { remoteState: 'login' }), []);
  assert.deepEqual(await runScenario(`${signPage}&operation=qiandao&format=text`, { bodyText: '签到成功' }), ['https://sxsy18.com/']);
  assert.deepEqual(await runScenario(`${signPage}&operation=qiandao&format=text`, { bodyText: '验证码错误' }), []);
  assert.deepEqual(await runScenario(signPage, { bodyText: '您今天还没有签到', buttonResult: 'success' }), ['https://sxsy18.com/']);
  assert.deepEqual(await runScenario(signPage, { bodyText: '您今天还没有签到', buttonResult: 'failure' }), []);
  const previousPage = 'https://sxsy18.com/search.php?mod=forum';
  assert.deepEqual(await runScenario(signPage, { bodyText: '已签到', returnPage: previousPage }), [previousPage]);
  assert.deepEqual(await runScenario(signPage, { bodyText: '您的签到排名：31641', returnPage: previousPage }), [previousPage]);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到',
    buttonResult: 'alert-success',
    returnPage: previousPage
  }), [previousPage]);
  const slashSignPage = 'https://sxsy18.com/plugin.php/?id=k_misign:sign';
  assert.deepEqual(await runScenario(slashSignPage, {
    bodyText: '您今天还没有签到',
    buttonResult: 'success',
    returnPage: previousPage
  }), [previousPage]);
  assert.deepEqual(await runScenario(`${signPage}&operation=qiandao&format=text`, {
    bodyText: '签到成功',
    returnPage: slashSignPage
  }), ['https://sxsy18.com/']);
  console.log('userscript regression checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
