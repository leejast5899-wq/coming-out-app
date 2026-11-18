(() => {
  "use strict";

  const STORAGE_KEY = "safepride_app_state_v1";

  const INITIAL_PINS = [
    {
      id: "pin-1",
      type: "friendly",
      name: "虹光友善咖啡廳",
      zone: "彩虹大道一段",
      desc: "營業至 24:00，設有性別友善廁所與夜間安全等候座位，店員受過多元友善培訓。",
      confirmations: 24,
      x: 195,
      y: 62
    },
    {
      id: "pin-2",
      type: "friendly",
      name: "共融藥局與安心驛站",
      zone: "彩虹大道一段",
      desc: "明亮落地窗與 24 小時監視器，夜間感到不安或被跟蹤時可直接入內請求暫時協助。",
      confirmations: 19,
      x: 405,
      y: 60
    },
    {
      id: "pin-3",
      type: "friendly",
      name: "微光多元性別書店",
      zone: "共融公園路",
      desc: "定期舉辦社群交流活動，空間溫暖開放，提供免費多元性別支持小卡。",
      confirmations: 31,
      x: 225,
      y: 270
    },
    {
      id: "pin-4",
      type: "friendly",
      name: "24H 亮燈超商守護站",
      zone: "彩虹大道便利商店旁",
      desc: "門口照明極佳，與社區巡守點連線，夜間返家可作為安全中繼點。",
      confirmations: 16,
      x: 78,
      y: 272
    },
    {
      id: "pin-5",
      type: "warning",
      name: "捷運北側 3 號暗巷",
      zone: "捷運站北側暗巷",
      desc: "晚間十點後兩盞路燈常故障，曾有 2 筆夜間口哨與言語騷擾回報，建議改走主幹道。",
      confirmations: 9,
      x: 92,
      y: 158
    },
    {
      id: "pin-6",
      type: "warning",
      name: "東側施工圍籬轉角",
      zone: "共融公園東側人行道",
      desc: "施工通道狹窄且視線死角多，夜間行經請保持通話或結伴同行。",
      confirmations: 7,
      x: 410,
      y: 168
    },
    {
      id: "pin-7",
      type: "warning",
      name: "夜市外圍候車暗處",
      zone: "夜市外圍公車站",
      desc: "深夜人潮散去後光線較暗，曾有不友善注視與挑釁言語回報。",
      confirmations: 5,
      x: 382,
      y: 266
    }
  ];

  const REPORT_TYPES = [
    { id: "harassment", label: "言語騷擾或跟蹤疑慮", pinType: "warning", hint: "匿名加密・標示警示熱點" },
    { id: "lighting", label: "夜間路燈照明不足", pinType: "warning", hint: "匿名加密・標示暗巷疑慮" },
    { id: "unfriendly", label: "空間或店家不友善對待", pinType: "warning", hint: "匿名加密・提醒社群避開" },
    { id: "friendly_new", label: "推薦 LGBTQ+ 友善空間", pinType: "friendly", hint: "分享安心據點・點亮地圖" }
  ];

  const ZONE_COORDS = {
    "捷運站北側暗巷": { x: 112, y: 142 },
    "彩虹大道便利商店旁": { x: 162, y: 185 },
    "共融公園東側人行道": { x: 438, y: 150 },
    "夜市外圍公車站": { x: 356, y: 278 }
  };

  const SCENARIOS = {
    street: {
      situation: "深夜 11 點走過捷運站外，後方兩名路人突然對著你的穿著吹口哨並大聲嘲笑：「男不男女不女的真怪！」此時你該如何優先應變？",
      options: [
        {
          label: "A. 停下腳步回頭與對方理論對罵",
          guidance: "⚠️ 人身安全第一：深夜在人煙稀少處與挑釁者正面對罵，極易升高肢體衝突風險。建議保持冷靜、不與其眼神糾纏，加快步入明亮商店。",
          safe: false
        },
        {
          label: "B. 保持冷靜不回頭，快速移動至有店員／監視器的 24H 超商並開啟手機錄音或撥打友人電話",
          guidance: "✅ 最佳安全應變！不與挑釁者產生情緒耗損，第一時間移動至 SafePride 地圖上的「❤️ 友善超商／亮燈空間」，並記下時間地點稍後匿名回報提醒社群。",
          safe: true
        },
        {
          label: "C. 忍氣吞聲走進更暗的小巷想趕快甩開他們",
          guidance: "⚠️ 切勿走入暗巷！陌生暗巷容易遇到死胡同或視線死角，務必往有路燈、車流與店家的主幹道移動。",
          safe: false
        }
      ]
    },
    transit: {
      situation: "搭乘捷運或公車時，身旁乘客故意大聲對同行友人說：「現在這種人真噁心，怎麼敢這樣出門？」並持續用不友善眼光盯著你。",
      options: [
        {
          label: "A. 戴上耳機默默忍耐到終點站，事後感到嚴重內耗",
          guidance: "💡 自我保護是可以的，但你不必獨自承受！移動到車廂其他位置或靠近車門對講機，能有效切斷不友善視線，下車後記得透過模擬與支持資源照顧自己的情緒。",
          safe: false
        },
        {
          label: "B. 立即起身換至靠近司機／列車長或人群較多的車廂，必要時請站務人員協助",
          guidance: "✅ 非常聰明的界線保護！利用大眾運輸的移動自由度立即遠離不友善源頭，若對方有持續跟蹤或辱罵行為，可按車廂緊急對講機請站務人員處理。",
          safe: true
        },
        {
          label: "C. 當場大聲要求對方道歉",
          guidance: "⚠️ 密閉空間中直接要求道歉可能會激怒對方引發推擠。若決定發聲，建議先確認周圍有其他乘客或站務員在場，並簡短堅定表達「請停止對我的騷擾」後移動位置。",
          safe: false
        }
      ]
    },
    work: {
      situation: "在學校分組或公司茶水間，聽到同學／同事拿多元性別開低俗玩笑，雖然不是直接指著你，但氣氛讓你非常不舒服。",
      options: [
        {
          label: "A. 視自身安全與關係程度，用溫和但明確的一句話轉移界線：「這種玩笑對某些人其實蠻傷人的，我們聊回企劃吧。」",
          guidance: "✅ 溫柔而堅定的發聲（Speak Out）！不貼道德標籤、直接點出感受並導回正題，常能讓原本沒意識到冒犯的人安靜下來。",
          safe: true
        },
        {
          label: "B. 跟著尷尬陪笑，假裝自己也不在乎",
          guidance: "💡 若當下評估出櫃或表達立場有職場報復風險，先保護自己完全沒關係！事後可匿名紀錄事件並向性別友善同事或輔導／申訴管道諮詢。",
          safe: false
        },
        {
          label: "C. 在公開群組截圖公審對方",
          guidance: "⚠️ 未經蒐證或評估下公開指責容易引發名譽或職場反彈。建議先記錄對話日期與在場證人，諮詢性平會或伴侶盟等專業單位再採取行動。",
          safe: false
        }
      ]
    }
  };

  const BYSTANDER_GUIDES = {
    distract: {
      bubble: "「嗨！原來你在這，我找你超久了！」",
      script: "【分散注意力（最安全推薦）】不需要與騷擾者起衝突！你可以自然地走到受困者身邊，假裝是老朋友問：「欸你怎麼在這？我們快遲到了！」或假裝問路、不小心掉東西，自然打破騷擾情境並帶對方離開現場。"
    },
    care: {
      bubble: "「你還好嗎？我陪你走去亮一點的地方。」",
      script: "【陪伴與事後關懷】當衝突結束或騷擾者離開後，走上前溫柔詢問：「剛才那樣很不好受吧？你還好嗎？需要我陪你走到捷運站、或幫你叫車嗎？」讓當事人知道這座城市裡有人站在他身邊。"
    },
    delegate: {
      bubble: "「不好意思，那邊有人需要協助，可以幫忙嗎？」",
      script: "【尋求協力支援】若自己一個人不敢上前，立即向超商店員、捷運站務員、警衛或公車司機通報，也可以請身旁其他路人一起關注現場並協助錄影存證或報警。"
    },
    direct: {
      bubble: "「請停止這樣對待別人，這樣很不尊重人。」",
      script: "【直接安全制止】確認自己與周圍環境安全無虞、且對方無危險武器時，用簡短、平靜且堅定的語氣明確指出行為不當，接著將注意力轉向關心受騷擾者，避免陷入無止盡的爭吵。"
    }
  };

  const AVATAR_EMOJIS = ["👑", "🧑🏾", "🧢"];

  let state = loadState();
  let currentReportTypeIdx = 0;
  let currentMapFilter = "all";
  let currentScenarioKey = "street";
  let currentBystanderKey = "distract";
  const verifiedPinsSession = new Set();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      const parsed = JSON.parse(raw);
      return {
        coins: Number.isFinite(parsed.coins) ? parsed.coins : 200,
        gems: Number.isFinite(parsed.gems) ? parsed.gems : 40,
        avatarIndex: Number.isFinite(parsed.avatarIndex) ? parsed.avatarIndex : 0,
        pins: Array.isArray(parsed.pins) && parsed.pins.length ? parsed.pins : structuredClone(INITIAL_PINS),
        userReports: Array.isArray(parsed.userReports) ? parsed.userReports : [],
        petitionCount: Number.isFinite(parsed.petitionCount) ? parsed.petitionCount : 128,
        petitioned: Boolean(parsed.petitioned),
        badges: Array.isArray(parsed.badges) ? parsed.badges : ["初入城市守護者"],
        selectedPinId: parsed.selectedPinId || "pin-1",
        safeRouteOn: Boolean(parsed.safeRouteOn)
      };
    } catch {
      return getDefaultState();
    }
  }

  function getDefaultState() {
    return {
      coins: 200,
      gems: 40,
      avatarIndex: 0,
      pins: structuredClone(INITIAL_PINS),
      userReports: [],
      petitionCount: 128,
      petitioned: false,
      badges: ["初入城市守護者"],
      selectedPinId: "pin-1",
      safeRouteOn: false
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 忽略瀏覽器隱私模式儲存限制
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  function addReward(coinsDelta, gemsDelta, reason) {
    state.coins += coinsDelta;
    state.gems += gemsDelta;
    saveState();
    renderHud();
    renderMeView();
    const parts = [];
    if (coinsDelta) parts.push(`+${coinsDelta} ⭐`);
    if (gemsDelta) parts.push(`+${gemsDelta} 💎`);
    showToast(`${reason}（獲得 ${parts.join(" ")}）`);
  }

  function unlockBadge(badgeName) {
    if (!state.badges.includes(badgeName)) {
      state.badges.push(badgeName);
      saveState();
      renderMeView();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ================= 頂部 HUD 與分頁 ================= */
  function initHud() {
    const avatars = document.querySelectorAll("#hud-avatar-switcher .voxel-avatar");
    avatars.forEach((av) => {
      av.addEventListener("click", () => {
        state.avatarIndex = Number(av.dataset.av);
        saveState();
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
        if (target === "map") renderFullMap();
        if (target === "me") renderMeView();
      });
    });

    document.getElementById("coin-pill-btn").addEventListener("click", () => {
      openModal(
        "⭐ 驕傲守護幣說明",
        `<p>目前擁有 <strong>${state.coins} ⭐</strong> 守護幣！</p>
         <ul>
           <li>在地圖上驗證真實空間資訊：<strong>+10 ⭐</strong></li>
           <li>提交一次匿名安全或友善空間回報：<strong>+25 ⭐</strong></li>
           <li>參與公共環境改善連署：<strong>+15 ⭐</strong></li>
         </ul>`
      );
    });

    document.getElementById("gem-pill-btn").addEventListener("click", () => {
      openModal(
        "💎 勇氣寶石說明",
        `<p>目前擁有 <strong>${state.gems} 💎</strong> 勇氣寶石！</p>
         <ul>
           <li>完成「③ 情境模擬，提升應變」演練：<strong>+10 💎</strong></li>
           <li>練習「④ 旁觀者指南」暖心金句：<strong>+5 💎</strong></li>
         </ul>`
      );
    });

    document.getElementById("quick-sos-btn").addEventListener("click", () => {
      openModal(
        "🚨 緊急安全與支援專線",
        `<p>若當下正面臨跟蹤、騷擾或人身安全威脅，請優先走入亮燈的超商、捷運站務室，並撥打：</p>
         <ul>
           <li><strong>110</strong>：緊急報案專線</li>
           <li><strong>113</strong>：24 小時保護專線</li>
           <li><strong>1925</strong>：衛福部 24 小時安心專線</li>
           <li><strong>(02) 2392-1969</strong>：台灣同志諮詢熱線（週一至五 14:00–22:00）</li>
         </ul>`
      );
    });

    document.getElementById("cta-download-btn").addEventListener("click", () => {
      openModal(
        "🌈 SafePride 驕傲同行 — 立即體驗",
        `<p>歡迎加入 <strong>「擁抱多元 × 共同守護」</strong> 行動！你現在使用的已經是完整可互動的 Web App 版本，可直接加入手機主畫面隨時使用：</p>
         <ul>
           <li>📱 <strong>iOS Safari</strong>：點選下方「分享」→「加入主畫面」</li>
           <li>🤖 <strong>Android Chrome</strong>：點選右上選單 →「安裝應用程式」</li>
         </ul>
         <p style="margin-top:10px;color:#544e70;">更安全、友善的城市，從你我開始 ♡</p>`
      );
    });

    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("info-modal").addEventListener("click", (e) => {
      if (e.target.id === "info-modal") closeModal();
    });

    renderHud();
  }

  function renderHud() {
    document.getElementById("hud-coins").textContent = state.coins;
    document.getElementById("hud-gems").textContent = state.gems;
    document.querySelectorAll("#hud-avatar-switcher .voxel-avatar").forEach((av) => {
      av.classList.toggle("active", Number(av.dataset.av) === state.avatarIndex);
    });
  }

  function openModal(title, html) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = html;
    document.getElementById("info-modal").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("info-modal").classList.add("hidden");
  }

  /* ================= ① 友善地圖與安全路線 ================= */
  function initHomeMap() {
    document.querySelectorAll("#home-map-filters .map-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#home-map-filters .map-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentMapFilter = btn.dataset.filter;
        renderHomeMapPins();
      });
    });

    const routeBtn = document.getElementById("toggle-safe-route-btn");
    routeBtn.addEventListener("click", () => {
      state.safeRouteOn = !state.safeRouteOn;
      saveState();
      renderSafeRouteState();
      showToast(state.safeRouteOn ? "已避開黃色警示熱點，規劃發光安全返家路線！" : "已關閉路線規劃顯示");
    });

    document.getElementById("verify-pin-btn").addEventListener("click", () => {
      const pin = state.pins.find((p) => p.id === state.selectedPinId);
      if (!pin) return;
      if (verifiedPinsSession.has(pin.id)) {
        showToast("你剛才已經確認過這個地點囉！");
        return;
      }
      verifiedPinsSession.add(pin.id);
      pin.confirmations += 1;
      saveState();
      renderPinInspector();
      addReward(10, 0, `感謝確認「${pin.name}」資訊`);
    });

    renderSafeRouteState();
    renderHomeMapPins();
    renderPinInspector();
  }

  function renderSafeRouteState() {
    const path = document.getElementById("safe-route-path");
    const pill = document.getElementById("route-status-pill");
    const btn = document.getElementById("toggle-safe-route-btn");
    path.classList.toggle("hidden", !state.safeRouteOn);
    pill.classList.toggle("hidden", !state.safeRouteOn);
    btn.classList.toggle("active", state.safeRouteOn);
  }

  function renderHomeMapPins() {
    const layer = document.getElementById("home-map-pins-layer");
    const filtered = state.pins.filter((p) => currentMapFilter === "all" || p.type === currentMapFilter);

    layer.innerHTML = filtered.map((pin) => buildPinSvg(pin, pin.id === state.selectedPinId, 1)).join("");

    layer.querySelectorAll(".map-pin-group").forEach((g) => {
      g.addEventListener("click", () => {
        state.selectedPinId = g.dataset.id;
        saveState();
        renderHomeMapPins();
        renderPinInspector();
      });
    });
  }

  function buildPinSvg(pin, isSelected, scaleFactor) {
    const ring = isSelected
      ? `<circle cx="${pin.x}" cy="${pin.y}" r="${21 * scaleFactor}" fill="none" stroke="#4cffb3" stroke-width="2.5" stroke-dasharray="4 3" />`
      : "";

    if (pin.type === "friendly") {
      return `
        <g class="map-pin-group" data-id="${escapeHtml(pin.id)}">
          ${ring}
          <circle cx="${pin.x}" cy="${pin.y}" r="${14 * scaleFactor}" fill="#ff4e7e" stroke="#ffffff" stroke-width="2.2" />
          <text x="${pin.x}" y="${pin.y + 4.5}" text-anchor="middle" font-size="${13 * scaleFactor}" fill="#ffffff">♥</text>
          <title>${escapeHtml(pin.name)}</title>
        </g>
      `;
    }
    return `
      <g class="map-pin-group" data-id="${escapeHtml(pin.id)}">
        ${ring}
        <polygon points="${pin.x},${pin.y - 15 * scaleFactor} ${pin.x + 15 * scaleFactor},${pin.y + 12 * scaleFactor} ${pin.x - 15 * scaleFactor},${pin.y + 12 * scaleFactor}"
          fill="#ffd13b" stroke="#24193d" stroke-width="2" stroke-linejoin="round" />
        <text x="${pin.x}" y="${pin.y + 8}" text-anchor="middle" font-size="${14 * scaleFactor}" font-weight="900" fill="#24193d">!</text>
        <title>${escapeHtml(pin.name)}</title>
      </g>
    `;
  }

  function renderPinInspector() {
    const pin = state.pins.find((p) => p.id === state.selectedPinId) || state.pins[0];
    if (!pin) return;
    document.getElementById("pi-title").textContent = pin.name;
    document.getElementById("pi-desc").textContent = `${pin.desc}（已有 ${pin.confirmations} 人確認）`;
    const badge = document.getElementById("pi-badge");
    badge.className = `pi-badge ${pin.type}`;
    badge.textContent = pin.type === "friendly" ? "❤️ 友善空間" : "⚠️ 安全疑慮熱點";
  }

  /* ================= ② 匿名回報與傾斜手機提交 ================= */
  function initReportModule() {
    document.getElementById("rep-prev-btn").addEventListener("click", () => {
      currentReportTypeIdx = (currentReportTypeIdx - 1 + REPORT_TYPES.length) % REPORT_TYPES.length;
      renderReportType();
    });

    document.getElementById("rep-next-btn").addEventListener("click", () => {
      currentReportTypeIdx = (currentReportTypeIdx + 1) % REPORT_TYPES.length;
      renderReportType();
    });

    document.getElementById("submit-report-btn").addEventListener("click", () => {
      const repType = REPORT_TYPES[currentReportTypeIdx];
      const zone = document.getElementById("rep-zone-select").value;
      const note = document.getElementById("rep-note-input").value.trim() || `${repType.label}，請社群夥伴留意。`;
      const baseCoord = ZONE_COORDS[zone] || { x: 260, y: 160 };
      const jitterX = Math.round((Math.random() - 0.5) * 34);
      const jitterY = Math.round((Math.random() - 0.5) * 26);

      const newPin = {
        id: `pin-user-${Date.now()}`,
        type: repType.pinType,
        name: `${zone}・${repType.pinType === "friendly" ? "友善新據點" : "社群安全提醒"}`,
        zone,
        desc: note,
        confirmations: 1,
        x: Math.max(40, Math.min(480, baseCoord.x + jitterX)),
        y: Math.max(40, Math.min(290, baseCoord.y + jitterY))
      };

      state.pins.push(newPin);
      state.selectedPinId = newPin.id;
      state.userReports.unshift({
        id: newPin.id,
        date: new Date().toISOString().slice(0, 10),
        category: repType.label,
        zone,
        note
      });

      document.getElementById("rep-note-input").value = "";
      unlockBadge("首次匿名守護者");
      saveState();
      renderHomeMapPins();
      renderPinInspector();
      renderAnalytics();
      addReward(25, 0, "匿名回報成功並已標記於地圖");
    });

    renderReportType();
  }

  function renderReportType() {
    const rep = REPORT_TYPES[currentReportTypeIdx];
    document.getElementById("rep-type-label").textContent = rep.label;
    document.getElementById("phone-mode-hint").textContent = rep.hint;
    const iconBox = document.getElementById("phone-icon-box");
    const isFriendly = rep.pinType === "friendly";
    iconBox.classList.toggle("heart-mode", isFriendly);
    iconBox.textContent = isFriendly ? "♥" : "!";
  }

  /* ================= ③ 情境模擬，提升應變 ================= */
  function initSimulator() {
    document.querySelectorAll("#sim-scenario-pills .scen-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#sim-scenario-pills .scen-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        currentScenarioKey = pill.dataset.scen;
        renderScenario();
      });
    });

    document.querySelectorAll(".quick-pill-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        const box = document.getElementById("sim-guidance-box");
        if (btn.dataset.quick === "deescalate") {
          box.innerHTML = `<strong>🗣️ 應對言語騷擾三口訣</strong><p>1. 不與對方互罵對視 → 2. 快速往光亮有店員處移動 → 3. 事後記錄特徵並於 SafePride 匿名回報提醒大家。</p>`;
        } else {
          box.innerHTML = `<strong>📞 立即尋求協助管道</strong><p>進入便利商店或捷運站務台向工作人員求助；若遇跟蹤威脅直接撥打 110，並聯繫「我的」分頁內的熱線支持。</p>`;
        }
      });
    });

    renderScenario();
  }

  function renderScenario() {
    const sc = SCENARIOS[currentScenarioKey];
    document.getElementById("sim-situation-text").textContent = sc.situation;
    const wrap = document.getElementById("sim-options-wrap");
    wrap.innerHTML = sc.options
      .map((opt, i) => `<button type="button" class="sim-opt-btn" data-idx="${i}">${escapeHtml(opt.label)}</button>`)
      .join("");

    wrap.querySelectorAll(".sim-opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        wrap.querySelectorAll(".sim-opt-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        const opt = sc.options[Number(btn.dataset.idx)];
        document.getElementById("sim-guidance-box").innerHTML = `
          <strong>${opt.safe ? "✅ 推薦安全策略" : "⚠️ 風險提示與建議"}</strong>
          <p>${escapeHtml(opt.guidance)}</p>
        `;
        unlockBadge("應變演練達人");
        addReward(0, 10, "完成情境應變練習");
      });
    });
  }

  /* ================= ④ 旁觀者指南，共同守護 ================= */
  function initBystander() {
    document.querySelectorAll("#bystander-tabs .by-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#bystander-tabs .by-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentBystanderKey = btn.dataset.by;
        renderBystander();
      });
    });

    document.getElementById("copy-bystander-btn").addEventListener("click", async () => {
      const guide = BYSTANDER_GUIDES[currentBystanderKey];
      try {
        await navigator.clipboard.writeText(`${guide.bubble} ${guide.script}`);
      } catch {
        // 靜默處理剪貼簿限制
      }
      unlockBadge("暖心旁觀守護者");
      addReward(0, 5, "已練習旁觀者暖心守護金句");
    });

    renderBystander();
  }

  function renderBystander() {
    const g = BYSTANDER_GUIDES[currentBystanderKey];
    document.getElementById("bystander-bubble").textContent = g.bubble;
    document.getElementById("bystander-script").textContent = g.script;
  }

  /* ================= ⑤ 數據分析，推動改變 ================= */
  function initAnalytics() {
    document.getElementById("petition-btn").addEventListener("click", () => {
      if (state.petitioned) {
        showToast("你已經參與過本次增設照明與友善標章連署，謝謝你的力量！");
        return;
      }
      state.petitioned = true;
      state.petitionCount += 1;
      unlockBadge("城市環境推動者");
      saveState();
      renderAnalytics();
      addReward(15, 0, "完成城市環境改善連署");
    });

    renderAnalytics();
  }

  function renderAnalytics() {
    const friendlyCount = state.pins.filter((p) => p.type === "friendly").length;
    const warningCount = state.pins.filter((p) => p.type === "warning").length;
    document.getElementById("kpi-friendly-count").textContent = friendlyCount;
    document.getElementById("kpi-warning-count").textContent = warningCount;
    document.getElementById("kpi-petition-count").textContent = state.petitionCount;

    const chartSvg = document.getElementById("analytics-chart-svg");
    const bars = [
      { label: "8月", val: 38, color: "#ff5d78" },
      { label: "9月", val: 48, color: "#ff9a3c" },
      { label: "10月", val: 62, color: "#ffd13b" },
      { label: "11月", val: Math.min(92, 68 + state.userReports.length * 6), color: "#45d37b" },
      { label: "友善目標", val: 88, color: "#3aa8ff" }
    ];

    const barWidth = 32;
    const gap = 20;
    const startX = 20;
    const baseBottom = 76;

    const barsSvg = bars
      .map((b, i) => {
        const h = Math.round((b.val / 100) * 58);
        const x = startX + i * (barWidth + gap);
        const y = baseBottom - h;
        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="6" fill="${b.color}" opacity="0.9" />
          <text x="${x + barWidth / 2}" y="${baseBottom + 14}" text-anchor="middle" font-size="10" font-weight="700" fill="#544e70">${b.label}</text>
        `;
      })
      .join("");

    const linePts = bars
      .map((b, i) => {
        const h = Math.round((b.val / 100) * 58);
        const x = startX + i * (barWidth + gap) + barWidth / 2;
        const y = baseBottom - h - 4;
        return `${x},${y}`;
      })
      .join(" ");

    chartSvg.innerHTML = `
      ${barsSvg}
      <polyline points="${linePts}" fill="none" stroke="#24193d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    `;
  }

  /* ================= 視圖 2：全區地圖探索 ================= */
  function initFullMap() {
    document.getElementById("map-search-input").addEventListener("input", renderFullMap);
    document.getElementById("map-view-route-btn").addEventListener("click", () => {
      state.safeRouteOn = !state.safeRouteOn;
      saveState();
      renderSafeRouteState();
      renderFullMap();
    });
  }

  function renderFullMap() {
    const query = (document.getElementById("map-search-input").value || "").trim().toLowerCase();
    const filtered = state.pins.filter(
      (p) => !query || p.name.toLowerCase().includes(query) || p.zone.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query)
    );

    document.getElementById("map-list-count").textContent = filtered.length;

    const fullSvg = document.getElementById("full-city-map-svg");
    const routeSvg = state.safeRouteOn
      ? `<path class="safe-route-path" d="M 96 310 L 180 310 L 180 258 L 385 258 L 385 126 L 495 126 L 495 72" fill="none" stroke="#4cffb3" stroke-width="6" stroke-dasharray="10 6" />`
      : "";

    const scaledPins = filtered
      .map((p) => buildPinSvg({ ...p, x: Math.round(p.x * 1.22), y: Math.round(p.y * 1.14) }, p.id === state.selectedPinId, 1.08))
      .join("");

    fullSvg.innerHTML = `
      <rect width="640" height="380" rx="14" fill="#0e2a4a" />
      <g stroke="#52d1ff" stroke-width="5" stroke-opacity="0.4" stroke-linecap="round">
        <line x1="180" y1="14" x2="180" y2="366" />
        <line x1="385" y1="14" x2="385" y2="366" />
        <line x1="14" y1="126" x2="626" y2="126" />
        <line x1="14" y1="258" x2="626" y2="258" />
      </g>
      ${routeSvg}
      ${scaledPins}
    `;

    fullSvg.querySelectorAll(".map-pin-group").forEach((g) => {
      g.addEventListener("click", () => {
        state.selectedPinId = g.dataset.id;
        saveState();
        renderFullMap();
        renderPinInspector();
      });
    });

    const listEl = document.getElementById("full-map-locations-list");
    listEl.innerHTML = filtered
      .map(
        (p) => `
      <div class="loc-card" data-id="${escapeHtml(p.id)}">
        <div class="loc-card-top">
          <span>${p.type === "friendly" ? "❤️" : "⚠️"} ${escapeHtml(p.name)}</span>
          <span>👍 ${p.confirmations}</span>
        </div>
        <p>${escapeHtml(p.desc)}</p>
      </div>
    `
      )
      .join("");

    listEl.querySelectorAll(".loc-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedPinId = card.dataset.id;
        saveState();
        renderFullMap();
      });
    });
  }

  /* ================= 視圖 3：我的守護護照 ================= */
  function renderMeView() {
    document.getElementById("passport-avatar-display").textContent = AVATAR_EMOJIS[state.avatarIndex] || "👑";
    document.getElementById("me-coins").textContent = state.coins;
    document.getElementById("me-gems").textContent = state.gems;
    document.getElementById("me-report-count").textContent = state.userReports.length;

    const allBadges = ["初入城市守護者", "首次匿名守護者", "應變演練達人", "暖心旁觀守護者", "城市環境推動者"];
    document.getElementById("me-badges-grid").innerHTML = allBadges
      .map((b) => {
        const has = state.badges.includes(b);
        return `<div class="ach-badge ${has ? "unlocked" : ""}">${has ? "🏅" : "🔒"} ${escapeHtml(b)}</div>`;
      })
      .join("");

    const list = document.getElementById("me-reports-list");
    if (!state.userReports.length) {
      list.innerHTML = `<p style="font-size:13px;color:#544e70;">尚未提交任何回報，回到「首頁」區塊 ② 即可一鍵匿名分享安全資訊！</p>`;
    } else {
      list.innerHTML = state.userReports
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

  /* ================= 初始化 ================= */
  document.addEventListener("DOMContentLoaded", () => {
    initHud();
    initHomeMap();
    initReportModule();
    initSimulator();
    initBystander();
    initAnalytics();
    initFullMap();
    renderMeView();
  });
})();
