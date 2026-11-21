import { APP_CONFIG } from "./config.js";
import { EMERGENCY_HOTLINES } from "./seed-data.js";
import { calcDistanceMeters, formatDistance, getGoogleMapsNavUrl } from "./map-module.js";

const EMERGENCY_CONTACT_KEY = "safepride_emergency_contact_v1";

function loadEmergencyContact() {
  try {
    const raw = localStorage.getItem(EMERGENCY_CONTACT_KEY);
    if (!raw) return { name: "", phone: "" };
    const parsed = JSON.parse(raw);
    return {
      name: String(parsed.name || "").slice(0, 24),
      phone: String(parsed.phone || "").slice(0, 20)
    };
  } catch {
    return { name: "", phone: "" };
  }
}

function saveEmergencyContact(contact) {
  try {
    localStorage.setItem(EMERGENCY_CONTACT_KEY, JSON.stringify(contact));
  } catch {
    // ignore
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createRingtonePlayer() {
  let audioCtx = null;
  let timerId = null;

  function playBurst() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      [0, 0.25].forEach((offset) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now + offset);
        osc2.frequency.setValueAtTime(480, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start(now + offset);
        osc2.start(now + offset);
        osc1.stop(now + offset + 0.21);
        osc2.stop(now + offset + 0.21);
      });
    } catch {
      // 瀏覽器未允許自動播放時靜默降級
    }
  }

  return {
    start() {
      this.stop();
      playBurst();
      timerId = setInterval(playBurst, 1800);
    },
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  };
}

