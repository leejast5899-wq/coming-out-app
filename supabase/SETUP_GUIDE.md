# SafePride 驕傲同行 — Supabase 免費雲端資料庫 3 分鐘設定教學

在未設定 Supabase 之前，SafePride 會以**「本地運作模式」**完整執行所有地圖、SOS 求助、情境模擬與 PWA 功能。  
當你希望所有使用者的匿名回報、確認有效與統計數據**跨裝置即時共享**時，依照下方 4 步即可免費上雲（免信用卡、Free Tier 額度充裕）：

---

## 步驟 1：建立免費 Supabase 專案
1. 前往 [https://supabase.com/](https://supabase.com/) 使用 GitHub 帳號免費登入。
2. 點擊 **New project**，選擇你現有的 Organization。
3. 填寫專案名稱（例如 `safepride-pccu`）、設定資料庫密碼、Region 建議選擇離台灣最近的 **Tokyo (`ap-northeast-1`)** 或 **Singapore (`ap-southeast-1`)**，方案維持 **Free**，點擊 **Create new project** 等待約 1–2 分鐘初始化。

---

## 步驟 2：一鍵建立資料表與 RLS 安全規則
1. 進入專案左側選單 **SQL Editor** → 點擊 **New query**。
2. 打開本專案的 `supabase/schema.sql`，**全選並複製全部內容**，貼入 SQL Editor。
3. 點擊右下角 **Run**，看到 `Success` 即完成建表（包含 `spots`、`spot_votes`、`spot_flags`、`petitions`、安全 RLS 規則與文化大學初始種子資料）。

---

## 步驟 3：填入公開連線設定（`js/config.js`）
1. 在 Supabase 左側選單前往 **Project Settings**（左下角齒輪）→ **API**（或 **Data API**）。
2. 複製兩個公開值：
   - **Project URL**（格式如 `https://xxxxxxxx.supabase.co`）
   - **anon / public** key（⚠️ **絕對不要複製 `service_role` 私鑰**）
3. 打開本專案的 `js/config.js`，將它們貼入：
   ```js
   supabaseUrl: "https://你的專案ID.supabase.co",
   supabaseAnonKey: "你的-anon-public-key",
   ```
4. 重新整理網頁，看到頂部狀態列顯示 **`☁️ Supabase 雲端同步中`**，即代表連線成功！

---

## 步驟 4（選用）：啟用 `admin.html` 管理員審核頁
為防止惡意灌水或需要人工下架不實回報，建議在後台建立自己的管理員帳號：
1. 在 Supabase 左側選單進入 **Authentication** → **Users**。
2. 點擊 **Add user** → **Create new user**，輸入你自己的 Email 與高強度密碼（勾選 Auto Confirm User）。
3. 打開本專案的 `admin.html`，用剛才建立的 Email 與密碼登入，即可：
   - 檢視所有標記（包含已被檢舉自動隱藏的 `hidden` 資料）。
   - 一鍵切換標記狀態為 **恢復公開（`active`）**、**已改善結案（`resolved`）**、**隱藏下架（`hidden`）** 或 **永久刪除**。
