# 尚香书苑 SXSY Auto Check-in / 尚香书苑 SXSY 自動簽到油猴腳本

Tampermonkey userscript for 尚香书苑 / SXSY `k_misign` daily check-in. It opens the sign-in plugin page, reads the current account's page state first, clicks the text-format check-in button only when the page is not signed, automatically answers the browser arithmetic prompt, and can return to the homepage after check-in.

尚香书苑 / SXSY `k_misign` 每日簽到用的 Tampermonkey / 油猴腳本。腳本會先讀取目前帳號在網頁上的簽到狀態，確認不是「已签到」後才進入簽到流程，自動回答瀏覽器跳出的算術驗證題，並可選擇簽到後是否跳回首頁。

## Features / 功能

- Matches SXSY mirror domains with `https://sxsy*.com/*`.
- Detects the current web page state first; if the page shows `已签到` / `已簽到`, it skips clicking.
- Does not use `localStorage`, `sessionStorage`, or any stored daily check-in record, so different accounts are handled independently by their actual page state.
- Opens `plugin.php?id=k_misign:sign` to detect the current account's sign-in state from the website before clicking.
- Avoids automatic sign-in navigation on search and other interactive pages, so normal browsing actions are not interrupted.
- Clicks `#JD_sign` with `operation=qiandao&format=text` only when the sign-in page clearly shows an unsigned state.
- Intercepts native `window.prompt()` at `document-start` and solves simple arithmetic prompts such as `8 - 3 = ?`.
- Configurable post-check-in action: return to the homepage by default, or stay on the sign-in page.
- Provides a Tampermonkey menu command for manual retry.

- 使用 `https://sxsy*.com/*` 匹配尚香书苑 / SXSY 鏡像網址。
- 每次開頁都先偵測目前網頁狀態；如果頁面顯示 `已签到` / `已簽到`，就不會再點擊。
- 不使用 `localStorage`、`sessionStorage` 或本地「今日已簽」紀錄，因此多帳號會依各自網頁狀態判斷，不會互相誤擋。
- 自動前往 `plugin.php?id=k_misign:sign`，先從網站上的目前帳號狀態判斷是否已簽到，再決定是否點擊。
- 搜尋頁和其他互動頁不會自動跳到簽到頁，避免打斷正常瀏覽操作。
- 只有簽到頁明確顯示未簽狀態時，才點擊 `#JD_sign` 上的 `operation=qiandao&format=text` 簽到連結。
- 在 `document-start` 先攔截瀏覽器原生 `window.prompt()`，自動解出 `8 - 3 = ?` 這類算術驗證題。
- 可設定簽到後動作：預設跳回首頁，也可以改成留在簽到頁。
- Tampermonkey 選單提供手動重試。

## Install / 安裝

1. Install Tampermonkey in Chrome or another Chromium browser.
2. Open the raw userscript URL:
   <https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js>
3. Tampermonkey should open the install screen. Click **Install**.
4. Disable older generic check-in scripts for SXSY if they also run on the same site.

1. 在 Chrome 或 Chromium 系瀏覽器安裝 Tampermonkey / 油猴。
2. 打開 raw 腳本網址：
   <https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/refs/heads/main/sxsy-auto-checkin.user.js>
3. Tampermonkey 會跳出安裝頁，按 **安裝**。
4. 如果你原本有其他通用簽到腳本也會跑在尚香书苑 / SXSY，建議先停用，避免重複點擊或腳本衝突。

## Usage / 使用方式

1. Log in to a 尚香书苑 / SXSY account manually first.
2. Open any matching SXSY page, for example a home page or forum page.
3. The script checks the page first. If it sees `已签到` / `已簽到`, it stops.
4. If the current page does not show an already-signed state, and it is not a search or interactive page, the script opens the sign-in plugin page and checks that page again before clicking.
5. The site may show a browser prompt like `签到验证：8 - 3 = ?`. The script answers it automatically.
6. By default, the script returns to the homepage about 0.5 seconds after clicking check-in.
7. To change that behavior, open Tampermonkey's menu and run **尚香书苑 SXSY: 簽到後跳回首頁 / 留在簽到頁**.
8. If you need to retry, open Tampermonkey's menu and run **尚香书苑 SXSY: retry check-in now**.

1. 先手動登入尚香书苑 / SXSY 帳號。
2. 打開任一符合 `https://sxsy*.com/*` 的頁面，例如首頁或論壇頁。
3. 腳本會先檢查頁面；如果看到 `已签到` / `已簽到`，就直接停止。
4. 如果目前頁面沒有顯示已簽到，且不是搜尋頁或其他互動頁，腳本會進入尚香书苑簽到插件頁，並在插件頁再次偵測狀態後才點擊。
5. 網站可能會跳出瀏覽器原生提示框，例如 `签到验证：8 - 3 = ?`。腳本會自動回傳答案。
6. 預設會在點擊簽到後約 0.5 秒跳回首頁。
7. 如果要改成留在簽到頁，可從 Tampermonkey 選單執行 **尚香书苑 SXSY: 簽到後跳回首頁 / 留在簽到頁**。
8. 如果要重新嘗試，可從 Tampermonkey 選單執行 **尚香书苑 SXSY: retry check-in now**。

## Multi-account Behavior / 多帳號行為

The script does not decide from a saved local date, `localStorage`, `sessionStorage`, or Tampermonkey storage. It opens and reads the current website page every time, then lets the website's own current-account status decide whether to click. This is important when different accounts are used in the same browser profile.

腳本不會用本地日期、`localStorage`、`sessionStorage` 或 Tampermonkey 儲存資料判斷是否已簽，而是每次開啟並讀取目前網站頁面，再依網站顯示的目前帳號狀態決定是否點擊。這樣同一個瀏覽器 profile 切換不同帳號時，不會因為前一個帳號簽過就誤擋另一個帳號。

## Notes / 注意事項

- This script does not store passwords or cookies.
- It only stores the post-check-in homepage redirect preference. It does not store check-in status.
- You must already be logged in. The script does not automate login.
- It only solves simple arithmetic prompts using `+`, `-`, `*`, `x`, `X`, or `/`.
- If a prompt is already open before installing or updating the script, close it or refresh the page. The prompt solver only works when loaded before the site calls `window.prompt()`.

- 腳本不保存帳號、密碼或 Cookie。
- 只會保存「簽到後是否跳回首頁」這個偏好設定，不保存簽到狀態。
- 必須先登入網站；腳本不處理登入流程。
- 只處理 `+`、`-`、`*`、`x`、`X`、`/` 這類簡單算術驗證。
- 如果安裝或更新腳本前，驗證框已經跳出，請先關掉或重新整理頁面。自動解題必須在網站呼叫 `window.prompt()` 前載入才有效。

## File / 檔案

- Userscript: [`sxsy-auto-checkin.user.js`](./sxsy-auto-checkin.user.js)