export function initSosTools({ mapManager, getSpots, openModal, showToast }) {
  const ringtone = createRingtonePlayer();
  let fakeCallCountdownTimer = null;
  let callDurationTimer = null;
  let callSeconds = 0;
  let lastEscTime = 0;

  function triggerQuickExit() {
    window.location.replace(APP_CONFIG.quickExitUrl);
  }

  function renderHotlinesList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const contact = loadEmergencyContact();
    const customHtml = contact.phone
      ? `
        <div class="sos-card urgent custom-contact-card">
          <div class="sos-card-head">
            <strong>💛 我的緊急聯絡人：${escapeHtml(contact.name || "信任友人")}（${escapeHtml(contact.phone)}）</strong>
            <a class="sos-dial-btn" href="tel:${escapeHtml(contact.phone.replace(/[^\d+]/g, ""))}">📞 立即撥打</a>
          </div>
          <p>此聯絡人僅儲存於你自己的瀏覽器本機，不會上傳至任何伺服器。</p>
        </div>
      `
      : "";

    const cardsHtml = EMERGENCY_HOTLINES.map(
      (item) => `
      <div class="sos-card ${item.urgent ? "urgent" : ""}">
        <div class="sos-card-head">
          <strong>${escapeHtml(item.title)}</strong>
          <a class="sos-dial-btn ${item.urgent ? "urgent" : ""}" href="${escapeHtml(item.tel)}">📞 ${escapeHtml(item.btnText)}</a>
        </div>
        <p>${escapeHtml(item.desc)}</p>
      </div>
    `
    ).join("");

    container.innerHTML = customHtml + cardsHtml;
  }

  async function shareLiveLocation() {
    let coords = mapManager.getUserLocation();
    let isRealGps = Boolean(coords);
    if (!coords) {
      try {
        coords = await mapManager.locateUser({ flyTo: false });
        isRealGps = true;
      } catch {
        coords = APP_CONFIG.fallbackOrigin;
        isRealGps = false;
      }
    }

    const mapsLink = `https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    const msg = isRealGps
      ? `【SafePride 平安回報】我目前在這個位置，請幫我留意平安到家：${mapsLink}`
      : `【SafePride 平安回報】目前未取得 GPS（以下為文化大學參考位置），請聯繫確認我的狀況：${mapsLink}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "SafePride 即時平安位置分享",
          text: msg,
          url: mapsLink
        });
        showToast("已開啟系統分享即時位置！");
        return;
      } catch {
        // 使用者取消或不支援時退回複製＋社群快捷
      }
    }

    try {
      await navigator.clipboard.writeText(msg);
      showToast("已複製即時位置文字，可貼給親友！");
    } catch {
      // ignore clipboard error
    }

    const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;
    const smsHref = `sms:?&body=${encodeURIComponent(msg)}`;
    openModal(
      "📍 一鍵分享即時安全位置",
      `<p>${isRealGps ? "已取得你目前的 GPS 座標" : "尚未取得 GPS 權限，已帶入文化大學參考座標"}：</p>
       <div class="sos-share-box">${escapeHtml(msg)}</div>
       <div class="sos-action-row" style="margin-top:12px;">
         <a class="sos-tool-btn primary" href="${escapeHtml(lineHref)}" target="_blank" rel="noopener noreferrer">💬 用 LINE 傳給親友</a>
         <a class="sos-tool-btn" href="${escapeHtml(smsHref)}">✉️ 用簡訊傳送</a>
       </div>`
    );
  }

  function findNearestSafeSpot() {
    const origin = mapManager.getUserLocation() || APP_CONFIG.fallbackOrigin;
    const spots = getSpots().filter((s) => s.type === "friendly");
    if (!spots.length) return null;

    const priorityTypes = new Set(["convenience_24h", "police", "safe_hub"]);
    const prioritized = spots.filter((s) => priorityTypes.has(s.subType));
    const pool = prioritized.length ? prioritized : spots;

    let best = pool[0];
    let bestDist = calcDistanceMeters(origin.lat, origin.lng, best.lat, best.lng);
    pool.forEach((s) => {
      const d = calcDistanceMeters(origin.lat, origin.lng, s.lat, s.lng);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    });
    return { spot: best, distanceMeters: bestDist };
  }

  function openNearestSafeNavigation() {
    const result = findNearestSafeSpot();
    if (!result) {
      showToast("目前找不到可用的友善據點");
      return;
    }
    const { spot, distanceMeters } = result;
    const url = getGoogleMapsNavUrl(spot.lat, spot.lng);
    openModal(
      "🛡️ 最近安全庇護據點導航",
      `<p>距離你最近的安全據點是：<strong>${escapeHtml(spot.name)}</strong>（約 <strong>${formatDistance(distanceMeters)}</strong>）</p>
       <p>${escapeHtml(spot.address || spot.zone)}</p>
       <p style="font-size:13px;color:#544e70;">${escapeHtml(spot.desc)}</p>
       <div class="sos-action-row" style="margin-top:14px;">
         <a class="sos-tool-btn primary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">🚶 開啟 Google Maps 步行導航</a>
       </div>`
    );
  }

  function openFakeCallScreen(callerName) {
    const overlay = document.getElementById("fake-call-overlay");
    if (!overlay) return;
    document.getElementById("fc-caller-name").textContent = callerName || "室友小安";
    document.getElementById("fc-status-text").textContent = "行動電話來電中…";
    document.getElementById("fc-script-hint").classList.add("hidden");
    document.getElementById("fc-answer-btn").classList.remove("hidden");
    overlay.classList.remove("hidden");
    ringtone.start();
  }

  function closeFakeCallScreen() {
    const overlay = document.getElementById("fake-call-overlay");
    if (overlay) overlay.classList.add("hidden");
    ringtone.stop();
    if (callDurationTimer) {
      clearInterval(callDurationTimer);
      callDurationTimer = null;
    }
    callSeconds = 0;
  }

  function startFakeCallCountdown(callerName = "室友小安") {
    if (fakeCallCountdownTimer) {
      clearInterval(fakeCallCountdownTimer);
      fakeCallCountdownTimer = null;
      showToast("已取消假來電倒數");
      return;
    }

    let remain = 5;
    showToast(`📞 ${remain} 秒後將模擬「${callerName}」來電（再點一次可取消）`);
    fakeCallCountdownTimer = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        clearInterval(fakeCallCountdownTimer);
        fakeCallCountdownTimer = null;
        openFakeCallScreen(callerName);
      } else {
        showToast(`📞 ${remain} 秒後模擬來電…`);
      }
    }, 1000);
  }

  function openSosModal() {
    const contact = loadEmergencyContact();
    const nearest = findNearestSafeSpot();
    const nearestHtml = nearest
      ? `<a class="sos-tool-btn primary" href="${escapeHtml(getGoogleMapsNavUrl(nearest.spot.lat, nearest.spot.lng))}" target="_blank" rel="noopener noreferrer">🏪 導航最近安全點：${escapeHtml(nearest.spot.name)} (${formatDistance(nearest.distanceMeters)})</a>`
      : "";

    const customDial = contact.phone
      ? `<a class="sos-dial-btn urgent" href="tel:${escapeHtml(contact.phone.replace(/[^\d+]/g, ""))}">📞 撥給 ${escapeHtml(contact.name || "緊急聯絡人")}</a>`
      : "";

    openModal(
      "🚨 SafePride 緊急安全工具箱",
      `<p>若當下正面臨跟蹤、騷擾或人身安全威脅，請先移動至有店員與監視器的明亮空間：</p>
       <div class="sos-modal-tools">
         <button type="button" class="sos-tool-btn primary" id="modal-share-loc-btn">📍 一鍵分享即時位置</button>
         <button type="button" class="sos-tool-btn" id="modal-fake-call-btn">📞 5 秒假來電脫身</button>
         ${nearestHtml}
         <button type="button" class="sos-tool-btn danger" id="modal-quick-exit-btn">👁️ 快速偽裝跳離</button>
       </div>
       <div class="sos-modal-hotlines">
         <a class="sos-dial-btn urgent" href="tel:110">🚨 撥打 110</a>
         <a class="sos-dial-btn urgent" href="tel:113">🛡️ 撥打 113</a>
         <a class="sos-dial-btn" href="tel:1925">💚 1925 安心專線</a>
         <a class="sos-dial-btn" href="tel:+886223921969">🌈 同志諮詢熱線</a>
         ${customDial}
       </div>`
    );

    document.getElementById("modal-share-loc-btn")?.addEventListener("click", shareLiveLocation);
    document.getElementById("modal-fake-call-btn")?.addEventListener("click", () => {
      document.getElementById("info-modal")?.classList.add("hidden");
      startFakeCallCountdown("室友小安");
    });
    document.getElementById("modal-quick-exit-btn")?.addEventListener("click", triggerQuickExit);
  }

  function bindEvents() {
    document.getElementById("quick-sos-btn")?.addEventListener("click", openSosModal);
    document.getElementById("quick-exit-btn")?.addEventListener("click", triggerQuickExit);

    document.getElementById("me-share-location-btn")?.addEventListener("click", shareLiveLocation);
    document.getElementById("me-fake-call-btn")?.addEventListener("click", () => {
      const caller = document.getElementById("fake-caller-select")?.value || "室友小安";
      startFakeCallCountdown(caller);
    });
    document.getElementById("me-nearest-safe-btn")?.addEventListener("click", openNearestSafeNavigation);

    document.getElementById("fc-answer-btn")?.addEventListener("click", () => {
      ringtone.stop();
      document.getElementById("fc-answer-btn")?.classList.add("hidden");
      document.getElementById("fc-script-hint")?.classList.remove("hidden");
      callSeconds = 0;
      const statusEl = document.getElementById("fc-status-text");
      if (statusEl) statusEl.textContent = "通話中 00:00";
      callDurationTimer = setInterval(() => {
        callSeconds += 1;
        const mm = String(Math.floor(callSeconds / 60)).padStart(2, "0");
        const ss = String(callSeconds % 60).padStart(2, "0");
        if (statusEl) statusEl.textContent = `通話中 ${mm}:${ss}`;
      }, 1000);
    });

    document.getElementById("fc-hangup-btn")?.addEventListener("click", closeFakeCallScreen);

    // 連按兩下 Escape 立即執行 Quick Exit
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - lastEscTime <= 500) {
        triggerQuickExit();
      }
      lastEscTime = now;
    });

    // 本機緊急聯絡人儲存
    const contact = loadEmergencyContact();
    const nameInput = document.getElementById("ec-name-input");
    const phoneInput = document.getElementById("ec-phone-input");
    if (nameInput) nameInput.value = contact.name;
    if (phoneInput) phoneInput.value = contact.phone;

    document.getElementById("ec-save-btn")?.addEventListener("click", () => {
      const name = (nameInput?.value || "").trim().slice(0, 24);
      const phone = (phoneInput?.value || "").trim().slice(0, 20);
      if (phone && !/^[+\d][\d\s-]{4,18}$/.test(phone)) {
        showToast("請輸入正確的電話號碼格式");
        return;
      }
      saveEmergencyContact({ name, phone });
      renderHotlinesList("me-sos-cards-list");
      showToast(phone ? "已將緊急聯絡人儲存於本機！" : "已清除緊急聯絡人設定");
    });

    renderHotlinesList("me-sos-cards-list");
  }

  return {
    bindEvents,
    openSosModal,
    shareLiveLocation,
    startFakeCallCountdown,
    openNearestSafeNavigation,
    triggerQuickExit,
    renderHotlinesList
  };
}
