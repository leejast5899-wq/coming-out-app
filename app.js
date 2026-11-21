import { APP_CONFIG } from "./js/config.js";
import {
  BYSTANDER_GUIDES,
  CAMPUS_ZONES,
  REPORT_TYPES,
  SCENARIOS
} from "./js/seed-data.js";
import { createDataService, deriveSpotStatus } from "./js/data-service.js";
import {
  calcDistanceMeters,
  createMapManager,
  formatDistance,
  getGoogleMapsNavUrl
} from "./js/map-module.js";
import { initSosTools } from "./js/sos-tools.js";

const PROFILE_STORAGE_KEY = "safepride_profile_v2";
const AVATAR_EMOJIS = ["👑", "🧑🏾", "🧢"];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDefaultProfile() {
  return {
    coins: 200,
    gems: 40,
    avatarIndex: 0,
    selectedSpotId: "seed-pccu-counseling",
    petitioned: false,
    badges: ["初入城市守護者"],
    userReports: [],
    confirmedSpotIds: [],
    flaggedSpotIds: [],
    completedScenarios: [],
    practicedBystanders: []
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw);
    return {
      coins: Number.isFinite(parsed.coins) ? parsed.coins : 200,
      gems: Number.isFinite(parsed.gems) ? parsed.gems : 40,
      avatarIndex: Number.isFinite(parsed.avatarIndex) ? parsed.avatarIndex : 0,
      selectedSpotId: parsed.selectedSpotId || "seed-pccu-counseling",
      petitioned: Boolean(parsed.petitioned),
      badges: Array.isArray(parsed.badges) && parsed.badges.length ? parsed.badges : ["初入城市守護者"],
      userReports: Array.isArray(parsed.userReports) ? parsed.userReports : [],
      confirmedSpotIds: Array.isArray(parsed.confirmedSpotIds) ? parsed.confirmedSpotIds : [],
      flaggedSpotIds: Array.isArray(parsed.flaggedSpotIds) ? parsed.flaggedSpotIds : [],
      completedScenarios: Array.isArray(parsed.completedScenarios) ? parsed.completedScenarios : [],
      practicedBystanders: Array.isArray(parsed.practicedBystanders) ? parsed.practicedBystanders : []
    };
  } catch {
    return getDefaultProfile();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const profile = loadProfile();
  const dataService = createDataService();

  let spots = [];
  let petitionCount = 128;
  let currentReportTypeIdx = 0;
  let homeMapFilter = "all";
  let fullMapFilter = "all";
  let currentScenarioKey = "campus_bus";
  let currentBystanderKey = "distract";
  let draftReportCoords = null; // { lat, lng, label }
  let deferredInstallPrompt = null;

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // 忽略隱私模式儲存限制
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2800);
  }

  function openModal(title, html) {
    const titleEl = document.getElementById("modal-title");
    const bodyEl = document.getElementById("modal-body");
    const backdrop = document.getElementById("info-modal");
    if (!titleEl || !bodyEl || !backdrop) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = html;
    backdrop.classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("info-modal")?.classList.add("hidden");
  }

  function addReward(coinsDelta, gemsDelta, reason) {
    profile.coins += coinsDelta;
    profile.gems += gemsDelta;
    saveProfile();
    renderHud();
    renderMeView();
    const parts = [];
    if (coinsDelta) parts.push(`+${coinsDelta} ⭐`);
    if (gemsDelta) parts.push(`+${gemsDelta} 💎`);
    showToast(parts.length ? `${reason}（獲得 ${parts.join(" ")}）` : reason);
  }

  function unlockBadge(badgeName) {
    if (!profile.badges.includes(badgeName)) {
      profile.badges.push(badgeName);
      saveProfile();
      renderMeView();
    }
  }

  /* ================= 地圖管理器初始化 ================= */
  const mapManager = createMapManager({
    onSelectSpot: (spotId) => {
      profile.selectedSpotId = spotId;
      saveProfile();
      renderAllMapViews();
      const target = spots.find((s) => s.id === spotId);
      if (target) mapManager.focusSpot(target);
    },
    onPickCoords: ({ lat, lng }) => {
      draftReportCoords = {
        lat,
        lng,
        label: `📌 地圖選點 (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      };
      updatePickButtonsUi();
      updateCoordStatusLabel();
      showToast("已於地圖選取回報位置！請填寫右側狀況後點「提交」");
    }
  });

  mapManager.init();

  /* ================= SOS 實用工具箱 ================= */
  const sosTools = initSosTools({
    mapManager,
    getSpots: () => spots,
    openModal,
    showToast
  });
  sosTools.bindEvents();

  /* ================= 頂部 HUD、分頁與離線狀態 ================= */
  function renderHud() {
    const coinsEl = document.getElementById("hud-coins");
    const gemsEl = document.getElementById("hud-gems");
    if (coinsEl) coinsEl.textContent = profile.coins;
    if (gemsEl) gemsEl.textContent = profile.gems;

    document.querySelectorAll("#hud-avatar-switcher .voxel-avatar").forEach((av) => {
      av.classList.toggle("active", Number(av.dataset.av) === profile.avatarIndex);
    });

    const syncBadge = document.getElementById("sync-mode-badge");
    const meSyncTitle = document.getElementById("me-sync-title");
    const meSyncDesc = document.getElementById("me-sync-desc");
    const mode = dataService.getMode();
    if (syncBadge) {
      syncBadge.classList.toggle("cloud", mode === "cloud");
      syncBadge.textContent =
        mode === "cloud" ? "☁️ Supabase 雲端同步中" : "💾 本地運作模式（可選配雲端）";
    }
    if (meSyncTitle && meSyncDesc) {
      if (mode === "cloud") {
        meSyncTitle.textContent = "目前模式：☁️ Supabase 雲端即時同步";
        meSyncDesc.textContent =
          "你的匿名回報、確認有效、連署與統計圖表皆會跨裝置即時與社群同步。";
      } else {
        const err = dataService.getLastCloudError();
        meSyncTitle.textContent = "目前模式：💾 本地瀏覽器模式";
        meSyncDesc.textContent = err
          ? `雲端連線備援提示：${err}（目前改存於本機）。`
          : "依 supabase/SETUP_GUIDE.md 在 js/config.js 填入專案設定後，即自動啟用跨裝置同步。";
      }
    }
  }

  function updateOfflineBanner() {
    const banner = document.getElementById("offline-banner");
    if (!banner) return;
    banner.classList.toggle("hidden", navigator.onLine !== false);
  }

  function initHudAndTabs() {
    document.querySelectorAll("#hud-avatar-switcher .voxel-avatar").forEach((av) => {
      av.addEventListener("click", () => {
        profile.avatarIndex = Number(av.dataset.av);
        saveProfile();
        renderHud();
        renderMeView();
        showToast("已切換守護者頭像造型！");
      });
    });

    document.querySelectorAll(".game-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.view;
        document.querySelectorAll(".game-tab").forEach((t) => {
          const active = t === tab;
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", String(active));
        });
        document.querySelectorAll(".view-section").forEach((sec) => {
          sec.classList.toggle("active", sec.id === `view-${target}`);
        });

        if (target === "map") {
          const selected = spots.find((s) => s.id === profile.selectedSpotId);
          mapManager.invalidateFullMap(selected);
          renderFullMapList();
        }
        if (target === "me") {
          renderMeView();
        }
      });
    });

    document.getElementById("coin-pill-btn")?.addEventListener("click", () => {
      openModal(
        "⭐ 驕傲守護幣說明",
        `<p>目前擁有 <strong>${profile.coins} ⭐</strong> 守護幣！</p>
         <ul>
           <li>驗證地圖空間資訊（每地點限領一次）：<strong>+10 ⭐</strong></li>
           <li>提交真實匿名安全／友善空間回報：<strong>+25 ⭐</strong></li>
           <li>參與文大周邊安全改善連署：<strong>+15 ⭐</strong></li>
         </ul>`
      );
    });

    document.getElementById("gem-pill-btn")?.addEventListener("click", () => {
      openModal(
        "💎 勇氣寶石說明",
        `<p>目前擁有 <strong>${profile.gems} 💎</strong> 勇氣寶石！</p>
         <ul>
           <li>首次完成各個情境應變演練：<strong>+10 💎</strong></li>
           <li>首次練習各個 5D 旁觀者金句：<strong>+5 💎</strong></li>
         </ul>`
      );
    });

    document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);
    document.getElementById("info-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "info-modal") closeModal();
    });

    document.getElementById("cta-download-btn")?.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          showToast("感謝安裝 SafePride！現在可從桌面離線開啟");
        }
        deferredInstallPrompt = null;
        return;
      }

      openModal(
        "📲 安裝 SafePride 到手機主畫面",
        `<p>SafePride 已啟用 <strong>離線 PWA 支援</strong>，安裝後在地下室或無訊號處仍可開啟 110/113 直撥、假來電與 5D 指南：</p>
         <ul>
           <li>📱 <strong>iOS Safari</strong>：點選底部「分享」按鈕 →「加入主畫面」</li>
           <li>🤖 <strong>Android Chrome</strong>：點選右上角「⋮」→「安裝應用程式」</li>
           <li>💻 <strong>桌面 Chrome / Edge</strong>：點擊網址列右側「安裝圖示」</li>
         </ul>`
      );
    });

    window.addEventListener("online", () => {
      updateOfflineBanner();
      refreshDataFromService();
    });
    window.addEventListener("offline", updateOfflineBanner);
    updateOfflineBanner();
    renderHud();
  }

  /* ================= ① 真實地圖、檢視器與安全路線 ================= */
  function getDistanceFromOrigin(spot) {
    const origin = mapManager.getUserLocation() || APP_CONFIG.fallbackOrigin;
    const isGps = Boolean(mapManager.getUserLocation());
    const meters = calcDistanceMeters(origin.lat, origin.lng, spot.lat, spot.lng);
    return {
      meters,
      label: isGps ? `距你約 ${formatDistance(meters)}` : `距文大校區約 ${formatDistance(meters)}`
    };
  }

  function renderPinInspector() {
    const spot = spots.find((s) => s.id === profile.selectedSpotId) || spots[0];
    if (!spot) return;

    const derived = deriveSpotStatus(spot);
    const dist = getDistanceFromOrigin(spot);
    const distEl = document.getElementById("pi-distance");
    const titleEl = document.getElementById("pi-title");
    const descEl = document.getElementById("pi-desc");
    const badgeEl = document.getElementById("pi-badge");
    const navEl = document.getElementById("pi-nav-link");
    const verifyBtn = document.getElementById("verify-pin-btn");

    if (distEl) distEl.textContent = `📍 ${dist.label}`;
    if (titleEl) titleEl.textContent = spot.name;
    if (descEl) {
      const expireNote = derived.expired ? "（此提醒已超過 30 天，僅供參考）" : "";
      descEl.textContent = `${spot.desc}${expireNote}（已有 ${spot.confirmations} 人確認）`;
    }

    if (badgeEl) {
      if (spot.type === "friendly") {
        badgeEl.className = "pi-badge friendly";
        badgeEl.textContent = "❤️ 友善空間";
      } else if (derived.trustState === "pending_verify") {
        badgeEl.className = "pi-badge pending";
        badgeEl.textContent = `❔ 待社群確認 (${spot.confirmations}/${APP_CONFIG.confirmThreshold})`;
      } else {
        badgeEl.className = "pi-badge warning";
        badgeEl.textContent = "⚠️ 已確認警示";
      }
    }

    if (navEl) {
      navEl.href = getGoogleMapsNavUrl(spot.lat, spot.lng);
    }

    if (verifyBtn) {
      const confirmed = profile.confirmedSpotIds.includes(spot.id);
      verifyBtn.classList.toggle("done", confirmed);
      verifyBtn.textContent = confirmed ? "✓ 已確認" : "👍 確認 (+10⭐)";
    }
  }

  function getFilteredFullSpots() {
    const query = (document.getElementById("map-search-input")?.value || "").trim().toLowerCase();
    return spots.filter((s) => {
      const matchesType = fullMapFilter === "all" || s.type === fullMapFilter;
      const matchesQuery =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.zone.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.desc.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  }

  function renderFullMapList() {
    const filtered = getFilteredFullSpots();
    const countEl = document.getElementById("map-list-count");
    if (countEl) countEl.textContent = filtered.length;

    const listEl = document.getElementById("full-map-locations-list");
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `<p style="font-size:13px;color:#544e70;">找不到符合關鍵字的地點，試著清除搜尋字詞。</p>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((s) => {
        const derived = deriveSpotStatus(s);
        const dist = getDistanceFromOrigin(s);
        const icon =
          s.type === "friendly" ? "❤️" : derived.trustState === "pending_verify" ? "❔" : "⚠️";
        const selectedClass = s.id === profile.selectedSpotId ? "selected" : "";
        return `
          <div class="loc-card ${selectedClass}" data-id="${escapeHtml(s.id)}">
            <div class="loc-card-top">
              <span>${icon} ${escapeHtml(s.name)}</span>
              <span>👍 ${s.confirmations}</span>
            </div>
            <p>${escapeHtml(s.desc)}</p>
            <div class="loc-card-meta">
              <span>${escapeHtml(dist.label)}</span>
              <a class="loc-card-nav" href="${escapeHtml(getGoogleMapsNavUrl(s.lat, s.lng))}" target="_blank" rel="noopener noreferrer">🚶 步行導航</a>
            </div>
          </div>
        `;
      })
      .join("");

    listEl.querySelectorAll(".loc-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        profile.selectedSpotId = card.dataset.id;
        saveProfile();
        renderAllMapViews();
        const spot = spots.find((s) => s.id === profile.selectedSpotId);
        if (spot) mapManager.focusSpot(spot);
      });
    });
  }

  function renderAllMapViews() {
    const homeFiltered = spots.filter((s) => homeMapFilter === "all" || s.type === homeMapFilter);
    const fullFiltered = getFilteredFullSpots();
    mapManager.renderMarkers({
      homeSpots: homeFiltered,
      fullSpots: fullFiltered,
      selectedSpotId: profile.selectedSpotId
    });
    renderPinInspector();
    renderFullMapList();
  }

  function updatePickButtonsUi() {
    const active = mapManager.isPickMode();
    document.getElementById("pick-on-map-btn")?.classList.toggle("active", active);
    document.getElementById("rep-pick-map-btn")?.classList.toggle("active", active);
  }

  function updateCoordStatusLabel() {
    const el = document.getElementById("rep-coord-status");
    if (!el) return;
    if (draftReportCoords) {
      el.textContent = draftReportCoords.label;
    } else {
      el.textContent = "📍 使用所選區域預設座標（或點擊地圖指定）";
    }
  }

  async function handleToggleRoute() {
    const selected = spots.find((s) => s.id === profile.selectedSpotId);
    const res = await mapManager.toggleSafeRoute(spots, selected);
    const btn1 = document.getElementById("toggle-safe-route-btn");
    const btn2 = document.getElementById("map-view-route-btn");
    const pill = document.getElementById("route-status-pill");

    if (res.error) {
      showToast(res.error);
      return;
    }

    btn1?.classList.toggle("active", res.active);
    btn2?.classList.toggle("active", res.active);
    if (pill) {
      pill.classList.toggle("hidden", !res.active);
      if (res.active) {
        const warnText = res.nearbyWarnings
          ? `（途經 ${res.nearbyWarnings} 處提醒路段請留意）`
          : "（已避開警示點）";
        pill.textContent = `🟢 往「${res.destSpot.name}」約 ${formatDistance(res.distanceMeters)} · ${res.durationMinutes} 分鐘 ${warnText}`;
      }
    }

    if (res.active) {
      const modeHint = res.fallbackUsed ? "離線直線參考" : "OSRM 街道步行路線";
      showToast(
        `已規劃 ${modeHint}：從${res.originLabel}至「${res.destSpot.name}」約 ${res.durationMinutes} 分鐘`
      );
    } else {
      showToast("已關閉安全路線規劃");
    }
  }

  function initMapActions() {
    document.querySelectorAll("#home-map-filters .map-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#home-map-filters .map-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        homeMapFilter = btn.dataset.filter;
        renderAllMapViews();
      });
    });

    document.querySelectorAll("#full-map-filters .mini-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#full-map-filters .mini-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        fullMapFilter = btn.dataset.filter;
        renderAllMapViews();
      });
    });

    document.getElementById("map-search-input")?.addEventListener("input", renderAllMapViews);

    const handleLocate = async () => {
      try {
        const pos = await mapManager.locateUser({ flyTo: true });
        renderPinInspector();
        renderFullMapList();
        showToast(`已定位目前位置（誤差約 ${pos.accuracy} 公尺）`);
      } catch (err) {
        showToast(err.message);
      }
    };

    document.getElementById("locate-me-btn")?.addEventListener("click", handleLocate);
    document.getElementById("full-locate-btn")?.addEventListener("click", handleLocate);
    document.getElementById("toggle-safe-route-btn")?.addEventListener("click", handleToggleRoute);
    document.getElementById("map-view-route-btn")?.addEventListener("click", handleToggleRoute);

    const togglePick = () => {
      const next = !mapManager.isPickMode();
      mapManager.setPickMode(next);
      updatePickButtonsUi();
      showToast(next ? "📌 請直接點擊地圖任意處設定回報座標" : "已取消地圖選點模式");
    };

    document.getElementById("pick-on-map-btn")?.addEventListener("click", togglePick);
    document.getElementById("rep-pick-map-btn")?.addEventListener("click", togglePick);

    document.getElementById("verify-pin-btn")?.addEventListener("click", async () => {
      const spot = spots.find((s) => s.id === profile.selectedSpotId);
      if (!spot) return;
      const already = profile.confirmedSpotIds.includes(spot.id);
      const res = await dataService.confirmSpot(spot.id, already);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      profile.confirmedSpotIds.push(spot.id);
      saveProfile();
      await refreshDataFromService();
      addReward(10, 0, `感謝確認「${spot.name}」真實資訊`);
    });

    document.getElementById("flag-pin-btn")?.addEventListener("click", () => {
      const spot = spots.find((s) => s.id === profile.selectedSpotId);
      if (!spot) return;
      if (profile.flaggedSpotIds.includes(spot.id)) {
        showToast("你已經檢舉過這筆標記，感謝共同維護地圖品質！");
        return;
      }

      openModal(
        "🚩 檢舉不實或惡意資訊",
        `<p>確定要檢舉「<strong>${escapeHtml(spot.name)}</strong>」嗎？累積 ${APP_CONFIG.flagHideThreshold} 位使用者檢舉後將自動隱藏送審。</p>
         <select id="flag-reason-select" style="width:100%;padding:8px;border-radius:10px;border:1.5px solid #cdc6e8;margin:8px 0 12px;">
           <option value="位置錯誤或店家已歇業">位置錯誤或店家已歇業</option>
           <option value="包含不實抹黑或攻擊內容">包含不實抹黑或攻擊內容</option>
           <option value="惡意洗版或重複測試資料">惡意洗版或重複測試資料</option>
         </select>
         <button type="button" id="confirm-flag-submit-btn" class="sos-tool-btn danger" style="width:100%;">確認送出檢舉</button>`
      );

      document.getElementById("confirm-flag-submit-btn")?.addEventListener("click", async () => {
        const reason = document.getElementById("flag-reason-select")?.value || "資訊不實";
        const res = await dataService.flagSpot(spot.id, reason, false);
        closeModal();
        if (!res.ok) {
          showToast(res.error);
          return;
        }
        profile.flaggedSpotIds.push(spot.id);
        saveProfile();
        await refreshDataFromService();
        showToast(res.hidden ? "已達門檻，該標記已自動隱藏送審" : "已收到檢舉，謝謝協助社群把關");
      });
    });
  }

  /* ================= ② 匿名回報模組 ================= */
  function renderReportType() {
    const rep = REPORT_TYPES[currentReportTypeIdx];
    const labelEl = document.getElementById("rep-type-label");
    const hintEl = document.getElementById("phone-mode-hint");
    const iconBox = document.getElementById("phone-icon-box");

    if (labelEl) labelEl.textContent = rep.label;
    if (hintEl) hintEl.textContent = rep.hint;
    if (iconBox) {
      const isFriendly = rep.pinType === "friendly";
      iconBox.classList.toggle("heart-mode", isFriendly);
      iconBox.textContent = isFriendly ? "♥" : "!";
    }
  }

  function initReportModule() {
    const zoneSelect = document.getElementById("rep-zone-select");
    if (zoneSelect) {
      zoneSelect.innerHTML = CAMPUS_ZONES.map(
        (z) => `<option value="${escapeHtml(z.label)}">${escapeHtml(z.label)}</option>`
      ).join("");
      zoneSelect.addEventListener("change", () => {
        if (draftReportCoords && draftReportCoords.source !== "map" && draftReportCoords.source !== "gps") {
          draftReportCoords = null;
          updateCoordStatusLabel();
        }
      });
    }

    document.getElementById("rep-prev-btn")?.addEventListener("click", () => {
      currentReportTypeIdx = (currentReportTypeIdx - 1 + REPORT_TYPES.length) % REPORT_TYPES.length;
      renderReportType();
    });

    document.getElementById("rep-next-btn")?.addEventListener("click", () => {
      currentReportTypeIdx = (currentReportTypeIdx + 1) % REPORT_TYPES.length;
      renderReportType();
    });

    document.getElementById("rep-use-gps-btn")?.addEventListener("click", async () => {
      try {
        const pos = await mapManager.locateUser({ flyTo: true });
        mapManager.setPickedCoords(pos.lat, pos.lng);
        draftReportCoords = {
          lat: pos.lat,
          lng: pos.lng,
          source: "gps",
          label: `📡 已套用目前 GPS (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`
        };
        updateCoordStatusLabel();
        showToast("已帶入你的目前 GPS 座標！");
      } catch (err) {
        showToast(err.message);
      }
    });

    document.getElementById("submit-report-btn")?.addEventListener("click", async () => {
      const rep = REPORT_TYPES[currentReportTypeIdx];
      const zoneLabel = zoneSelect?.value || CAMPUS_ZONES[0].label;
      const zoneObj = CAMPUS_ZONES.find((z) => z.label === zoneLabel) || CAMPUS_ZONES[0];
      const noteInput = document.getElementById("rep-note-input");
      const rawNote = noteInput?.value || "";

      const targetLat = draftReportCoords ? draftReportCoords.lat : zoneObj.lat;
      const targetLng = draftReportCoords ? draftReportCoords.lng : zoneObj.lng;

      const res = await dataService.submitSpotReport({
        categoryId: rep.id,
        zone: zoneLabel,
        note: rawNote,
        lat: targetLat,
        lng: targetLng
      });

      if (!res.ok) {
        showToast(res.error);
        noteInput?.focus();
        return;
      }

      if (noteInput) noteInput.value = "";
      draftReportCoords = null;
      mapManager.setPickMode(false);
      mapManager.clearPickedCoords();
      updatePickButtonsUi();
      updateCoordStatusLabel();

      profile.selectedSpotId = res.spot.id;
      profile.userReports.unshift({
        id: res.spot.id,
        date: new Date().toISOString().slice(0, 10),
        category: rep.label,
        zone: zoneLabel,
        note: res.spot.desc
      });
      unlockBadge("首次匿名守護者");
      saveProfile();

      await refreshDataFromService();
      mapManager.focusSpot(res.spot);

      const blurInfo = res.offsetMeters > 0 ? `（座標已模糊 ${res.offsetMeters}m）` : "";
      addReward(25, 0, `匿名回報成功${blurInfo}`);
    });

    renderReportType();
    updateCoordStatusLabel();
  }

  /* ================= ③ 情境模擬（修復刷分漏洞） ================= */
  function renderScenarioPills() {
    const container = document.getElementById("sim-scenario-pills");
    if (!container) return;
    container.innerHTML = Object.entries(SCENARIOS)
      .map(([key, sc]) => {
        const active = key === currentScenarioKey ? "active" : "";
        const done = profile.completedScenarios.includes(key);
        return `<button type="button" class="scen-pill ${active} ${done ? "completed" : ""}" data-scen="${escapeHtml(key)}">${escapeHtml(sc.label)}${done ? " ✓" : ""}</button>`;
      })
      .join("");

    container.querySelectorAll(".scen-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        currentScenarioKey = pill.dataset.scen;
        renderScenarioPills();
        renderScenarioBody();
      });
    });
  }

  function renderScenarioBody() {
    const sc = SCENARIOS[currentScenarioKey];
    if (!sc) return;
    const sitEl = document.getElementById("sim-situation-text");
    const wrap = document.getElementById("sim-options-wrap");
    if (sitEl) sitEl.textContent = sc.situation;
    if (!wrap) return;

    wrap.innerHTML = sc.options
      .map((opt, idx) => `<button type="button" class="sim-opt-btn" data-idx="${idx}">${escapeHtml(opt.label)}</button>`)
      .join("");

    wrap.querySelectorAll(".sim-opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        wrap.querySelectorAll(".sim-opt-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        const opt = sc.options[Number(btn.dataset.idx)];
        const box = document.getElementById("sim-guidance-box");
        if (box) {
          box.innerHTML = `
            <strong>${opt.safe ? "✅ 推薦安全策略" : "⚠️ 風險提示與建議"}</strong>
            <p>${escapeHtml(opt.guidance)}</p>
          `;
        }

        unlockBadge("應變演練達人");
        if (!profile.completedScenarios.includes(currentScenarioKey)) {
          profile.completedScenarios.push(currentScenarioKey);
          saveProfile();
          renderScenarioPills();
          addReward(0, 10, "首次完成此情境演練");
        } else {
          showToast("已完成演練回顧（每題首次練習已領過 💎）");
        }
      });
    });
  }

  function initSimulator() {
    document.querySelectorAll(".quick-pill-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        const box = document.getElementById("sim-guidance-box");
        if (!box) return;
        if (btn.dataset.quick === "deescalate") {
          box.innerHTML = `<strong>🗣️ 應對言語騷擾三口訣</strong><p>1. 不與對方互罵對視 → 2. 快速往格致路 7-11 或校內亮處移動 → 3. 事後匿名標記提醒同學。</p>`;
        } else {
          box.innerHTML = `<strong>📞 立即尋求協助管道</strong><p>點右上角紅色 ▲ 開啟緊急工具箱，可一鍵分享定位、啟動 5 秒假來電或直撥 110／113。</p>`;
        }
      });
    });

    renderScenarioPills();
    renderScenarioBody();
  }

  /* ================= ④ 旁觀者 5D 指南（修復刷分漏洞） ================= */
  function renderBystanderTabs() {
    const container = document.getElementById("bystander-tabs");
    if (!container) return;
    container.innerHTML = Object.entries(BYSTANDER_GUIDES)
      .map(([key, g]) => {
        const active = key === currentBystanderKey ? "active" : "";
        const done = profile.practicedBystanders.includes(key);
        return `<button type="button" class="by-btn ${active}" data-by="${escapeHtml(key)}">${escapeHtml(g.label)}${done ? " ✓" : ""}</button>`;
      })
      .join("");

    container.querySelectorAll(".by-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentBystanderKey = btn.dataset.by;
        renderBystanderTabs();
        renderBystanderContent();
      });
    });
  }

  function renderBystanderContent() {
    const g = BYSTANDER_GUIDES[currentBystanderKey];
    if (!g) return;
    const bubbleEl = document.getElementById("bystander-bubble");
    const scriptEl = document.getElementById("bystander-script");
    if (bubbleEl) bubbleEl.textContent = g.bubble;
    if (scriptEl) scriptEl.textContent = g.script;
  }

  function initBystander() {
    document.getElementById("copy-bystander-btn")?.addEventListener("click", async () => {
      const g = BYSTANDER_GUIDES[currentBystanderKey];
      try {
        await navigator.clipboard.writeText(`${g.bubble} ${g.script}`);
      } catch {
        // ignore clipboard error
      }
      unlockBadge("暖心旁觀守護者");
      if (!profile.practicedBystanders.includes(currentBystanderKey)) {
        profile.practicedBystanders.push(currentBystanderKey);
        saveProfile();
        renderBystanderTabs();
        addReward(0, 5, "已練習並複製 5D 守護金句");
      } else {
        showToast("已複製金句（此 5D 步驟已領過 💎）");
      }
    });

    renderBystanderTabs();
    renderBystanderContent();
  }

  /* ================= ⑤ 真實數據統計與 1999 範本 ================= */
  function renderAnalytics() {
    const stats = dataService.computeAnalytics(spots);
    const fEl = document.getElementById("kpi-friendly-count");
    const wEl = document.getElementById("kpi-warning-count");
    const pEl = document.getElementById("kpi-petition-count");

    if (fEl) fEl.textContent = stats.friendlyCount;
    if (wEl) wEl.textContent = `${stats.confirmedWarningCount}+${stats.pendingWarningCount}`;
    if (pEl) pEl.textContent = petitionCount;

    const chartSvg = document.getElementById("analytics-chart-svg");
    if (!chartSvg) return;

    const bars = stats.categoryBars;
    const maxVal = Math.max(4, ...bars.map((b) => b.val));
    const barWidth = 38;
    const gap = 24;
    const startX = 24;
    const baseBottom = 74;

    const barsSvg = bars
      .map((b, i) => {
        const h = Math.max(8, Math.round((b.val / maxVal) * 52));
        const x = startX + i * (barWidth + gap);
        const y = baseBottom - h;
        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="7" fill="${b.color}" opacity="0.92" />
          <text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" font-size="10.5" font-weight="900" fill="#24193d">${b.val}</text>
          <text x="${x + barWidth / 2}" y="${baseBottom + 15}" text-anchor="middle" font-size="10" font-weight="700" fill="#544e70">${b.label}</text>
        `;
      })
      .join("");

    chartSvg.innerHTML = barsSvg;
  }

  function initAnalytics() {
    document.getElementById("petition-btn")?.addEventListener("click", async () => {
      const res = await dataService.submitPetition(profile.petitioned);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      profile.petitioned = true;
      petitionCount = res.count || petitionCount + 1;
      unlockBadge("城市環境推動者");
      saveProfile();
      renderAnalytics();
      addReward(15, 0, "完成文大周邊照明安全連署");
    });

    document.getElementById("copy-1999-btn")?.addEventListener("click", async () => {
      const selected = spots.find((s) => s.id === profile.selectedSpotId);
      const text = dataService.build1999Template(selected);
      try {
        await navigator.clipboard.writeText(text);
        showToast("已複製 1999 市政報修／陳情範本！");
      } catch {
        // ignore clipboard failure
      }
      openModal(
        "📋 臺北市 1999 市政照明與安全報修範本",
        `<p>已為你整理好可直接貼入 <strong>臺北市陳情系統（1999）</strong> 的文案：</p>
         <pre style="white-space:pre-wrap;background:#f5f3ff;padding:10px;border-radius:10px;font-size:12.5px;border:1.5px solid #d5ceee;">${escapeHtml(text)}</pre>
         <div class="sos-action-row" style="margin-top:10px;">
           <a class="sos-tool-btn primary" href="https://1999.gov.taipei/" target="_blank" rel="noopener noreferrer">🌐 前往臺北市 1999 陳情系統</a>
         </div>`
      );
    });
  }

  /* ================= 視圖 3：守護者護照 ================= */
  function renderMeView() {
    const avEl = document.getElementById("passport-avatar-display");
    const cEl = document.getElementById("me-coins");
    const gEl = document.getElementById("me-gems");
    const rEl = document.getElementById("me-report-count");

    if (avEl) avEl.textContent = AVATAR_EMOJIS[profile.avatarIndex] || "👑";
    if (cEl) cEl.textContent = profile.coins;
    if (gEl) gEl.textContent = profile.gems;
    if (rEl) rEl.textContent = profile.userReports.length;

    const allBadges = [
      "初入城市守護者",
      "首次匿名守護者",
      "應變演練達人",
      "暖心旁觀守護者",
      "城市環境推動者"
    ];
    const badgesEl = document.getElementById("me-badges-grid");
    if (badgesEl) {
      badgesEl.innerHTML = allBadges
        .map((b) => {
          const has = profile.badges.includes(b);
          return `<div class="ach-badge ${has ? "unlocked" : ""}">${has ? "🏅" : "🔒"} ${escapeHtml(b)}</div>`;
        })
        .join("");
    }

    const list = document.getElementById("me-reports-list");
    if (list) {
      if (!profile.userReports.length) {
        list.innerHTML = `<p style="font-size:13px;color:#544e70;">尚未提交任何回報，回到「首頁」區塊 ② 可點地圖選點或直接提交匿名安全資訊！</p>`;
      } else {
        list.innerHTML = profile.userReports
          .map(
            (r) => `
          <div class="loc-card">
            <div class="loc-card-top">
              <span>${escapeHtml(r.category)}・${escapeHtml(r.zone)}</span>
              <span>${escapeHtml(r.date)}</span>
            </div>
            <p>${escapeHtml(r.note)}</p>
          </div>
        `
          )
          .join("");
      }
    }
  }

  /* ================= 資料刷新與 PWA 註冊 ================= */
  async function refreshDataFromService() {
    spots = await dataService.fetchSpots();
    petitionCount = await dataService.fetchPetitionCount();
    if (spots.length && !spots.some((s) => s.id === profile.selectedSpotId)) {
      profile.selectedSpotId = spots[0].id;
    }
    renderHud();
    renderAllMapViews();
    renderAnalytics();
    renderMeView();
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // ignore SW registration failure in unsupported local context
    });
  }

  initHudAndTabs();
  initMapActions();
  initReportModule();
  initSimulator();
  initBystander();
  initAnalytics();
  await refreshDataFromService();
});
