'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'sxsy-auto-checkin.user.js'), 'utf8');
let scenarioCount = 0;

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
  referrer = '',
  returnEnabled = true,
  successDelay = 0,
  retryAt = [],
  throwOnce = false,
  storageBlocked = false,
  storage = new Map(),
  inspect = () => {}
} = {}) {
  scenarioCount += 1;
  const parsed = new URL(url);
  const navigations = [];
  const navigationTimes = [];
  const logs = [];
  const timers = new Map();
  const pending = new Set();
  const errors = [];
  let now = 0;
  let nextTimer = 0;
  let clicks = 0;
  let retry;
  const body = element(bodyText);
  const button = buttonResult ? element() : null;

  const schedule = (callback, delay, repeat = false) => {
    const id = ++nextTimer;
    timers.set(id, { callback, at: now + delay, delay, repeat });
    return id;
  };
  const observe = (result) => {
    if (!result || typeof result.then !== 'function') return;
    pending.add(result);
    result.then(() => pending.delete(result), (error) => {
      pending.delete(result);
      errors.push(error);
    });
  };
  class ClockDate extends Date {
    static now() { return now; }
  }
  const window = {
    alert() {},
    confirm() { return true; },
    prompt() { return null; },
    setTimeout: schedule
  };
  if (button) {
    button.click = () => {
      clicks += 1;
      if (throwOnce && clicks === 1) throw new Error('click failed');
      const finish = () => {
        if (buttonResult === 'success') Object.assign(body, element('签到成功'));
        if (buttonResult === 'alert-success') window.alert('签到成功');
      };
      if (successDelay) schedule(finish, successDelay);
      else finish();
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
    assign(target) { navigations.push(target); navigationTimes.push(now); },
    replace(target) { navigations.push(target); navigationTimes.push(now); }
  };
  if (returnPage) storage.set('sxsy:auto-checkin:return-page', returnPage);
  const sessionStorage = {
    getItem(key) {
      if (storageBlocked) throw new Error('storage blocked');
      return storage.get(key) ?? null;
    },
    removeItem(key) {
      if (storageBlocked) throw new Error('storage blocked');
      storage.delete(key);
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error('storage blocked');
      storage.set(key, String(value));
    }
  };
  const remoteText = {
    signed: '已签到',
    ranked: '您的签到排名：31641',
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
    if (remoteState === 'network-error') throw new Error('offline');
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
    Date: ClockDate,
    DOMParser,
    Number,
    Promise,
    Set,
    String,
    URL,
    URLSearchParams,
    clearInterval(id) { timers.delete(id); },
    console: { info(...args) { logs.push(args.join(' ')); } },
    document,
    fetch,
    location,
    sessionStorage,
    setInterval(callback, delay) { return schedule(callback, delay, true); },
    unsafeWindow: window,
    window,
    GM_getValue() { return returnEnabled; },
    GM_notification() {},
    GM_registerMenuCommand(label, callback) {
      if (label.includes('retry check-in now')) retry = callback;
    },
    GM_setValue() {}
  }, { filename: 'sxsy-auto-checkin.user.js' });

  for (const at of retryAt) schedule(() => retry(), at);
  // Advance real interval semantics and drain async work before accepting a result.
  for (let count = 0; count < 250; count += 1) {
    await new Promise((resolve) => setImmediate(resolve));
    if (errors.length) throw errors[0];
    if (!timers.size) break;
    const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
    now = timer.at;
    if (timer.repeat) timer.at += timer.delay;
    else timers.delete(id);
    observe(timer.callback());
  }
  assert.equal(timers.size, 0, 'scenario must not leave pending timers');
  assert.equal(pending.size, 0, 'scenario must wait for async runs to finish');
  inspect({ logs, clicks, now, navigationTimes, storage });
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
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到', buttonResult: 'failure',
    inspect(result) {
      assert.equal(result.now, 13200);
      assert(result.logs.some(line => line.includes('Check-in was clicked, but the page did not confirm success')));
      assert.equal(result.storage.size, 0);
    }
  }), []);
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
  assert.deepEqual(await runScenario(signPage, {bodyText: '您的签到排名：31641', referrer: previousPage}), []);
  assert.deepEqual(await runScenario(signPage, {bodyText: '已签到', returnPage: slashSignPage}), []);
  assert.deepEqual(await runScenario(signPage, {bodyText: '已签到', returnPage: 'https://example.com/'}), []);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '已签到', returnPage: previousPage, returnEnabled: false,
    inspect(result) { assert.equal(result.storage.size, 0); }
  }), []);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到', buttonResult: 'success', successDelay: 1000,
    returnPage: previousPage, retryAt: [800, 1300, 2400],
    inspect(result) {
      assert.equal(result.clicks, 1);
      assert.deepEqual(result.navigationTimes, [2700]);
      assert.equal(result.storage.size, 0);
    }
  }), [previousPage]);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到', buttonResult: 'failure', retryAt: [13400],
    inspect(result) {
      assert.equal(result.clicks, 2);
      assert.equal(result.logs.filter(line => line.includes('Check-in was clicked, but the page did not confirm success')).length, 2);
    }
  }), []);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到', buttonResult: 'success', throwOnce: true, retryAt: [1500],
    inspect(result) {
      assert.equal(result.clicks, 2);
      assert(result.logs.some(line => line.includes('Check-in stopped because of an error')));
    }
  }), ['https://sxsy18.com/']);
  assert.deepEqual(await runScenario(signPage, {
    inspect(result) {
      assert.equal(result.now, 12700);
      assert(result.logs.some(line => line.includes('No check-in link found')));
    }
  }), []);
  assert.deepEqual(await runScenario(signPage, {
    bodyText: '您今天还没有签到', buttonResult: 'success', storageBlocked: true, referrer: previousPage
  }), [previousPage]);
  assert.deepEqual(await runScenario(signPage, {bodyText: '已签到', storageBlocked: true}), []);
  for (const remoteState of ['ranked', 'http-error', 'network-error']) {
    assert.deepEqual(await runScenario('https://sxsy18.com/', {remoteState}), []);
  }
  const sharedStorage = new Map();
  assert.deepEqual(await runScenario('https://sxsy18.com/index.php', {storage: sharedStorage}), [signPage]);
  assert.deepEqual(await runScenario(signPage, {
    storage: sharedStorage, bodyText: '您的签到排名：31641'
  }), ['https://sxsy18.com/index.php']);
  assert.equal(sharedStorage.size, 0);
  assert.deepEqual(await runScenario('https://sxsy18.com/index.php', {
    storage: sharedStorage, remoteState: 'signed'
  }), []);
  assert.deepEqual(await runScenario('https://sxsy18.com/index.php', {
    storage: sharedStorage, remoteState: 'unsigned'
  }), [signPage]);
  console.log(`${scenarioCount} userscript regression scenarios passed`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
