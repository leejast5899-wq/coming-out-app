(() => {
  "use strict";

  const STORAGE_KEY = "glowout_app_state_v1";

  const DEFAULT_LOGS = [
    {
      id: "log-1",
      date: "2026-10-20",
      target: "媽媽",
      topic: "婚姻與家庭觀",
      score: 2,
      note: "親戚問何時帶女友回家時，媽媽笑說不要亂講話，但私下又叮嚀我還是要找個伴比較不孤單。"
    },
    {
      id: "log-2",
      date: "2026-10-29",
      target: "手足",
      topic: "影視作品",
      score: 5,
      note: "跟姊姊聊《關於我和鬼變成家人的那件事》，她很自然地說家人能互相理解最重要。"
    },
    {
      id: "log-3",
      date: "2026-11-06",
      target: "媽媽",
      topic: "影視作品",
      score: 3,
      note: "一起看新聞聊到同志伴侶一起買房照顧彼此，媽媽沒有轉台，只說兩個人能互相扶持也不錯。"
    },
    {
      id: "log-4",
      date: "2026-11-14",
      target: "媽媽",
      topic: "身邊朋友故事",
      score: 4,
      note: "跟媽媽提到大學朋友很照顧自己的同性伴侶，媽媽說：『只要是好孩子、對你好最重要。』態度明顯軟化。"
    }
  ];

  const DEFAULT_STATE = {
    readiness: {
      support: 8,
      independence: 7,
      trust: 7,
      emotion: 7
    },
    probeLogs: DEFAULT_LOGS,
    safety: {
      checkContact: true,
      checkPause: true,
      checkPlace: false,
      checkSelfcare: false,
      contactName: "大學摯友 小安（已約好週六晚上電話待命）",
      pausePhrase: "媽，我看到你很驚訝，我們先喝口水休息一下，明天再慢慢聊好嗎？",
      safePlace: "自己的租屋處"
    }
  };

  let state = loadState();
  let activeFilterTarget = "全部";

  // 轉譯器狀態
  const translatorState = {
    target: "traditional_parents",
    fear: "lonely",
    frame: "love_trust",
    tone: 2
  };

  // 模擬器狀態
  const simState = {
    scenarioKey: "mom",
    turnIndex: 0,
    temp: 45,
    finished: false
  };

  /* ================= 狀態存取 ================= */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        readiness: { ...DEFAULT_STATE.readiness, ...(parsed.readiness || {}) },
        probeLogs: Array.isArray(parsed.probeLogs) ? parsed.probeLogs : structuredClone(DEFAULT_LOGS),
        safety: { ...DEFAULT_STATE.safety, ...(parsed.safety || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 忽略無痕模式儲存限制
    }
  }

  /* ================= 通用工具 ================= */
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 2600);
  }

  async function copyText(text, successMsg) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(successMsg);
        return;
      }
    } catch {
      // fallback below
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch {
      showToast("請手動選取文字複製");
    }
    document.body.removeChild(ta);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ================= 頂部模式與隱私切換 ================= */
  function initTopControls() {
    const btnApp = document.getElementById("btn-mode-app");
    const btnPm = document.getElementById("btn-mode-pm");
    const viewApp = document.getElementById("view-app");
    const viewPm = document.getElementById("view-pm");

    function switchMainMode(mode) {
      const isApp = mode === "app";
      btnApp.classList.toggle("active", isApp);
      btnPm.classList.toggle("active", !isApp);
      btnApp.setAttribute("aria-selected", String(isApp));
      btnPm.setAttribute("aria-selected", String(!isApp));
      viewApp.classList.toggle("hidden", !isApp);
      viewPm.classList.toggle("hidden", isApp);
    }

    btnApp.addEventListener("click", () => switchMainMode("app"));
    btnPm.addEventListener("click", () => switchMainMode("pm"));

    // 手機 / 桌面視角切換
    const frameBtn = document.getElementById("toggle-frame-btn");
    const deviceFrame = document.getElementById("device-frame");
    const frameIcon = document.getElementById("frame-btn-icon");
    const frameLabel = document.getElementById("frame-btn-label");

    frameBtn.addEventListener("click", () => {
      const isMobile = deviceFrame.classList.toggle("mobile-mode");
      frameIcon.textContent = isMobile ? "💻" : "📲";
      frameLabel.textContent = isMobile ? "桌面視角" : "手機視角";
      if (!viewApp.classList.contains("hidden")) {
        switchMainMode("app");
      }
      showToast(isMobile ? "已切換為手機 App 預覽視角" : "已切換為桌面寬版視角");
    });

    // 隱私偽裝模式
    const disguiseBtn = document.getElementById("privacy-disguise-btn");
    const exitDisguiseBtn = document.getElementById("exit-disguise-btn");
    const disguiseScreen = document.getElementById("disguise-screen");
    const appShell = document.getElementById("app-shell");

    function toggleDisguise(forceState) {
      const shouldShow = typeof forceState === "boolean"
        ? forceState
        : disguiseScreen.classList.contains("hidden");
      disguiseScreen.classList.toggle("hidden", !shouldShow);
      appShell.classList.toggle("hidden", shouldShow);
      disguiseScreen.setAttribute("aria-hidden", String(!shouldShow));
    }

    disguiseBtn.addEventListener("click", () => toggleDisguise(true));
    exitDisguiseBtn.addEventListener("click", () => toggleDisguise(false));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modal = document.getElementById("letter-modal");
        if (!modal.classList.contains("hidden")) {
          modal.classList.add("hidden");
          return;
        }
        toggleDisguise();
      }
    });

    // App 五大分頁切換
    const navBtns = document.querySelectorAll(".app-nav-btn");
    const panels = document.querySelectorAll(".tab-panel");
    navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.dataset.tab;
        navBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.setAttribute("aria-selected", String(active));
        });
        panels.forEach((p) => {
          p.classList.toggle("active", p.id === `tab-${targetTab}`);
        });
      });
    });
  }

  /* ================= 分頁 1：準備度雷達與試水溫紀錄 ================= */
  function initReadinessAndLogs() {
    const dims = ["support", "independence", "trust", "emotion"];
    dims.forEach((key) => {
      const slider = document.getElementById(`slider-${key}`);
      const valEl = document.getElementById(`val-${key}`);
      slider.value = state.readiness[key];
      valEl.textContent = state.readiness[key];

      slider.addEventListener("input", () => {
        state.readiness[key] = Number(slider.value);
        valEl.textContent = slider.value;
        saveState();
        renderReadiness();
      });
    });

    // 預設今天日期
    const dateInput = document.getElementById("log-date");
    dateInput.value = new Date().toISOString().slice(0, 10);

    // 反應溫度選取器
    const starBtns = document.querySelectorAll("#star-picker .star-btn");
    const scoreInput = document.getElementById("log-score");
    starBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        starBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        scoreInput.value = btn.dataset.score;
      });
    });

    // 新增紀錄表單
    const form = document.getElementById("probe-log-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const date = document.getElementById("log-date").value;
      const target = document.getElementById("log-target").value;
      const topic = document.getElementById("log-topic").value;
      const score = Number(document.getElementById("log-score").value);
      const note = document.getElementById("log-note").value.trim();

      if (!note) return;

      state.probeLogs.push({
        id: `log-${Date.now()}`,
        date,
        target,
        topic,
        score,
        note
      });
      saveState();
      document.getElementById("log-note").value = "";
      renderLogsAndAnalysis();
      showToast("已新增試水溫紀錄，趨勢分析已更新！");
    });

    // 還原示範資料
    document.getElementById("reset-demo-logs-btn").addEventListener("click", () => {
      state.probeLogs = structuredClone(DEFAULT_LOGS);
      saveState();
      renderLogsAndAnalysis();
      showToast("已還原預設試水溫示範紀錄");
    });

    // 對象篩選
    document.querySelectorAll("#log-filter-pills .filter-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll("#log-filter-pills .filter-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        activeFilterTarget = pill.dataset.target;
        renderLogsAndAnalysis();
      });
    });

    renderReadiness();
    renderLogsAndAnalysis();
  }

  function renderReadiness() {
    const { support, independence, trust, emotion } = state.readiness;
    const total = Math.round(((support + independence + trust + emotion) / 40) * 100);

    document.getElementById("readiness-total-num").textContent = total;
    document.getElementById("hero-readiness-score").textContent = `${total}%`;

    const stagePill = document.getElementById("readiness-stage-pill");
    const titleEl = document.getElementById("readiness-advice-title");
    const descEl = document.getElementById("readiness-advice-desc");

    if (total < 50) {
      stagePill.textContent = "🌱 蓄力保護期";
      titleEl.textContent = "建議先強化支持網與退路";
      descEl.textContent = "目前在經濟獨立或心理支撐上還有風險，建議先累積試水溫觀察與安心防護計畫，不必勉強現在攤牌。";
    } else if (total < 75) {
      stagePill.textContent = "🌤️ 溫柔試探期";
      titleEl.textContent = "適合先從低壓力對象或書信切入";
      descEl.textContent = "你已具備基本支撐力！可先從手足、摯友，或透過電影話題與日常互動觀察長輩反應，再用「緩衝框架」慢慢開門。";
    } else {
      stagePill.textContent = "☀️ 準備就緒期";
      titleEl.textContent = "身心與退路條件成熟";
      descEl.textContent = "你的內外資源相當穩固，建議先到「敘事轉譯室」產出專屬家書，並在「模擬演練室」預演回應後選擇安心時機開啟對話。";
    }

    renderRadarSvg({ support, independence, trust, emotion });
  }

  function renderRadarSvg({ support, independence, trust, emotion }) {
    const cx = 85;
    const cy = 85;
    const maxR = 54;
    const values = [support / 10, independence / 10, trust / 10, emotion / 10];
    // 上(支持網), 右(獨立度), 下(關係感), 左(情緒穩)
    const dirs = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];

    const gridLevels = [0.33, 0.66, 1];
    const gridPolys = gridLevels
      .map((lv) => {
        const pts = dirs.map(([dx, dy]) => `${(cx + dx * maxR * lv).toFixed(1)},${(cy + dy * maxR * lv).toFixed(1)}`).join(" ");
        return `<polygon points="${pts}" fill="none" stroke="rgba(164,127,106,0.22)" stroke-width="1" />`;
      })
      .join("");

    const dataPts = values
      .map((v, idx) => {
        const [dx, dy] = dirs[idx];
        return `${(cx + dx * maxR * v).toFixed(1)},${(cy + dy * maxR * v).toFixed(1)}`;
      })
      .join(" ");

    const dots = values
      .map((v, idx) => {
        const [dx, dy] = dirs[idx];
        const x = (cx + dx * maxR * v).toFixed(1);
        const y = (cy + dy * maxR * v).toFixed(1);
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="#e06d53" stroke="#fff" stroke-width="1.5" />`;
      })
      .join("");

    const svg = `
      <svg viewBox="0 0 170 170" width="170" height="170" role="img" aria-label="四維度準備度雷達圖">
        ${gridPolys}
        <line x1="${cx}" y1="${cy - maxR}" x2="${cx}" y2="${cy + maxR}" stroke="rgba(164,127,106,0.2)" />
        <line x1="${cx - maxR}" y1="${cy}" x2="${cx + maxR}" y2="${cy}" stroke="rgba(164,127,106,0.2)" />
        <polygon points="${dataPts}" fill="rgba(224,109,83,0.26)" stroke="#e06d53" stroke-width="2" />
        ${dots}
        <text x="${cx}" y="15" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5d534f">支持網</text>
        <text x="155" y="${cy + 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5d534f">獨立</text>
        <text x="${cx}" y="162" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5d534f">關係感</text>
        <text x="15" y="${cy + 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5d534f">情緒</text>
      </svg>
    `;
    document.getElementById("readiness-radar-svg").innerHTML = svg;
  }

  function renderLogsAndAnalysis() {
    document.getElementById("hero-log-count").textContent = `${state.probeLogs.length} 筆`;

    const filtered = state.probeLogs
      .filter((log) => activeFilterTarget === "全部" || log.target === activeFilterTarget)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    renderTrendChart(filtered);
    renderDiagnosis(filtered);
    renderLogCards(filtered);
  }

  function renderTrendChart(logs) {
    const container = document.getElementById("trend-chart-container");
    const avgBadge = document.getElementById("avg-temp-badge");

    if (logs.length === 0) {
      avgBadge.textContent = "平均溫度：尚無紀錄";
      container.innerHTML = `<p style="color:#8d7f78;font-size:13px;padding:36px 0;text-align:center;">此篩選條件目前沒有紀錄，請從上方新增一筆日常觀察。</p>`;
      return;
    }

    const avg = (logs.reduce((sum, item) => sum + item.score, 0) / logs.length).toFixed(1);
    avgBadge.textContent = `平均溫度：${avg} / 5.0`;

    const w = 480;
    const h = 170;
    const padL = 34;
    const padR = 24;
    const padT = 18;
    const padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const gridLines = [1, 2, 3, 4, 5]
      .map((score) => {
        const y = padT + innerH - ((score - 1) / 4) * innerH;
        return `
          <line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="rgba(164,127,106,0.16)" stroke-dasharray="3 3" />
          <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="#8d7f78">${score}</text>
        `;
      })
      .join("");

    const points = logs.map((log, idx) => {
      const x = logs.length === 1 ? padL + innerW / 2 : padL + (idx / (logs.length - 1)) * innerW;
      const y = padT + innerH - ((log.score - 1) / 4) * innerH;
      return { x, y, log };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath =
      points.length > 1
        ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${padT + innerH} L${points[0].x.toFixed(1)},${padT + innerH} Z`
        : "";

    const dotsAndLabels = points
      .map((p) => {
        const shortDate = p.log.date.slice(5);
        return `
          <g>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#e06d53" stroke="#ffffff" stroke-width="2">
              <title>${escapeHtml(p.log.date)}｜${escapeHtml(p.log.target)}｜${escapeHtml(p.log.topic)}：${p.log.score}分</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#655954">${shortDate}</text>
          </g>
        `;
      })
      .join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="175" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e06d53" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#e06d53" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        ${gridLines}
        ${areaPath ? `<path d="${areaPath}" fill="url(#tempAreaGrad)" />` : ""}
        ${points.length > 1 ? `<path d="${linePath}" fill="none" stroke="#e06d53" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ""}
        ${dotsAndLabels}
      </svg>
    `;
  }

  function renderDiagnosis(logs) {
    const box = document.getElementById("diagnosis-report-content");
    const tagsEl = document.getElementById("best-topic-tags");

    if (logs.length === 0) {
      box.innerHTML = `<p>累積 2 筆以上的試水溫互動紀錄後，系統將自動為您產出關係氣象趨勢與切入建議。</p>`;
      tagsEl.innerHTML = `<span class="topic-tag">尚無資料</span>`;
      return;
    }

    const avg = logs.reduce((s, l) => s + l.score, 0) / logs.length;
    const first = logs[0].score;
    const last = logs[logs.length - 1].score;
    const trendDelta = last - first;

    let trendSummary = "態度維持平穩";
    if (logs.length >= 2 && trendDelta > 0) {
      trendSummary = `呈正向回暖趨勢（由 ${first} 分升至 ${last} 分）`;
    } else if (logs.length >= 2 && trendDelta < 0) {
      trendSummary = `近期出現較多顧慮（由 ${first} 分降至 ${last} 分）`;
    }

    let actionTip = "";
    if (avg >= 3.8) {
      actionTip = "對象整體態度偏友善且具備對話空間，適合進入「敘事轉譯室」採用【愛與信任框架】或【緩衝書信】正式開啟對話。";
    } else if (avg >= 2.8) {
      actionTip = "對方處於「觀望或資訊不足」階段，建議避免在離家最後一刻倉促開口（門把效應），改以輕鬆影視話題持續升溫，或先向支持度最高的手足/朋友結盟。";
    } else {
      actionTip = "目前對象防衛感仍較高，強烈建議先保護自身心理安全與經濟退路，勿急於正面攤牌，先閱讀「安心防護網」建立支持資源。";
    }

    box.innerHTML = `
      <p><strong>對象「${escapeHtml(activeFilterTarget)}」近期觀測（共 ${logs.length} 筆）：</strong>${trendSummary}，平均接納溫度為 <strong>${avg.toFixed(1)} / 5.0</strong>。</p>
      <p>${actionTip}</p>
    `;

    // 找出平均分數最高的話題
    const topicStats = {};
    logs.forEach((l) => {
      if (!topicStats[l.topic]) topicStats[l.topic] = { sum: 0, count: 0 };
      topicStats[l.topic].sum += l.score;
      topicStats[l.topic].count += 1;
    });

    const sortedTopics = Object.entries(topicStats)
      .map(([topic, data]) => ({ topic, avg: data.sum / data.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    tagsEl.innerHTML = sortedTopics
      .map((t) => `<span class="topic-tag">${escapeHtml(t.topic)} (${t.avg.toFixed(1)}★)</span>`)
      .join("");
  }

  function renderLogCards(logs) {
    const listEl = document.getElementById("probe-logs-list");
    if (logs.length === 0) {
      listEl.innerHTML = `<p style="color:#8d7f78;font-size:13px;">尚無符合條件的試水溫紀錄。</p>`;
      return;
    }

    const scoreEmoji = { 1: "1❄️ 排斥", 2: "2☁️ 尷尬", 3: "3🌤️ 中立", 4: "4☀️ 友善", 5: "5🌈 支持" };

    listEl.innerHTML = logs
      .slice()
      .reverse()
      .map(
        (log) => `
      <article class="log-item-card">
        <div class="log-item-top">
          <div class="log-meta-badges">
            <span class="badge-target">${escapeHtml(log.target)}</span>
            <span class="badge-topic">${escapeHtml(log.topic)}</span>
          </div>
          <span class="badge-score">${scoreEmoji[log.score] || `${log.score}分`}</span>
        </div>
        <div class="log-date">${escapeHtml(log.date)}</div>
        <p class="log-note">${escapeHtml(log.note)}</p>
        <button type="button" class="log-delete-btn" data-id="${escapeHtml(log.id)}">刪除紀錄</button>
      </article>
    `
      )
      .join("");

    listEl.querySelectorAll(".log-delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.probeLogs = state.probeLogs.filter((l) => l.id !== btn.dataset.id);
        saveState();
        renderLogsAndAnalysis();
        showToast("已刪除該筆紀錄");
      });
    });
  }

  /* ================= 分頁 2：敘事轉譯室（框架理論） ================= */
  const TARGET_LABELS = {
    traditional_parents: { call: "爸媽", opening: "爸、媽：" },
    anxious_parents: { call: "爸媽", opening: "親愛的爸媽：" },
    siblings: { call: "哥／姊／弟／妹", opening: "嗨，最挺我的家人：" },
    close_friend: { call: "你", opening: "親愛的好朋友：" },
    workplace: { call: "您／夥伴", opening: "嗨，" }
  };

  const FEAR_DATA = {
    lonely: {
      risk: "「反正我以後就是不會結婚生小孩，你們不要再催我了！」",
      safe: "「我也很看重家與陪伴，其實我已經有了互相照顧、一起規劃未來的伴侶，只是對方跟我一樣是同性。」",
      why: "長輩催婚背後往往是「怕你老了沒人照顧」。將焦點轉回「我有照顧好自己、也有穩定伴侶陪伴」，能直接安撫他們對未來的未知恐懼。",
      paragraph: "我知道你們常問我感情的事，其實是因為擔心我未來會孤單、怕沒人照顧。但我想讓你們安心，我一直很認真過生活，也遇到了一個願意跟我互相扶持、一起努力的伴侶，只是他剛好和我同性別。"
    },
    reputation: {
      risk: "「這是我的自由，別人怎麼講我才不在乎，你們也不用管親戚怎麼說！」",
      safe: "「我知道我們家很在乎親友怎麼看，所以我先不急著對外公開，我們可以一起討論讓彼此最舒服的步調。」",
      why: "傳統長輩面臨的是「面子與宗族壓力」。主動釋出『我會顧慮你們的步調、不會逼你們立刻向親戚交代』，能瞬間卸除一半的防備。",
      paragraph: "我理解長輩在親友圈裡有很多無形的壓力，所以我完全不強求你們馬上向任何人解釋或公開。對我而言，你們的感受比外面的眼光更重要，我們可以按照彼此都安心的節奏慢慢來。"
    },
    discrimination: {
      risk: "「現在時代不同了，法律都通過同婚了，你們為什麼要把我想得那麼可憐？」",
      safe: "「我知道你們是怕我在外面受委屈、被貼標籤，但你們給我的愛跟教養，已經讓我很有力量把生活過得很踏實。」",
      why: "先接住父母『怕孩子受傷』的善意，再把這份擔憂轉化為『正因為有家的支持，我才更有力量』，避免陷入世代觀念爭辯。",
      paragraph: "我也知道你們可能會擔心我在社會上會不會受苦、會不會被異樣眼光對待。其實你們一直以來給我很多安全感與教養，現在的我工作穩定、身邊也有友善的朋友圈，台灣現在也有完整的婚姻與醫療法律保障，請不要替我太擔心。"
    },
    confused: {
      risk: "「你們根本不懂就不要亂講，我從以前就是這樣了！」",
      safe: "「這不是一時的衝動，我其實在心裡思考了好幾年，今天想跟你分享，是因為不想在最愛的人面前假裝。」",
      why: "資訊落差常讓對方誤以為是『壓力太大或被影響』。強調『經過長時間自我確認』與『不願對重要的人戴面具』，能增加真實性與尊重感。",
      paragraph: "這並不是最近才發生的事情，也不是受誰影響。其實過去這幾年我反覆思考與確認了很久，之所以現在想讓你知道，是因為你在我生命裡非常重要，我不希望每次相處都要小心翼翼地隱藏真實的自己。"
    }
  };

  const FRAME_DATA = {
    love_trust: {
      badge: "🌱 愛與信任框架",
      intro: "寫這段話／開口前，我猶豫了很久，不是因為不信任你們，而是因為太在乎你們的感受，深怕讓你們擔心。但正因為你們是我最親近、最珍惜的家人，我希望我們之間不需要一直隔著一層說不出口的距離。",
      closing: "不論你們聽完有什麼疑問，我都願意慢慢聊。對我來說，坦白這件事，只是想邀請你們走進我真正的生活裡，讓我們繼續做彼此最重要的家人。"
    },
    stability: {
      badge: "🏡 穩定與幸福框架",
      intro: "想跟你們分享一個關於我生活的近況。這幾年我在工作與生活上都努力站穩腳步，也越來越知道什麼樣的人生讓自己感到踏實和快樂。",
      closing: "其實除了伴侶的性別之外，我的生活目標跟大家沒有什麼不同——同樣想好好工作、孝順你們、經營一個溫暖安穩的家。希望你們看見現在的我，是真的過得很好、很幸福。"
    },
    buffer_letter: {
      badge: "🕰️ 緩衝留白框架（破解門把效應）",
      intro: "之所以選擇用文字而不是在趕時間出門前匆忙開口，是因為我希望我們都能在沒有壓力的狀態下讀這件事，不必急著在幾分鐘內消化所有的情緒。",
      closing: "最後想特別說一聲：你們完全不需要現在就給我任何答案或表態！如果感到震驚或一時不知如何回應，都非常正常。我有附上一份給父母看的溫柔小百科，等你們準備好想聊的時候，我隨時都在。"
    }
  };

  function initTranslator() {
    bindChipGroup("tr-target-group", "target");
    bindChipGroup("tr-fear-group", "fear");

    document.querySelectorAll("#tr-frame-group .frame-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#tr-frame-group .frame-option").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        translatorState.frame = btn.dataset.value;
        updateTranslatorView();
      });
    });

    const toneSlider = document.getElementById("tone-slider");
    const toneLabels = { 1: "含蓄試探", 2: "溫柔堅定", 3: "深情書信" };
    toneSlider.addEventListener("input", () => {
      translatorState.tone = Number(toneSlider.value);
      document.getElementById("tone-label").textContent = toneLabels[translatorState.tone];
      updateTranslatorView();
    });

    document.getElementById("regenerate-script-btn").addEventListener("click", () => {
      updateTranslatorView();
      showToast("已重新生成系統建議草稿");
    });

    document.getElementById("copy-script-btn").addEventListener("click", () => {
      const text = document.getElementById("generated-script").value;
      copyText(text, "已複製專屬出櫃講稿到剪貼簿");
    });

    // 預覽信件 Modal
    const modal = document.getElementById("letter-modal");
    document.getElementById("preview-letter-btn").addEventListener("click", () => {
      document.getElementById("letter-modal-body").textContent = document.getElementById("generated-script").value;
      modal.classList.remove("hidden");
    });
    document.getElementById("close-letter-modal").addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
    document.getElementById("modal-copy-btn").addEventListener("click", () => {
      copyText(document.getElementById("letter-modal-body").textContent, "已複製這封溫柔的信");
    });

    updateTranslatorView();
  }

  function bindChipGroup(groupId, stateKey) {
    const group = document.getElementById(groupId);
    group.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        translatorState[stateKey] = chip.dataset.value;
        updateTranslatorView();
      });
    });
  }

  function updateTranslatorView() {
    const fear = FEAR_DATA[translatorState.fear];
    const frame = FRAME_DATA[translatorState.frame];
    const targetInfo = TARGET_LABELS[translatorState.target];

    document.getElementById("active-frame-badge").textContent = frame.badge;
    document.getElementById("compare-risk-text").textContent = fear.risk;
    document.getElementById("compare-safe-text").textContent = fear.safe;
    document.getElementById("compare-why-text").textContent = fear.why;

    let coreReveal = "其實，我喜歡的是同性，這是我真實且穩定的一部分。";
    if (translatorState.tone === 1) {
      coreReveal = "其實一直有件事想慢慢跟你分享——關於我的感情生活，我更心動、想走下去的對象，是跟我一樣的同性。";
    } else if (translatorState.tone === 3) {
      coreReveal = "我想很誠實地告訴你們，我的性傾向是同性。這份認同讓我學會更認識自己，也更珍惜身邊真正愛我的人。";
    }

    const workplaceAdjust =
      translatorState.target === "workplace"
        ? "在工作與團隊合作上我一樣保持專業，分享這件事只是希望日常聊到家庭與休假時不必刻意閃躲。"
        : fear.paragraph;

    const draft = `${targetInfo.opening}

${frame.intro}

${coreReveal}

${workplaceAdjust}

${frame.closing}`;

    document.getElementById("generated-script").value = draft;
  }

  /* ================= 分頁 3：模擬演練室 ================= */
  const SCENARIOS = {
    mom: {
      avatar: "👩",
      name: "媽媽（關心但傳統）",
      startTemp: 45,
      turns: [
        {
          partnerLine: "「你是不是最近工作壓力太大、太累了，只是還沒遇到對的異性而已？不要亂想啦。」",
          choices: [
            {
              tag: "情緒反擊型",
              text: "「媽你根本不懂，不要每次都否定我的感受！」",
              delta: -15,
              reply: "「我哪有否定你！我還不是為你好，你怎麼說話這麼衝⋯⋯」",
              coach: "當我們直接說「你不懂」時，對方會感受到被指責，防衛心立刻拉高，對話容易演變成情緒對立。"
            },
            {
              tag: "退縮逃避型",
              text: "「好啦好啦，沒事，可能真的是我太累了，當我沒說。」",
              delta: -5,
              reply: "「對嘛，早點休息不要胡思亂想，週末記得回家吃飯。」",
              coach: "這正是典型的「門把效應退縮」——為了避免當下衝突而吞回真相，短期看似平靜，長期卻加深內心的愧疚與孤單。"
            },
            {
              tag: "同理＋框架轉譯",
              text: "「媽，我知道你是擔心我只是迷惘或太累才這樣說。這件事我想了很久，不是一時的壓力，我是認真覺得這樣最真實快樂。」",
              delta: +18,
              reply: "「（嘆口氣，語氣放軟）你真的想了很久喔⋯⋯那你這樣在外面會不會很辛苦？」",
              coach: "滿分示範！先肯定媽媽「擔心你」的善意（降低防衛），再溫和堅定地澄清「這不是一時衝動」，成功把對話導向真正的關心。"
            }
          ]
        },
        {
          partnerLine: "「可是⋯⋯我還是很怕你老了孤零零一個人，以後生病沒人照顧怎麼辦？」",
          choices: [
            {
              tag: "理論說教型",
              text: "「現在異性戀離婚率也這麼高，結婚又不一定有人照顧！」",
              delta: -8,
              reply: "「你幹嘛扯到別人，我是在擔心你耶！」",
              coach: "用反駁邏輯去回擊父母的焦慮，雖然道理沒錯，卻會讓父母覺得「你沒在聽我擔心你」。"
            },
            {
              tag: "穩定幸福框架",
              text: "「媽我懂你的擔心。其實台灣現在也能合法結婚、簽醫療同意書了，我也有好好存錢照顧身體，將來一樣可以有伴互相扶持。」",
              delta: +20,
              reply: "「原來現在醫院都可以簽同意書了喔⋯⋯好啦，你有在為以後打算，媽媽比較放心一點。」",
              coach: "運用「穩定與幸福框架」，用長輩聽得懂的具體生活保障（醫療、存錢、互相照顧）回答焦慮，大幅提升安全感！"
            },
            {
              tag: "沉默不語",
              text: "「（低頭不說話，氣氛陷入沉默）」",
              delta: -5,
              reply: "「你看，連你自己都答不出來對不對⋯⋯」",
              coach: "沉默會讓長輩把想像力往最壞的方向填補。哪怕還沒想好細節，也可以先表達「我會好好照顧自己」。"
            }
          ]
        },
        {
          partnerLine: "「唉，我腦袋有點亂，不知道怎麼一下接受這麼多事情⋯⋯」",
          choices: [
            {
              tag: "逼問表態型",
              text: "「那你現在到底是支持還是反對？給我一個答案。」",
              delta: -18,
              reply: "「你現在一定要逼我馬上表態嗎？我需要時間不行嗎！」",
              coach: "在對方情緒過載時要求立刻表態，最容易造成關係撕裂。剛出櫃時，父母需要的是消化空間。"
            },
            {
              tag: "緩衝留白框架",
              text: "「媽，你不用今天馬上理解或回答我！我準備了一個給爸媽看的小介紹，你慢慢看就好，我們永遠是家人。」",
              delta: +22,
              reply: "「謝謝你體諒媽媽⋯⋯那你傳給我，我晚上有空慢慢看。早點睡喔。」",
              coach: "完美運用「緩衝留白框架」！把時間與安全感留給對方，搭配「親友轉譯包」，這是一場極具保護力的出櫃對話。"
            },
            {
              tag: "匆忙離場",
              text: "「沒關係那我先回房間了。」",
              delta: +2,
              reply: "「嗯⋯⋯好，晚安。」",
              coach: "適時暫停是好的，但若能多加一句「不用急著回答，我永遠愛你」及後續閱讀資源，溫度會更穩定。"
            }
          ]
        }
      ]
    },
    dad: {
      avatar: "👨",
      name: "爸爸（沉默寡言・重視面子）",
      startTemp: 40,
      turns: [
        {
          partnerLine: "「（沉默了三十秒，看著電視）⋯⋯這件事我們自己家裡知道就好，千萬不要跟親戚或鄰居講。」",
          choices: [
            {
              tag: "直接衝撞型",
              text: "「為什麼不能講？我又沒有做錯事，憑什麼要躲躲藏藏！」",
              delta: -15,
              reply: "「我說不要講就是不要講，你要讓大家在背後指指點點嗎！」",
              coach: "爸爸的第一反應常是在保護家庭免於社會壓力。直接質疑「躲藏」容易踩中他的保護欲與面子防衛。"
            },
            {
              tag: "顧慮步調框架",
              text: "「爸，我懂你在乎家人的感受，我今天先告訴你，是因為你對我很重要。對外要不要說，我都會尊重你跟媽的步調。」",
              delta: +20,
              reply: "「（點點頭，表情稍微鬆動）⋯⋯你有想到家裡就好。」",
              coach: "先給爸爸「你對我很重要」的尊榮感，並把「對外節奏控制權」交給他一起決定，防衛立刻下降。"
            },
            {
              tag: "敷衍帶過",
              text: "「喔，好。」",
              delta: -3,
              reply: "「（繼續低頭看電視，不再開口）」",
              coach: "雖然避免了衝突，但也錯失了向爸爸表達「我是因為信任你才告訴你」的連結機會。"
            }
          ]
        },
        {
          partnerLine: "「那你工作跟生活⋯⋯同事會不會對你怎樣？以後經濟沒問題嗎？」",
          choices: [
            {
              tag: "穩定生活框架",
              text: "「爸你放心，我工作很穩定，主管跟同事都很專業。我跟伴侶也有規劃理財，不會讓你跟我媽操心。」",
              delta: +22,
              reply: "「嗯，男人最重要的是把日子過穩、靠自己站得住腳。」",
              coach: "台灣爸爸常透過關心「工作與經濟」來表達愛。用務實穩定的生活狀態回應，最能讓父親安心。"
            },
            {
              tag: "抱怨職場型",
              text: "「唉呀現在社會還是有很多偏見啦，有時候也蠻累的。」",
              delta: -8,
              reply: "「你看吧！我就說這條路很難走！」",
              coach: "在剛出櫃當下過度放大外部困難，會加劇父親「走這條路很辛苦」的焦慮感。"
            },
            {
              tag: "轉移話題",
              text: "「不聊這個了，明天不是要去看醫生嗎？」",
              delta: -4,
              reply: "「⋯⋯嗯，明天早上九點。」",
              coach: "太快切換話題容易留下未解的尷尬，至少先簡短讓爸爸安心會更好。"
            }
          ]
        },
        {
          partnerLine: "「好啦，這件事我知道了。今天先這樣，去休息吧。」",
          choices: [
            {
              tag: "愛與留白結尾",
              text: "「謝謝爸願意聽我說。不管怎樣我永遠是你兒子，如果你之後想多了解，我有整理一些資料，想看再跟我要。」",
              delta: +18,
              reply: "「（拍拍你的肩膀）⋯⋯好啦，去喝杯水早點睡。」",
              coach: "對不善言辭的父親而言，「願意聽完」本身就是很大的接納。留下一句肯定親情的話，是最好的句點。"
            },
            {
              tag: "追問認同型",
              text: "「爸，那你真的能接受嗎？你怎麼都不說一句祝福的話？」",
              delta: -12,
              reply: "「我都要消化一下啊，你急什麼。」",
              coach: "父親通常需要安靜的時間重新整理認知，不逼迫當下表態能為未來的和解留下最大空間。"
            },
            {
              tag: "默默離開",
              text: "「好，晚安。」",
              delta: +5,
              reply: "「晚安。」",
              coach: "和平收尾很不錯，若能補上一句對爸爸的感謝會更有暖度。"
            }
          ]
        }
      ]
    },
    friend: {
      avatar: "🧑‍🤝‍🧑",
      name: "摯友（驚訝但很在乎你）",
      startTemp: 62,
      turns: [
        {
          partnerLine: "「天啊⋯⋯我老實說有點驚訝，我們認識這麼久，怎麼現在才跟我說？是不是怕我不能接受？」",
          choices: [
            {
              tag: "信任邀請框架",
              text: "「不是不信任你啦！是因為我自己也花了很久才準備好，而你是我最想第一批分享真實生活的人。」",
              delta: +20,
              reply: "「聽你這樣說我就放心了！謝謝你願意告訴我，老實說我真的很感動。」",
              coach: "朋友的失落往往來自「怕自己不夠值得信任」。把焦點轉成「你是我最想分享的人」，瞬間增進友誼！"
            },
            {
              tag: "過度道歉型",
              text: "「對不起啦，我怕你覺得我很怪、不想跟我當朋友了⋯⋯」",
              delta: +4,
              reply: "「哎唷幹嘛說對不起啦！我們這麼多年朋友，你這樣講我會難過耶。」",
              coach: "不用為自己的性傾向道歉。適度展現自信與對友誼的信任，能讓朋友更自在地面對你。"
            },
            {
              tag: "冷淡防備型",
              text: "「就覺得沒什麼好講的啊。」",
              delta: -10,
              reply: "「喔⋯⋯好吧，那如果不想聊沒關係。」",
              coach: "過度防備容易讓真心想支持你的朋友感到被推開。"
            }
          ]
        },
        {
          partnerLine: "「那⋯⋯我以後跟你相處有什麼要注意的嗎？還是你有對象了嗎？」",
          choices: [
            {
              tag: "日常輕鬆框架",
              text: "「完全不用特別小心，我還是原本那個愛喝珍奶、愛吐槽你的我！倒是以後可以跟你分享戀愛煩惱了哈哈。」",
              delta: +18,
              reply: "「哈哈哈好喔！那太好了，快點跟我說最近有沒有喜歡誰！」",
              coach: "告訴朋友「我還是原本的我」，能最快消除對方不知所措的緊張感。"
            },
            {
              tag: "設定界線清晰",
              text: "「謝謝你這麼貼心！目前還請幫我保密喔，因為我還沒跟家裡說。」",
              delta: +15,
              reply: "「沒問題，絕對幫你守口如瓶，你需要幫忙隨時說！」",
              coach: "在剛向朋友出櫃時，清楚告知「隱私界線（誰知道、誰還不知道）」是非常重要且健康的自我保護！"
            },
            {
              tag: "過度嚴肅",
              text: "「這件事很複雜，三言兩語講不完。」",
              delta: -5,
              reply: "「喔⋯⋯好，等你準備好再聊。」",
              coach: "朋友主動詢問往往代表接納意願高，適度給一個輕鬆的入口可以讓氣氛更自然。"
            }
          ]
        },
        {
          partnerLine: "「真開心你告訴我！那接下來對家人出櫃你有什麼打算嗎？需要我陪你嗎？」",
          choices: [
            {
              tag: "邀請成為防護網",
              text: "「太需要了！我正想把你設定成『安全退路聯絡人』，等我之後跟爸媽說完，第一個打給你！」",
              delta: +15,
              reply: "「一句話！隨時打給我，那天我手機一定開最大聲！」",
              coach: "成功把摯友轉化為實質的「心理支持網」，對未來向家人出櫃是極強大的後盾！"
            },
            {
              tag: "獨自承擔型",
              text: "「不用啦，這是我自己的事，我自己扛就好。」",
              delta: +2,
              reply: "「雖然你很獨立，但有需要還是要揪我喔。」",
              coach: "允許自己接受善意與陪伴，也是出櫃路上重要的練習。"
            },
            {
              tag: "借用工具分享",
              text: "「其實我最近有用一個工具先記錄家人平常對議題的態度，到時候再跟你討論怎麼切入！」",
              delta: +12,
              reply: "「聽起來很讚耶，需要的時候隨時找我演練！」",
              coach: "讓朋友了解你的準備步驟，能讓支持變得更具體有效。"
            }
          ]
        }
      ]
    }
  };

  function initSimulator() {
    document.querySelectorAll("#scenario-selector .scenario-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#scenario-selector .scenario-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        simState.scenarioKey = btn.dataset.scenario;
        resetSimulator();
      });
    });

    document.getElementById("sim-restart-btn").addEventListener("click", resetSimulator);

    document.getElementById("sim-custom-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("sim-custom-input");
      const text = input.value.trim();
      if (!text || simState.finished) return;
      input.value = "";
      handleCustomSimReply(text);
    });

    resetSimulator();
  }

  function resetSimulator() {
    const sc = SCENARIOS[simState.scenarioKey];
    simState.turnIndex = 0;
    simState.temp = sc.startTemp;
    simState.finished = false;

    document.getElementById("sim-avatar").textContent = sc.avatar;
    document.getElementById("sim-partner-name").textContent = sc.name;
    document.getElementById("sim-chat-log").innerHTML = "";
    document.getElementById("sim-choices-area").classList.remove("hidden");
    document.getElementById("sim-finish-banner").classList.add("hidden");
    document.getElementById("coach-feedback-body").innerHTML =
      `<p class="coach-placeholder">請在左側選擇一個回應選項（或自行輸入句子），我會即時分析這句話啟動了什麼「框架效應」，以及如何降低對方防衛。</p>`;

    appendChatBubble("partner", sc.name.split("（")[0], sc.turns[0].partnerLine);
    renderSimTurn();
  }

  function renderSimTurn() {
    const sc = SCENARIOS[simState.scenarioKey];
    document.getElementById("sim-turn-indicator").textContent = `第 ${Math.min(simState.turnIndex + 1, sc.turns.length)} / ${sc.turns.length} 回合`;
    updateTempUI();

    if (simState.turnIndex >= sc.turns.length) {
      simState.finished = true;
      document.getElementById("sim-choices-area").classList.add("hidden");
      document.getElementById("sim-finish-banner").classList.remove("hidden");
      document.getElementById("sim-finish-summary").textContent =
        simState.temp >= 70
          ? `最終理解與安心度達到 ${simState.temp}°C！你成功用「同理＋框架轉譯」降低了對方防衛，為彼此保留了很好的未來對話空間。`
          : `最終理解與安心度為 ${simState.temp}°C。剛開始面對質疑容易緊繃是很正常的，建議多試試「先接住對方的善意，再給留白時間」的回應方式！`;
      return;
    }

    const turn = sc.turns[simState.turnIndex];
    const choicesList = document.getElementById("sim-choices-list");
    choicesList.innerHTML = turn.choices
      .map(
        (c, idx) => `
      <button type="button" class="sim-choice-btn" data-idx="${idx}">
        <span class="choice-tag">${escapeHtml(c.tag)}</span>
        <div>${escapeHtml(c.text)}</div>
      </button>
    `
      )
      .join("");

    choicesList.querySelectorAll(".sim-choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = turn.choices[Number(btn.dataset.idx)];
        applySimStep(choice.text, choice.delta, choice.reply, choice.coach, choice.tag);
      });
    });
  }

  function handleCustomSimReply(text) {
    // 簡易 NVC & Framing 關鍵字分析
    const hasEmpathy = /(懂|知道|理解|擔心|在乎|謝謝|辛苦|重要|愛)/.test(text);
    const hasBuffer = /(時間|慢慢|不急|休息|資料|之後)/.test(text);
    const hasAttack = /(煩|不要管|不懂|閉嘴|隨便|干你)/.test(text);

    let delta = 8;
    let tag = "自訂回應練習";
    let reply = "「嗯⋯⋯我聽到了，雖然還是需要一點時間想一想，但我知道你是認真的。」";
    let coach = "你勇敢表達了自己的想法！";

    if (hasAttack) {
      delta = -14;
      reply = "「你這樣講話讓我很難繼續跟你溝通下去⋯⋯」";
      coach = "偵測到較強硬的情緒字眼，對方可能會把注意力轉向「你的態度」而忽略你真實的脆弱與愛。試著加入「我知道你擔心我」做緩衝！";
    } else if (hasEmpathy && hasBuffer) {
      delta = +20;
      reply = "「謝謝你願意這樣顧慮我的感受⋯⋯給我一點時間消化，我們依然是一家人。」";
      coach = "太棒了！這句自訂回應同時結合了「同理接住對方（非暴力溝通）」與「緩衝留白框架」，能極大程度化解門把效應帶來的焦慮！";
    } else if (hasEmpathy) {
      delta = +14;
      reply = "「我確實是很擔心你啦⋯⋯既然你這麼認真想過，我再聽你說說看。」";
      coach = "很溫暖的開頭！你先肯定了對方的善意與在乎，這能有效軟化對方的防衛立場。";
    } else if (hasBuffer) {
      delta = +12;
      reply = "「好，謝謝你沒有逼我立刻回答，我晚上慢慢想一想。」";
      coach = "你保留了對話的空間與時間緩衝，這能大幅避免雙方在情緒高點互傷。";
    }

    applySimStep(text, delta, reply, coach, tag);
  }

  function applySimStep(userText, delta, partnerReply, coachMsg, tag) {
    const sc = SCENARIOS[simState.scenarioKey];
    const shortName = sc.name.split("（")[0];

    appendChatBubble("user", "我", userText);
    simState.temp = Math.max(10, Math.min(100, simState.temp + delta));
    updateTempUI();

    appendChatBubble("partner", shortName, partnerReply);

    const deltaSign = delta >= 0 ? `+${delta}°C` : `${delta}°C`;
    const deltaClass = delta >= 0 ? "pos" : "neg";
    document.getElementById("coach-feedback-body").innerHTML = `
      <span class="coach-delta ${deltaClass}">策略：${escapeHtml(tag)}（對方安心度 ${deltaSign}）</span>
      <p>${escapeHtml(coachMsg)}</p>
    `;

    simState.turnIndex += 1;
    if (simState.turnIndex < sc.turns.length) {
      const nextLine = sc.turns[simState.turnIndex].partnerLine;
      setTimeout(() => {
        appendChatBubble("partner", shortName, nextLine);
      }, 220);
    }
    renderSimTurn();
  }

  function appendChatBubble(role, sender, text) {
    const chatLog = document.getElementById("sim-chat-log");
    const div = document.createElement("div");
    div.className = `chat-bubble ${role}`;
    div.innerHTML = `<span class="chat-sender">${escapeHtml(sender)}</span>${escapeHtml(text)}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function updateTempUI() {
    document.getElementById("sim-temp-fill").style.width = `${simState.temp}%`;
    document.getElementById("sim-temp-val").textContent = `${simState.temp}°C`;
  }

  /* ================= 分頁 4：親友轉譯包 ================= */
  function initFamilyPack() {
    const root = document.getElementById("family-pack-root");
    const fontBtn = document.getElementById("toggle-elder-font-btn");
    fontBtn.addEventListener("click", () => {
      const isLarge = root.classList.toggle("elder-large-font");
      fontBtn.textContent = isLarge ? "🔍 恢復標準字體" : "🔍 切換長輩友善大字";
      showToast(isLarge ? "已切換為長輩友善大字模式" : "已恢復標準字體");
    });

    document.getElementById("copy-family-guide-btn").addEventListener("click", () => {
      const plainGuide = `【給親愛的家人：當孩子向您出櫃時】

如果您的孩子鼓起勇氣告訴您這件事，請先知道：他/她不是想推開您，恰恰相反，是因為您在他生命裡非常重要，他不想一輩子對最愛的人戴著面具。

💛 可以先試著這麼做（三要）：
1. 先給一句安穩的話：「謝謝你願意告訴我，我需要一點時間想一想，但我還是很愛你。」
2. 照顧自己的情緒：可以撥打台灣同志諮詢熱線「同志父母諮詢專線 (02) 2392-1970」（週二 18:00-21:00、週四 14:00-17:00），由同樣身為同志父母的志工親自接聽。
3. 看見眼前的孩子：出櫃前後，他依然是那個愛您、努力生活的孩子。

🌿 請盡量先避免的反應（三不）：
1. 不要急著自責（這不是誰沒教好）。
2. 不要說「只是還沒遇到對的人」。
3. 不要在情緒上頭時說重話，先給彼此一點沉澱的時間。`;

      copyText(plainGuide, "已複製「長輩閱讀版轉譯包」，可直接貼給 Line 家人");
    });
  }

  /* ================= 分頁 5：安心防護網 ================= */
  function initSafetyPlan() {
    const checklist = document.getElementById("safety-checklist");
    const checkboxes = checklist.querySelectorAll('input[type="checkbox"]');
    const textInputs = checklist.querySelectorAll(".si-input");

    checkboxes.forEach((cb) => {
      cb.checked = Boolean(state.safety[cb.dataset.key]);
      cb.addEventListener("change", () => {
        state.safety[cb.dataset.key] = cb.checked;
        saveState();
        updateSafetyBadge();
      });
    });

    textInputs.forEach((inp) => {
      inp.value = state.safety[inp.dataset.field] || "";
      inp.addEventListener("input", () => {
        state.safety[inp.dataset.field] = inp.value;
        saveState();
      });
    });

    updateSafetyBadge();
  }

  function updateSafetyBadge() {
    const keys = ["checkContact", "checkPause", "checkPlace", "checkSelfcare"];
    const done = keys.filter((k) => state.safety[k]).length;
    document.getElementById("safety-progress-badge").textContent = `已完成 ${done}/4`;
  }

  /* ================= 啟動 ================= */
  document.addEventListener("DOMContentLoaded", () => {
    initTopControls();
    initReadinessAndLogs();
    initTranslator();
    initSimulator();
    initFamilyPack();
    initSafetyPlan();
  });
})();
