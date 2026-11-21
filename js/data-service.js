import { APP_CONFIG } from "./config.js";
import { REPORT_TYPES, SEED_SPOTS } from "./seed-data.js";

const DEVICE_HASH_KEY = "safepride_device_hash_v1";
const LOCAL_SPOTS_KEY = "safepride_local_spots_v2";
const LOCAL_PETITION_KEY = "safepride_local_petitions_v2";
const COOLDOWN_KEY = "safepride_last_report_ts_v1";

function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "dev-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export function getOrCreateDeviceHash() {
  try {
    let hash = localStorage.getItem(DEVICE_HASH_KEY);
    if (!hash) {
      hash = generateUuid();
      localStorage.setItem(DEVICE_HASH_KEY, hash);
    }
    return hash;
  } catch {
    return generateUuid();
  }
}

/**
 * 將警示座標隨機偏移 30–50 公尺（球面近似），保護匿名通報者位置隱私。
 */
export function blurCoordinates(
  lat,
  lng,
  minMeters = APP_CONFIG.blurRadiusMeters.min,
  maxMeters = APP_CONFIG.blurRadiusMeters.max
) {
  const distance = minMeters + Math.random() * Math.max(0, maxMeters - minMeters);
  const angle = Math.random() * 2 * Math.PI;
  const latRad = (lat * Math.PI) / 180;
  const deltaLat = (distance * Math.cos(angle)) / 111320;
  const cosLat = Math.max(0.15, Math.cos(latRad));
  const deltaLng = (distance * Math.sin(angle)) / (111320 * cosLat);
  return {
    lat: Number((lat + deltaLat).toFixed(6)),
    lng: Number((lng + deltaLng).toFixed(6)),
    offsetMeters: Math.round(distance)
  };
}

/**
 * 檢查匿名回報文字：防止洩漏電話、Email、車牌與過長內容。
 */
export function validateReportInput(note) {
  const cleanedNote = String(note || "").trim();
  if (cleanedNote.length > 160) {
    return {
      ok: false,
      error: "簡述請控制在 160 字以內，避免包含冗長個人細節。"
    };
  }

  const mobileRegex = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/;
  const landlineRegex = /(?<!\d)0[2-8][-\s]?\d{6,8}(?!\d)/;
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const plateRegex = /\b(?:[A-Za-z]{2,3}[-\s]?\d{4}|\d{4}[-\s]?[A-Za-z]{2})\b/;

  if (mobileRegex.test(cleanedNote) || landlineRegex.test(cleanedNote)) {
    return {
      ok: false,
      error: "為保護隱私與避免爭議，回報內容不得包含電話號碼。"
    };
  }
  if (emailRegex.test(cleanedNote)) {
    return {
      ok: false,
      error: "為保護隱私，回報內容不得包含 Email 位址。"
    };
  }
  if (plateRegex.test(cleanedNote)) {
    return {
      ok: false,
      error: "為避免肉搜或名譽爭議，請勿填入車牌號碼；若有蒐證需求請直接撥打 110。"
    };
  }

  return { ok: true, cleanedNote };
}

/**
 * 計算標記顯示狀態：待社群確認 (<3)、已確認、或超過 30 天淡化。
 */
export function deriveSpotStatus(spot) {
  const flagsCount = Number(spot.flagsCount ?? spot.flags_count ?? 0);
  const status = spot.status || "active";
  if (status === "hidden" || flagsCount >= APP_CONFIG.flagHideThreshold) {
    return { visible: false, trustState: "hidden", expired: false };
  }

  const createdMs = Date.parse(spot.createdAt || spot.created_at || "") || Date.now();
  const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
  const expired = spot.type === "warning" && ageDays > APP_CONFIG.warningExpiryDays;
  const confirmations = Number(spot.confirmations || 0);

  if (spot.type === "warning" && confirmations < APP_CONFIG.confirmThreshold) {
    return { visible: true, trustState: "pending_verify", expired };
  }

  return {
    visible: true,
    trustState: spot.type === "friendly" ? "verified_friendly" : "confirmed_warning",
    expired
  };
}

function normalizeSpot(raw) {
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  return {
    id: String(raw.id),
    type: raw.type === "warning" ? "warning" : "friendly",
    category: raw.category || (raw.type === "warning" ? "harassment" : "friendly_new"),
    subType: raw.subType || raw.sub_type || (raw.type === "warning" ? "harassment" : "safe_hub"),
    name: String(raw.name || "匿名標記點"),
    zone: String(raw.zone || "文化大學周邊"),
    address: String(raw.address || raw.zone || ""),
    desc: String(raw.desc || raw.description || ""),
    lat: Number.isFinite(lat) ? lat : APP_CONFIG.defaultCenter[0],
    lng: Number.isFinite(lng) ? lng : APP_CONFIG.defaultCenter[1],
    confirmations: Number(raw.confirmations || 1),
    flagsCount: Number(raw.flagsCount ?? raw.flags_count ?? 0),
    status: raw.status || "active",
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    isSeed: Boolean(raw.isSeed)
  };
}

