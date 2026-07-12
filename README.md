# 尚香书苑 SXSY Auto Check-in / 尚香书苑 SXSY 自動簽到油猴腳本

Tampermonkey userscript for 尚香书苑 / SXSY `k_misign` daily check-in. It opens the sign-in plugin page, reads the current account's page state first, clicks the text-format check-in button only when the page is not signed, automatically answers the browser arithmetic prompt, and can return to the homepage after check-in.

尚香书苑 / SXSY `k_misign` 每日簽到用的 Tampermonkey / 油猴腳本。腳本會先讀取目前帳號在網頁上的簽到狀態，確認不是「已签到」後才進入簽到流程，自動回答瀏覽器跳出的算術驗證題，並可選擇簽到後是否跳回首頁。

## Features / 功能

- Matches SXSY mirror domains with `https://sxsy*.com/*`.
- Fetches the sign-in plugin page in the background with the current account session; if it shows `已签到` / `已簽到`, the current page never navigates away.
- Does not store daily check-in state. It keeps only a temporary same-tab return URL in `sessionStorage`, so different accounts are still decided independently by the website state.
- Opens `plugin.php?id=k_misign:sign` only when the background response clearly shows an unsigned state; unknown or login responses stay on the current page.
- Reads signed state only from the sign-in page or known check-in controls instead of scanning arbitrary forum content.
- Clicks `#JD_sign` with `operation=qiandao&format=text` only when the sign-in page clearly shows an unsigned state.
- Intercepts native `window.prompt()` at `document-start` and solves simple arithmetic prompts such as `8 - 3 = ?`.
- Configurable post-check-in action: after the website confirms success, return to the page that started check-in after about 0.5 seconds by default, or stay on the sign-in page.
- Provides a Tampermonkey menu command for manual retry.

- 使用 `https://sxsy*.com/*` 匹配尚香书苑 / SXSY 鏡像網址。
- 使用目前帳號的網站 session 在背景讀取簽到插件頁；如果顯示 `已签到` / `已簽到`，目前頁面完全不會跳走。
- 不保存本地「今日已簽」狀態；`sessionStorage` 只暫存同一分頁的返回網址，因此多帳號仍依各自網頁狀態判斷，不會互相誤擋。
- 只有背景回應明確顯示未簽到，才前往 `plugin.php?id=k_misign:sign`；狀態不明或回到登入頁時會留在目前頁面。
- 已簽到狀態只從簽到頁或已知簽到元件判斷，不掃描任意論壇文章內容。
- 只有簽到頁明確顯示未簽狀態時，才點擊 `#JD_sign` 上的 `operation=qiandao&format=text` 簽到連結。
- 在 `document-start` 先攔截瀏覽器原生 `window.prompt()`，自動解出 `8 - 3 = ?` 這類算術驗證題。
- 可設定簽到後動作：網站確認成功後，預設約 0.5 秒返回啟動簽到的前一頁，也可以改成留在簽到頁。
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
2. Open the SXSY homepage, forum index, or portal index. Search, thread, profile, and other pages do not auto-start check-in.
3. The script fetches the sign-in plugin page in the background using the current account cookies.
4. If the response is already signed, the browser stays on the current page. Only a clearly unsigned response opens the visible sign-in page.
5. The site may show a browser prompt like `签到验证：8 - 3 = ?`. The script answers it automatically.
6. The script waits for `签到成功` / `已签到`, including success reported through a browser alert. Only then does the default 0.5-second return countdown begin; failed or unconfirmed responses stay visible.
7. To change that behavior, open Tampermonkey's menu and run **尚香书苑 SXSY: 簽到後返回前一頁 / 留在簽到頁**.
8. If you need to retry, open Tampermonkey's menu and run **尚香书苑 SXSY: retry check-in now**.

1. 先手動登入尚香书苑 / SXSY 帳號。
2. 打開 SXSY 網站首頁、論壇首頁或門戶首頁。搜尋、文章、個人頁及其他頁面不會自動啟動簽到。
3. 腳本會使用目前帳號 Cookie，在背景取得簽到插件頁並判斷狀態。
4. 如果背景回應已簽到，瀏覽器會留在目前頁面；只有明確未簽到才開啟可見的簽到頁。
5. 網站可能會跳出瀏覽器原生提示框，例如 `签到验证：8 - 3 = ?`。腳本會自動回傳答案。
6. 腳本會等待網站顯示 `签到成功` / `已签到`，也會捕捉瀏覽器成功彈窗；確認後才開始預設 0.5 秒返回前一頁倒數，失敗或未確認的結果會留在畫面上。
7. 如果要改成留在簽到頁，可從 Tampermonkey 選單執行 **尚香书苑 SXSY: 簽到後返回前一頁 / 留在簽到頁**。
8. 如果要重新嘗試，可從 Tampermonkey 選單執行 **尚香书苑 SXSY: retry check-in now**。

## Multi-account Behavior / 多帳號行為

The script does not decide from a saved local date, `localStorage`, or stored check-in state. It fetches the website's sign-in page every time and lets the current account response decide whether to navigate and click. This is important when different accounts are used in the same browser profile.

腳本不會用本地日期、`localStorage` 或儲存的簽到狀態判斷是否已簽，而是每次背景取得網站簽到頁，再依目前帳號的回應決定是否跳轉與點擊。這樣同一個瀏覽器 profile 切換不同帳號時，不會因為前一個帳號簽過就誤擋另一個帳號。

## Notes / 注意事項

- This script does not store passwords or cookies.
- It stores the post-check-in return preference and one temporary same-tab return URL. It does not store check-in status.
- You must already be logged in. The script does not automate login.
- It only solves simple arithmetic prompts using `+`, `-`, `*`, `x`, `X`, or `/`.
- If a prompt is already open before installing or updating the script, close it or refresh the page. The prompt solver only works when loaded before the site calls `window.prompt()`.

- 腳本不保存帳號、密碼或 Cookie。
- 只會保存「簽到後是否返回」偏好，並在同一分頁暫存一次返回網址；不保存簽到狀態。
- 必須先登入網站；腳本不處理登入流程。
- 只處理 `+`、`-`、`*`、`x`、`X`、`/` 這類簡單算術驗證。
- 如果安裝或更新腳本前，驗證框已經跳出，請先關掉或重新整理頁面。自動解題必須在網站呼叫 `window.prompt()` 前載入才有效。

## File / 檔案

- Userscript: [`sxsy-auto-checkin.user.js`](./sxsy-auto-checkin.user.js)
- Regression check: run `node test-userscript.js`.
