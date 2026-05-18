# SXSY Auto Check-in / SXSY 自動簽到油猴腳本

Tampermonkey userscript for SXSY `k_misign` daily check-in. It opens the sign-in plugin page, clicks the text-format check-in button, and automatically answers the browser arithmetic prompt.

SXSY `k_misign` 每日簽到用的 Tampermonkey / 油猴腳本。腳本會自動進入簽到插件頁、點擊 `format=text` 的簽到入口，並自動回答瀏覽器跳出的算術驗證題。

## Features / 功能

- Matches SXSY mirror domains with `https://sxsy*.com/*`.
- Opens `plugin.php?id=k_misign:sign` when a check-in link is available.
- Clicks `#JD_sign` with `operation=qiandao&format=text`.
- Intercepts native `window.prompt()` at `document-start` and solves simple arithmetic prompts such as `8 - 3 = ?`.
- Records one attempt per day to avoid repeated auto-clicking.
- Provides a Tampermonkey menu command for manual retry.

- 使用 `https://sxsy*.com/*` 匹配 SXSY 鏡像網址。
- 偵測到簽到入口後，自動前往 `plugin.php?id=k_misign:sign`。
- 點擊 `#JD_sign` 上的 `operation=qiandao&format=text` 簽到連結。
- 在 `document-start` 先攔截瀏覽器原生 `window.prompt()`，自動解出 `8 - 3 = ?` 這類算術驗證題。
- 每天只自動嘗試一次，避免重複點擊。
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
4. 如果你原本有其他通用簽到腳本也會跑在 SXSY，建議先停用，避免重複點擊或腳本衝突。

## Usage / 使用方式

1. Log in to an SXSY site manually first.
2. Open any matching SXSY page, for example a home page or forum page.
3. If the page shows a check-in entry, the script will go to the sign-in plugin page automatically.
4. The site may show a browser prompt like `签到验证：8 - 3 = ?`. The script answers it automatically, so no manual input should be needed.
5. If you need to retry, open Tampermonkey's menu and run **SXSY: retry check-in now**.

1. 先手動登入 SXSY 網站。
2. 打開任一符合 `https://sxsy*.com/*` 的 SXSY 頁面，例如首頁或論壇頁。
3. 如果頁面上有簽到入口，腳本會自動跳到簽到插件頁。
4. 網站可能會跳出瀏覽器原生提示框，例如 `签到验证：8 - 3 = ?`。腳本會自動回傳答案，不需要手動輸入。
5. 如果要重新嘗試，可從 Tampermonkey 選單執行 **SXSY: retry check-in now**。

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
