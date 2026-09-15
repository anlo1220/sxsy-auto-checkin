'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(__dirname, 'sxsy-auto-checkin.user.js'), 'utf8');
const origin = 'https://sxsy-review.invalid';
const signPath = '/plugin.php?id=k_misign:sign';
const initialization = `
  globalThis.GM_getValue = (_key, fallback) => fallback;
  globalThis.GM_setValue = () => {};
  globalThis.GM_notification = () => {};
  globalThis.GM_registerMenuCommand = (label, callback) => {
    if (label.includes('retry check-in now')) globalThis.retryCheckin = callback;
  };
` + source;

async function testInterruptedReturn(browser) {
  const context = await browser.newContext();
  try {
    let signed = false;
    let submissions = 0;
    let returnRequests = 0;
    let cancelledReturns = 0;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, origin);
      if (url.pathname === '/checkin') {
        submissions += 1;
        await new Promise(resolve => setTimeout(resolve, 900));
        signed = true;
        await route.fulfill({contentType: 'text/plain', body: 'ok'});
        return;
      }
      if (signed && url.pathname === '/index.php') {
        returnRequests += 1;
        // Keep the return request in flight past the site's 900 ms reload.
        await new Promise(resolve => setTimeout(resolve, 1600));
      }
      let html = '<p>Home</p>';
      if (url.pathname === '/plugin.php') {
        html = signed ? '<p>您的签到排名：47290</p>' : `
          <p>您今天还没有签到</p>
          <a id="JD_sign" href="${signPath}&operation=qiandao&format=text">签到</a>
          <div id="k_misign_sign_tip"></div>
          <script>
            document.querySelector('#JD_sign').addEventListener('click', async event => {
              event.preventDefault();
              await fetch('/checkin');
              document.querySelector('#k_misign_sign_tip').textContent = '签到成功';
              setTimeout(function(){window.location.reload();}, 900);
            });
          </script>`;
      }
      await route.fulfill({contentType: 'text/html; charset=utf-8', body: '<!doctype html><body>' + html});
    });
    await context.addInitScript({content: initialization});
    const page = await context.newPage();
    page.on('requestfailed', request => {
      if (request.isNavigationRequest() && request.url() === origin + '/index.php') cancelledReturns += 1;
    });
    const finished = page.waitForEvent('console', {
      predicate: message => /background check shows already checked in today|Stay on the manually opened sign-in page/.test(message.text()),
      timeout: 15000
    });
    await page.goto(origin + '/index.php');
    await finished;
    assert.equal(page.url(), origin + '/index.php', 'site reload must not lose the interrupted return destination');
    assert.equal(submissions, 1);
    assert.equal(returnRequests, 2, 'reload must interrupt the first return and resume it once');
    assert.equal(cancelledReturns, 1);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sxsy:auto-checkin:return-page')), null);

    const stayed = page.waitForEvent('console', {
      predicate: message => message.text().includes('Stay on the manually opened sign-in page'), timeout: 5000
    });
    await page.goto(origin + signPath);
    await stayed;
    assert.equal(page.url(), origin + signPath);
    assert.equal(submissions, 1);
    console.log('PASS: site 900 ms reload cancels slow return; source survives; one submission; same-tab manual ranking stays');
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    await testInterruptedReturn(browser);
    const context = await browser.newContext();
    let signed = false;
    let submissions = 0;
    // Every request is served locally; no live website or account is used.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, origin);
      if (url.pathname === '/checkin') {
        assert.equal(url.searchParams.get('answer'), '4');
        submissions += 1;
        await new Promise(resolve => setTimeout(resolve, 650));
        signed = true;
        await route.fulfill({contentType: 'text/plain', body: 'ok'});
        return;
      }
      let html;
      if (url.pathname === '/plugin.php') {
        html = signed ? '<p>您的签到排名：31641</p>' : `
          <p>您今天还没有签到</p>
          <a id="JD_sign" href="${signPath}&operation=qiandao&format=text">签到</a>
          <div hidden>签到成功</div><div style="display:none">已签到</div>
          <template>已签到</template><noscript>已签到</noscript>
          <style>/* 签到成功 */</style>
          <script>
            const successMessage = '签到成功';
            document.querySelector('#JD_sign').addEventListener('click', async event => {
              event.preventDefault();
              const answer = prompt('签到验证：20 - 16 = ?');
              setTimeout(() => retryCheckin(), 50);
              await fetch('/checkin?answer=' + encodeURIComponent(answer));
              alert('签到成功');
              // The site reloads shortly after the success alert.
              setTimeout(() => location.reload(), 150);
            });
          </script>`;
      } else {
        html = signed ? '<p>今日已签</p>' : '<p>首页</p>';
      }
      await route.fulfill({contentType: 'text/html; charset=utf-8', body: '<!doctype html><body>' + html + '</body>'});
    });
    await context.addInitScript({content: initialization});
    const page = await context.newPage();
    const navigations = [];
    const logs = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });
    page.on('console', message => logs.push(message.text()));
    page.on('dialog', dialog => dialog.dismiss());
    const checkedAgain = page.waitForEvent('console', {
      predicate: message => message.text().includes('background check shows already checked in today'),
      timeout: 15000
    });
    await page.goto(origin + '/index.php');
    await checkedAgain;
    assert.equal(submissions, 1);
    assert.equal(page.url(), origin + '/index.php');
    assert.deepEqual(navigations, [origin + '/index.php', origin + signPath, origin + signPath, origin + '/index.php']);
    assert.equal(await page.locator('p').innerText(), '今日已签');
    assert(logs.some(line => line.includes('20 - 16 = ? -> 4')));
    console.log('PASS: inert success text ignored; one submission despite retry; reload returns to source; signed homepage stays');

    const manual = await context.newPage();
    const stayed = manual.waitForEvent('console', {
      predicate: message => message.text().includes('Stay on the manually opened sign-in page'),
      timeout: 5000
    });
    await manual.goto(origin + signPath);
    await stayed;
    assert.equal(manual.url(), origin + signPath);
    assert.equal(await manual.locator('p').innerText(), '您的签到排名：31641');
    assert.equal(submissions, 1);
    console.log('PASS: manually opening the signed ranking page stays there');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