function loadLocalStore() {
  try {
    const raw = localStorage.getItem(LOCAL_SPOTS_KEY);
    if (!raw) {
      return {
        customSpots: [],
        seedPatches: {}
      };
    }
    const parsed = JSON.parse(raw);
    return {
      customSpots: Array.isArray(parsed.customSpots) ? parsed.customSpots : [],
      seedPatches: parsed.seedPatches && typeof parsed.seedPatches === "object" ? parsed.seedPatches : {}
    };
  } catch {
    return { customSpots: [], seedPatches: {} };
  }
}

function saveLocalStore(store) {
  try {
    localStorage.setItem(LOCAL_SPOTS_KEY, JSON.stringify(store));
  } catch {
    // 忽略隱私模式限制
  }
}

function getLocalMergedSpots() {
  const store = loadLocalStore();
  const patchedSeeds = SEED_SPOTS.map((seed) => {
    const patch = store.seedPatches[seed.id] || {};
    return normalizeSpot({
      ...seed,
      confirmations: (seed.confirmations || 0) + (patch.confirmDelta || 0),
      flagsCount: (seed.flagsCount || 0) + (patch.flagDelta || 0),
      status: patch.status || seed.status
    });
  });
  const customs = store.customSpots.map(normalizeSpot);
  return [...customs, ...patchedSeeds];
}

