/**
 * SafePride 驕傲同行 — 公開設定檔
 *
 * 【啟用階段 2 跨裝置雲端同步步驟】
 * 1. 前往 Supabase 建立免費專案，並在 SQL Editor 執行 supabase/schema.sql。
 * 2. 將 Project Settings -> API 中的 Project URL 貼到下方的 supabaseUrl。
 * 3. 將 anon / public key 貼到下方的 supabaseAnonKey。
 *
 * ⚠️ 安全提醒：此檔案會公開於前端，【絕對禁止】填入 service_role 私鑰或管理員密碼！
 */
export const APP_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  // 預設地圖中心：中國文化大學（陽明山華岡校區）＋光華路 26 巷＋山仔后格致路周邊
  defaultCenter: [25.1374, 121.5432],
  defaultZoom: 16,
  fallbackOrigin: {
    lat: 25.1366,
    lng: 121.5406,
    label: "文化大學華岡校區"
  },

  // 隱私與防濫用參數
  blurRadiusMeters: { min: 30, max: 50 },
  reportCooldownMs: 60000,
  confirmThreshold: 3,
  flagHideThreshold: 3,
  warningExpiryDays: 30,

  // 緊急偽裝跳轉目標（中央氣象署官網，安全日常畫面）
  quickExitUrl: "https://www.cwa.gov.tw/V8/C/",

  // 免費開源 OSRM 步行路線服務
  osrmFootUrl: "https://router.project-osrm.org/route/v1/foot"
};
