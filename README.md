# 尚香书苑 SXSY Auto Check-in / 尚香书苑 SXSY 自動簽到油猴腳本

Tampermonkey userscript for 尚香书苑 / SXSY `k_misign` daily check-in. It opens the sign-in plugin page, reads the current account's page state first, clicks the text-format check-in button only when the page is not signed, and automatically answers the browser arithmetic prompt.

尚香书苑 / SXSY `k_misign` 每日簽到用的 Tampermonkey / 油猴腳本。腳本會先讀取目前帳號在網頁上的簽到狀態，確認不是「已签到」後才進入簽到流程，並自動回答瀏覽器跳出的算術驗證題。

## Features / 功能

- Matches SXSY mirror domains with `https://sxsy*.com/*`.
- Detects the current web page state first; if the page shows `已签到` / `已簽到`, it skips clicking.
- Does not use a stored daily check-in record, so different accounts are handled independently by their actual page state.
- Opens `plugin.php?id=k_misign:sign` when a check-in link is available.
- Clicks `#JD_sign` with `operation=qiandao&format=text` only when the sign-in page clearly shows an unsigned state.
- Intercepts native `window.prompt()` at `document-start` and solves simple arithmetic prompts such as `8 - 3 = ?`.
- Provides a Tampermonkey menu command for manual retry.

- 使用 `https://sxsy*.com/*` 匹配尚香书苑 / SXSY 鏡像網址。
- 每次開頁都先偵測目前網頁狀態；如果頁面顯示 `已签到` / `已簽到`，就不會再點擊。
- 不使用本地「今日已簽」紀錄，因此多帳號會依各自網頁狀態判斷，不會互相誤擋。
- 偵測到簽到入口後，自動前往 `plugin.php?id=k_misign:sign`。
- 只有簽到頁明確顯示未簽狀態時，才點擊 `#JD_sign` 上的 `operation=qiandao&format=text` 簽到連結。
- 在 `document-start` 先攔截瀏覽器原生 `window.prompt()`，自動解出 `8 - 3 = ?` 這類算術驗證題。
- Tampermonkey 選單提供手動重試。

## Install / 安裝

1. Install Tampermonkey in Chrome or another Chromium browser.
2. Open the raw userscript URL:
   <https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/main/sxsy-auto-checkin.user.js>
3. Tampermonkey should open the install screen. Click **Install**.
4. Disable older generic check-in scripts for SXSY if they also run on the same site.

1. 在 Chrome 或 Chromium 系瀏覽器安裝 Tampermonkey / 油猴。
2. 打開 raw 腳本網址：
   <https://raw.githubusercontent.com/anlo1220/sxsy-auto-checkin/main/sxsy-auto-checkin.user.js>
3. Tampermonkey 會跳出安裝頁，按 **安裝**。
4. 如果你原本有其他通用簽到腳本也會跑在尚香书苑 / SXSY，建議先停用，避免重複點擊或腳本衝突。

## Usage / 使用方式

1. Log in to a 尚香书苑 / SXSY account manually first.
2. Open any matching SXSY page, for example a home page or forum page.
3. The script checks the page first. If it sees `已签到` / `已簽到`, it stops.
4. If the page is not signed and a check-in entry exists, the script opens the sign-in plugin page.
5. The site may show a browser prompt like `签到验证：8 - 3 = ?`. The script answers it automatically.
6. If you need to retry, open Tampermonkey's menu and run **尚香书苑 SXSY: retry check-in now**.

1. 先手動登入尚香书苑 / SXSY 帳號。
2. 打開任一符合 `https://sxsy*.com/*` 的頁面，例如首頁或論壇頁。
3. 腳本會先檢查頁面；如果看到 `已签到` / `已簽到`，就直接停止。
4. 如果頁面尚未簽到且有簽到入口，腳本會自動跳到簽到插件頁。
5. 網站可能會跳出瀏覽器原生提示框，例如 `签到验证：8 - 3 = ?`。腳本會自動回傳答案。
6. 如果要重新嘗試，可從 Tampermonkey 選單執行 **尚香书苑 SXSY: retry check-in now**。

## Multi-account Behavior / 多帳號行為

The script does not decide from a saved local date. It decides from the current page content every time. This is important when different accounts are used in the same browser profile.

腳本不會用本地儲存的日期判斷是否已簽，而是每次讀取當前網頁內容。這樣同一個瀏覽器 profile 切換不同帳號時，不會因為前一個帳號簽過就誤擋另一個帳號。

## Notes / 注意事項

- This script does not store passwords or cookies.
- You must already be logged in. The script does not automate login.
- It only solves simple arithmetic prompts using `+`, `-`, `*`, `x`, `X`, or `/`.
- If a prompt is already open before installing or updating the script, close it or refresh the page. The prompt solver only works when loaded before the site calls `window.prompt()`.

- 腳本不保存帳號、密碼或 Cookie。
- 必須先登入網站；腳本不處理登入流程。
- 只處理 `+`、`-`、`*`、`x`、`X`、`/` 這類簡單算術驗證。
- 如果安裝或更新腳本前，驗證框已經跳出，請先關掉或重新整理頁面。自動解題必須在網站呼叫 `window.prompt()` 前載入才有效。

## File / 檔案

- Userscript: [`sxsy-auto-checkin.user.js`](./sxsy-auto-checkin.user.js)