export function createDataService() {
  const deviceHash = getOrCreateDeviceHash();
  const hasCloudConfig =
    Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseUrl.trim()) &&
    Boolean(APP_CONFIG.supabaseAnonKey && APP_CONFIG.supabaseAnonKey.trim()) &&
    typeof window !== "undefined" &&
    Boolean(window.supabase && typeof window.supabase.createClient === "function");

  let client = null;
  let activeMode = "local";
  let lastCloudError = "";

  if (hasCloudConfig) {
    try {
      client = window.supabase.createClient(
        APP_CONFIG.supabaseUrl.trim(),
        APP_CONFIG.supabaseAnonKey.trim()
      );
      activeMode = "cloud";
    } catch (err) {
      activeMode = "local";
      lastCloudError = err?.message || "Supabase 初始化失敗";
    }
  }

  function getCooldownRemainingMs() {
    try {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      const diff = Date.now() - last;
      return diff < APP_CONFIG.reportCooldownMs ? APP_CONFIG.reportCooldownMs - diff : 0;
    } catch {
      return 0;
    }
  }

  function markReportTimestamp() {
    try {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  async function fetchSpots() {
    const localSpots = getLocalMergedSpots();
    if (!client) {
      activeMode = "local";
      return localSpots.filter((s) => deriveSpotStatus(s).visible);
    }

    try {
      const { data, error } = await client
        .from("spots")
        .select("id,type,category,sub_type,name,zone,address,description,lat,lng,confirmations,flags_count,status,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      activeMode = "cloud";
      lastCloudError = "";
      const cloudSpots = (data || []).map(normalizeSpot);
      const cloudIds = new Set(cloudSpots.map((s) => s.id));
      const fallbackSeeds = localSpots.filter((s) => s.isSeed && !cloudIds.has(s.id));
      return [...cloudSpots, ...fallbackSeeds].filter((s) => deriveSpotStatus(s).visible);
    } catch (err) {
      activeMode = "local";
      lastCloudError = err?.message || "無法連線雲端資料庫，已切換為本機離線模式";
      return localSpots.filter((s) => deriveSpotStatus(s).visible);
    }
  }

  async function submitSpotReport({ categoryId, zone, note, lat, lng }) {
    const remainMs = getCooldownRemainingMs();
    if (remainMs > 0) {
      const sec = Math.ceil(remainMs / 1000);
      return {
        ok: false,
        error: `為防止惡意洗版，請稍候 ${sec} 秒後再提交下一筆回報。`
      };
    }

    const repType = REPORT_TYPES.find((r) => r.id === categoryId) || REPORT_TYPES[0];
    const validation = validateReportInput(note);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    const finalNote = validation.cleanedNote || repType.defaultNote;
    const rawLat = Number.isFinite(Number(lat)) ? Number(lat) : APP_CONFIG.defaultCenter[0];
    const rawLng = Number.isFinite(Number(lng)) ? Number(lng) : APP_CONFIG.defaultCenter[1];
    const coords = repType.needsBlur
      ? blurCoordinates(rawLat, rawLng)
      : { lat: Number(rawLat.toFixed(6)), lng: Number(rawLng.toFixed(6)), offsetMeters: 0 };

    const spotName = `${zone}・${repType.pinType === "friendly" ? "友善新據點" : repType.label}`;
    const addressText = repType.needsBlur
      ? `${zone}（座標已隨機模糊 ${coords.offsetMeters}m 保護隱私）`
      : `${zone}（社群分享友善空間）`;

    if (client) {
      try {
        const insertPayload = {
          type: repType.pinType,
          category: repType.category,
          sub_type: repType.subType,
          name: spotName,
          zone,
          address: addressText,
          description: finalNote,
          lat: coords.lat,
          lng: coords.lng,
          confirmations: 1,
          flags_count: 0,
          status: "active",
          device_hash: deviceHash
        };

        const { data, error } = await client
          .from("spots")
          .insert(insertPayload)
          .select("id,type,category,sub_type,name,zone,address,description,lat,lng,confirmations,flags_count,status,created_at")
          .single();

        if (error) throw error;
        markReportTimestamp();
        activeMode = "cloud";
        return {
          ok: true,
          mode: "cloud",
          offsetMeters: coords.offsetMeters,
          spot: normalizeSpot(data)
        };
      } catch (err) {
        // 雲端寫入失敗時降級為本地保存
        lastCloudError = err?.message || "雲端寫入失敗，已暫存於本機";
      }
    }

    const newSpot = normalizeSpot({
      id: `local-${Date.now()}`,
      type: repType.pinType,
      category: repType.category,
      subType: repType.subType,
      name: spotName,
      zone,
      address: addressText,
      desc: finalNote,
      lat: coords.lat,
      lng: coords.lng,
      confirmations: 1,
      flagsCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      isSeed: false
    });

    const store = loadLocalStore();
    store.customSpots.unshift(newSpot);
    saveLocalStore(store);
    markReportTimestamp();

    return {
      ok: true,
      mode: "local",
      offsetMeters: coords.offsetMeters,
      spot: newSpot
    };
  }

  async function confirmSpot(spotId, alreadyConfirmed) {
    if (alreadyConfirmed) {
      return { ok: false, error: "你已經確認過這個地點的資訊囉！" };
    }

    const isLocalOnly = String(spotId).startsWith("local-");
    if (client && !isLocalOnly) {
      try {
        const { data, error } = await client.rpc("confirm_spot", {
          p_spot_id: String(spotId),
          p_device_hash: deviceHash
        });
        if (error) throw error;
        if (data && data.ok === false) {
          if (data.code !== "not_found") {
            return { ok: false, error: data.message || "這個地點已經確認過了" };
          }
        } else {
          return { ok: true, mode: "cloud", confirmations: data?.confirmations };
        }
      } catch (err) {
        lastCloudError = err?.message || "雲端確認失敗";
      }
    }

    const store = loadLocalStore();
    if (String(spotId).startsWith("seed-")) {
      const patch = store.seedPatches[spotId] || { confirmDelta: 0, flagDelta: 0 };
      patch.confirmDelta = (patch.confirmDelta || 0) + 1;
      store.seedPatches[spotId] = patch;
    } else {
      const target = store.customSpots.find((s) => s.id === spotId);
      if (target) target.confirmations = Number(target.confirmations || 0) + 1;
    }
    saveLocalStore(store);
    return { ok: true, mode: "local" };
  }

  async function flagSpot(spotId, reason, alreadyFlagged) {
    if (alreadyFlagged) {
      return { ok: false, error: "你已經檢舉過這筆資訊，感謝協助把關！" };
    }

    const isLocalOnly = String(spotId).startsWith("local-");
    if (client && !isLocalOnly) {
      try {
        const { data, error } = await client.rpc("flag_spot", {
          p_spot_id: String(spotId),
          p_device_hash: deviceHash,
          p_reason: reason || "資訊不實或疑慮內容"
        });
        if (error) throw error;
        if (data && data.ok === false) {
          if (data.code !== "not_found") {
            return { ok: false, error: data.message || "你已經檢舉過這筆標記" };
          }
        } else {
          return { ok: true, mode: "cloud", hidden: Boolean(data?.hidden) };
        }
      } catch (err) {
        lastCloudError = err?.message || "雲端檢舉失敗";
      }
    }

    const store = loadLocalStore();
    let hidden = false;
    if (String(spotId).startsWith("seed-")) {
      const patch = store.seedPatches[spotId] || { confirmDelta: 0, flagDelta: 0 };
      patch.flagDelta = (patch.flagDelta || 0) + 1;
      if (patch.flagDelta >= APP_CONFIG.flagHideThreshold) {
        patch.status = "hidden";
        hidden = true;
      }
      store.seedPatches[spotId] = patch;
    } else {
      const target = store.customSpots.find((s) => s.id === spotId);
      if (target) {
        target.flagsCount = Number(target.flagsCount || 0) + 1;
        if (target.flagsCount >= APP_CONFIG.flagHideThreshold) {
          target.status = "hidden";
          hidden = true;
        }
      }
    }
    saveLocalStore(store);
    return { ok: true, mode: "local", hidden };
  }

  async function fetchPetitionCount() {
    let localBase = 128;
    try {
      const val = Number(localStorage.getItem(LOCAL_PETITION_KEY) || 128);
      if (Number.isFinite(val) && val >= 128) localBase = val;
    } catch {
      // ignore
    }

    if (!client) return localBase;

    try {
      const { data, error } = await client.rpc("get_petition_count", {
        p_topic: "pccu_lighting_safety"
      });
      if (error) throw error;
      return 128 + Number(data || 0);
    } catch {
      return localBase;
    }
  }

  async function submitPetition(alreadyPetitioned) {
    if (alreadyPetitioned) {
      return { ok: false, error: "你已經參與過本次連署，謝謝你的守護力量！" };
    }

    if (client) {
      try {
        const { data, error } = await client.rpc("submit_petition", {
          p_device_hash: deviceHash,
          p_topic: "pccu_lighting_safety"
        });
        if (error) throw error;
        if (data && data.ok === false) {
          return { ok: false, error: data.message || "此裝置已完成連署" };
        }
        return {
          ok: true,
          mode: "cloud",
          count: 128 + Number(data?.total || 1)
        };
      } catch {
        // 降級本地紀錄
      }
    }

    const current = await fetchPetitionCount();
    const nextCount = current + 1;
    try {
      localStorage.setItem(LOCAL_PETITION_KEY, String(nextCount));
    } catch {
      // ignore
    }
    return { ok: true, mode: "local", count: nextCount };
  }

  function computeAnalytics(spots) {
    let friendlyCount = 0;
    let confirmedWarningCount = 0;
    let pendingWarningCount = 0;

    const categoryCounts = {
      friendly_new: 0,
      lighting: 0,
      harassment: 0,
      blindspot: 0
    };

    spots.forEach((spot) => {
      const derived = deriveSpotStatus(spot);
      if (!derived.visible) return;
      if (spot.type === "friendly") {
        friendlyCount += 1;
        categoryCounts.friendly_new += 1;
      } else {
        if (derived.trustState === "pending_verify") {
          pendingWarningCount += 1;
        } else {
          confirmedWarningCount += 1;
        }
        if (spot.category === "lighting") categoryCounts.lighting += 1;
        else if (spot.category === "blindspot") categoryCounts.blindspot += 1;
        else categoryCounts.harassment += 1;
      }
    });

    return {
      friendlyCount,
      confirmedWarningCount,
      pendingWarningCount,
      totalWarningCount: confirmedWarningCount + pendingWarningCount,
      categoryBars: [
        { label: "友善空間", val: categoryCounts.friendly_new, color: "#ff5d78" },
        { label: "照明暗區", val: categoryCounts.lighting, color: "#ffd13b" },
        { label: "騷擾提醒", val: categoryCounts.harassment, color: "#ff9a3c" },
        { label: "視線死角", val: categoryCounts.blindspot, color: "#3aa8ff" }
      ]
    };
  }

  function build1999Template(spot) {
    const target = spot && spot.type === "warning"
      ? spot
      : {
          name: "文化大學華岡路／光華路周邊照明不足路段",
          zone: "士林區陽明山文化大學周邊",
          lat: APP_CONFIG.defaultCenter[0],
          lng: APP_CONFIG.defaultCenter[1],
          desc: "夜間起霧或路燈未亮導致視線昏暗，影響學生夜歸通行安全。"
        };
    const today = new Date().toISOString().slice(0, 10);
    return [
      "【臺北市 1999 市民當家熱線／路燈與行人安全改善陳情範本】",
      `通報日期：${today}`,
      `建議改善地點：${target.zone}（${target.name}）`,
      `參考座標（約略範圍）：${Number(target.lat).toFixed(4)}, ${Number(target.lng).toFixed(4)}`,
      `具體狀況說明：${target.desc}`,
      "訴求事項：請協助派員於夜間時段勘查該路段路燈照明亮度與監視視線死角，並評估增設照明或夜間巡邏警示，以保障學生與多元性別市民夜間通行安全。"
    ].join("\n");
  }

  return {
    getMode: () => activeMode,
    getLastCloudError: () => lastCloudError,
    getDeviceHash: () => deviceHash,
    fetchSpots,
    submitSpotReport,
    confirmSpot,
    flagSpot,
    fetchPetitionCount,
    submitPetition,
    computeAnalytics,
    build1999Template
  };
}
