/**
 * SafePride 驕傲同行 — 文化大學周邊真實種子資料與教學內容
 * 所有電話與座標均對應真實公開資訊。
 */

export const SEED_SPOTS = [
  {
    id: "seed-pccu-counseling",
    type: "friendly",
    category: "friendly_new",
    subType: "campus_support",
    name: "文化大學學生諮商中心（大孝館 205）",
    zone: "文化大學校內",
    address: "臺北市士林區華岡路 55 號大孝館 2 樓 205 室",
    desc: "校內正式心理輔導與性別友善支持資源，遭遇校園不友善對待、出櫃壓力或情緒困擾時可預約專業諮商。",
    lat: 25.1365,
    lng: 121.5422,
    confirmations: 28,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-10T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-pccu-daen",
    type: "friendly",
    category: "friendly_new",
    subType: "safe_hub",
    name: "文化大學大恩館・明亮大廳與校安連繫點",
    zone: "文化大學校內",
    address: "臺北市士林區華岡路 55 號大恩館",
    desc: "校區核心樞紐，人流與監視照明充足，晚間下課或等候校車時可優先於明亮大廳內停留或聯繫校安人員。",
    lat: 25.1378,
    lng: 121.5435,
    confirmations: 22,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-11T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-guanghua-26",
    type: "friendly",
    category: "friendly_new",
    subType: "safe_hub",
    name: "光華路 26 巷美食街（文大後門商圈）",
    zone: "光華路 26 巷美食街",
    address: "臺北市士林區光華路 26 巷",
    desc: "鄰近文大校區主要用餐街區，夜間店家營業燈火通明且學生人潮多，夜間返宿可優先作為明亮步行軸線。",
    lat: 25.1373,
    lng: 121.5413,
    confirmations: 35,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-12T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-711-pccu",
    type: "friendly",
    category: "friendly_new",
    subType: "convenience_24h",
    name: "7-ELEVEN 文大門市（24H 亮燈守護站）",
    zone: "山仔后格致路商圈",
    address: "臺北市士林區格致路 57 號",
    desc: "24 小時營業、有店員與全程監視器，深夜若察覺被尾隨或遇言語騷擾，可立即走入店內尋求暫時庇護。",
    lat: 25.1392,
    lng: 121.5458,
    confirmations: 31,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-13T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-mcd-ym",
    type: "friendly",
    category: "friendly_new",
    subType: "safe_hub",
    name: "麥當勞陽明山餐廳（安心等候據點）",
    zone: "山仔后格致路商圈",
    address: "臺北市士林區格致路 62 號",
    desc: "格致路主要燈亮門市與內用空間，等候紅5／260公車或友人接應時可於店內安全等候。",
    lat: 25.1394,
    lng: 121.5454,
    confirmations: 24,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-14T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-police-shanzihou",
    type: "friendly",
    category: "friendly_new",
    subType: "police",
    name: "士林分局山仔后派出所",
    zone: "山仔后格致路商圈",
    address: "臺北市士林區格致路 39 號",
    desc: "距離文化大學最近之 24 小時警政據點，遇緊急跟蹤、肢體威脅或需報案蒐證時可直接前往求助。",
    lat: 25.1369,
    lng: 121.5465,
    confirmations: 40,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-15T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-hotline-tw",
    type: "friendly",
    category: "friendly_new",
    subType: "ngo",
    name: "社團法人台灣同志諮詢熱線協會（總會）",
    zone: "台北市區其他位置",
    address: "臺北市中正區羅斯福路二段 70 號 12 樓（捷運古亭站 7 號出口）",
    desc: "台灣歷史最悠久的多元性別社群組織，提供同儕諮詢熱線、性別友善資源轉介與社群支持活動。",
    lat: 25.0273,
    lng: 121.5220,
    confirmations: 52,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-16T08:00:00Z",
    isSeed: true
  },
  {
    id: "seed-warn-huagang-side",
    type: "warning",
    category: "lighting",
    subType: "lighting",
    name: "華岡路側巷・夜間起霧照明偏暗區",
    zone: "華岡路／仰德大道口",
    address: "華岡路外圍側巷路段（座標已模糊保護）",
    desc: "陽明山夜間起霧時路燈能見度低、路面濕滑，建議盡量結伴同行或改走光華路 26 巷主燈光動線。",
    lat: 25.1356,
    lng: 121.5408,
    confirmations: 6,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-15T20:30:00Z",
    isSeed: true
  },
  {
    id: "seed-warn-alley-slope",
    type: "warning",
    category: "blindspot",
    subType: "blindspot",
    name: "光華路外圍下坡・巷弄轉角視線死角",
    zone: "光華路 26 巷美食街",
    address: "光華路周邊支線巷口（座標已模糊保護）",
    desc: "深夜店家打烊後人流銳減且轉角建物遮擋視線，獨行請避免邊走邊戴降噪耳機。",
    lat: 25.1385,
    lng: 121.5429,
    confirmations: 4,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-17T21:15:00Z",
    isSeed: true
  },
  {
    id: "seed-warn-bus-night",
    type: "warning",
    category: "harassment",
    subType: "harassment",
    name: "格致路外圍・末班候車處不友善言語提醒",
    zone: "山仔后格致路商圈",
    address: "格致路沿線候車帶（座標已模糊保護）",
    desc: "曾有同學回報夜間等車遇路過騎士吹口哨與嘲諷穿搭，建議移至 7-ELEVEN 或麥當勞門口亮燈處候車。",
    lat: 25.1362,
    lng: 121.5452,
    confirmations: 2,
    flagsCount: 0,
    status: "active",
    createdAt: "2026-11-19T22:10:00Z",
    isSeed: true
  }
];

export const CAMPUS_ZONES = [
  { label: "文化大學校內", lat: 25.1372, lng: 121.5428 },
  { label: "光華路 26 巷美食街", lat: 25.1373, lng: 121.5413 },
  { label: "山仔后格致路商圈", lat: 25.1388, lng: 121.5456 },
  { label: "華岡路／仰德大道口", lat: 25.1355, lng: 121.5418 },
  { label: "台北市區其他位置", lat: 25.0419, lng: 121.5082 }
];

export const REPORT_TYPES = [
  {
    id: "harassment",
    label: "言語騷擾或跟蹤疑慮",
    pinType: "warning",
    category: "harassment",
    subType: "harassment",
    needsBlur: true,
    hint: "自動模糊 30–50m・保護通報者位置",
    defaultNote: "此路段夜間曾遇不友善言語或注視，建議經過時提高警覺或結伴。"
  },
  {
    id: "lighting",
    label: "夜間路燈照明不足／起霧暗處",
    pinType: "warning",
    category: "lighting",
    subType: "lighting",
    needsBlur: true,
    hint: "自動模糊 30–50m・可生成 1999 報修",
    defaultNote: "夜間起霧或路燈故障導致視線昏暗，建議避開或通報路燈修復。"
  },
  {
    id: "blindspot",
    label: "巷弄轉角視線死角",
    pinType: "warning",
    category: "blindspot",
    subType: "blindspot",
    needsBlur: true,
    hint: "自動模糊 30–50m・提醒社群避開",
    defaultNote: "打烊後人流少且轉角視線受阻，建議改走有店家的主幹道。"
  },
  {
    id: "friendly_new",
    label: "推薦 LGBTQ+ 友善／亮燈空間",
    pinType: "friendly",
    category: "friendly_new",
    subType: "safe_hub",
    needsBlur: false,
    hint: "點亮真實座標・分享安心據點",
    defaultNote: "空間明亮友善、店員態度溫暖，夜間可作為安心停留據點。"
  }
];

export const SCENARIOS = {
  campus_bus: {
    label: "🚌 文大公車／校園分組",
    situation:
      "下山搭紅5／260 公車或在教室分組討論時，旁邊同學開玩笑說：「這組怎麼看起來很娘／很怪，你們該不會是那種人吧？」全場突然安靜下來看著你。",
    options: [
      {
        label: "A. 視安全與熟識度平靜劃界：「這種貼標籤的玩笑其實不太尊重人，我們直接把報告分工講完吧。」",
        guidance:
          "✅ 溫柔而堅定的發聲（Speak Out）！不陷入吵架卻清楚表明界線，若對方持續言語霸凌，記得保留對話紀錄，事後可向大孝館 205「文化大學學生諮商中心」或學校性平會諮詢。",
        safe: true
      },
      {
        label: "B. 當場用力拍桌怒罵對方沒水準並拍照上傳社群公審",
        guidance:
          "⚠️ 密閉公車或教室內情緒升級易引發衝突，未查證下公開同學影像也可能衍生法律爭議。建議先保護自身安全與紀錄時間地點，必要時向校安或性平管道申訴。",
        safe: false
      },
      {
        label: "C. 先評估安全選擇不回應，下課或下車後立即尋求信任友人或諮商資源支持",
        guidance:
          "💡 先保護自己絕對沒問題！出櫃與否永遠是你的決定權。離開現場後，別獨自消化不舒服的情緒，可透過地圖前往學生諮商中心或撥打同志諮詢熱線聊聊。",
        safe: true
      }
    ]
  },
  street: {
    label: "🌙 光華路／格致路夜歸",
    situation:
      "晚上 11 點從光華路 26 巷走回租屋處，發現後方有人放慢腳步跟著你，並對著你的穿搭吹口哨嘲諷：「男不男女不女的穿這樣幹嘛？」此時應優先怎麼做？",
    options: [
      {
        label: "A. 停下腳步回頭理論，大聲質問對方為什麼要這樣講話",
        guidance:
          "⚠️ 人身安全第一：深夜在人煙較少的山區側巷與挑釁者對峙，容易升高肢體衝突風險。不回頭糾纏、先移動到明亮處才是最安全選擇。",
        safe: false
      },
      {
        label: "B. 保持冷靜不回頭，快步走進格致路「7-ELEVEN 文大門市」或麥當勞，並使用 SafePride 分享定位／假來電",
        guidance:
          "✅ 最佳安全應變！立即進入有店員與監視器的 24H 亮燈商店，切斷被跟蹤風險；確認安全後可通知友人或撥打 110／聯繫山仔后派出所。",
        safe: true
      },
      {
        label: "C. 為了抄近路鑽進沒有路燈的窄巷想甩開對方",
        guidance:
          "⚠️ 切勿走入暗巷！陽明山夜間起霧且部分巷弄為死巷，務必往格致路、華岡路主幹道等車流與燈光明亮處移動。",
        safe: false
      }
    ]
  },
  transit: {
    label: "🚇 捷運與夜班公車酸言",
    situation:
      "搭乘捷運或末班公車時，身旁陌生乘客故意大聲對同伴說：「現在年輕人穿得奇形怪狀真噁心」，並持續拿手機朝你的方向拍攝。",
    options: [
      {
        label: "A. 默默忍耐坐到終點站，一路心驚膽戰不敢動",
        guidance:
          "💡 先護住自己沒有錯，但你擁有移動位置的權利！在捷運車廂內可起身走到靠近對講機／其他乘客的位置，或提前在有站務員的明亮站體下車。",
        safe: false
      },
      {
        label: "B. 立即起身移動至靠近司機或列車車門對講機處，必要時請司機／站務員協助處理",
        guidance:
          "✅ 聰明的空間界線策略！讓自己進入駕駛或站務人員視線內，能立刻大幅降低被持續騷擾或尾隨的風險。",
        safe: true
      },
      {
        label: "C. 上前直接搶下對方手機刪除畫面",
        guidance:
          "⚠️ 搶奪財物極易引起推擠甚至觸法。建議先移動位置拉開距離，請站務員或警方依法協助確認拍攝行為。",
        safe: false
      }
    ]
  },
  work: {
    label: "💼 打工／職場刻板玩笑",
    situation:
      "在山仔后或市區打工的休息室裡，正職人員頻繁拿同志或跨性別族群當笑柄，還順口問你：「欸你該不會也是吧？講一下嘛！」",
    options: [
      {
        label: "A. 不想被迫出櫃時，用中性句型帶開：「這是個人隱私啦，對了剛才外場客人好像在叫人，我先去忙！」",
        guidance:
          "✅ 非常實用的職場護盾！既不需違心附和歧視笑話，也不被迫交出個人隱私，同時自然抽身離開現場。",
        safe: true
      },
      {
        label: "B. 怕沒工作只好跟著一起大笑附和貶低多元性別",
        guidance:
          "💡 職場權力不對等時保持沈默保護飯碗可以理解，但長期附和可能讓自己承受強烈自我否定。事後記下時間與對話內容，可諮詢勞動權益或台灣伴侶權益推動聯盟。",
        safe: false
      },
      {
        label: "C. 未保留任何紀錄就在網路論壇指名道姓發文開罵",
        guidance:
          "⚠️ 直接公開姓名與店家資訊容易面臨名譽訴訟風險。先保留排班表、對話紀錄與日期，循《性別平等工作法》申訴管道會更有保障。",
        safe: false
      }
    ]
  }
};

/**
 * 國際通用 5D 旁觀者介入法（Distract / Delegate / Document / Delay / Direct）
 */
export const BYSTANDER_GUIDES = {
  distract: {
    label: "🎭 1. Distract 分散注意",
    bubble: "「嗨！原來你在這，我找你超久了！」",
    script:
      "【分散注意力（最安全首選）】不直接與騷擾者對嗆，自然走到當事人旁邊假裝認識：「欸好巧！我們不是約好要去光華路買消夜？」或假裝問路、請對方幫忙看時間，安全打斷騷擾情境並帶當事人離開。"
  },
  delegate: {
    label: "📢 2. Delegate 尋求支援",
    bubble: "「不好意思，外面有人需要協助，可以請店員幫忙嗎？」",
    script:
      "【尋求協力支援】自己單獨一人或對方體型壯碩時，立刻找 7-ELEVEN 店員、公車司機、校安人員、捷運站務員或旁邊一群同學一起幫忙，人多能快速讓騷擾者退縮。"
  },
  document: {
    label: "📱 3. Document 紀錄存證",
    bubble: "「我在安全距離幫你錄影記下時間地點。」",
    script:
      "【安全紀錄存證】先確認已有其他人在協助當事人，再保持安全距離開啟錄音／錄影（拍下明顯地標、時間與車牌或特徵）。⚠️ 重要原則：事後交給當事人決定是否報案，切勿未經同意自行公開上傳網路。"
  },
  delay: {
    label: "🤝 4. Delay 事後關懷",
    bubble: "「你還好嗎？我陪你走去 7-11 或等你朋友來。」",
    script:
      "【陪伴與事後關懷】即使衝突已結束，溫柔上前說一句：「剛才那樣很不好受吧？你沒有錯，需要我陪你走到亮一點的地方、或幫你叫車嗎？」就能大幅減輕當事人的創傷孤單感。"
  },
  direct: {
    label: "🛡️ 5. Direct 安全制止",
    bubble: "「請停止這樣騷擾別人，這樣很不尊重人。」",
    script:
      "【直接安全制止】僅在評估現場光線充足、周圍有其他民眾且自身安全無虞時使用。用簡短平穩的話指出行為不當，隨即把重心轉向關心受騷擾者並帶離現場，不陷入無止盡口角。"
  }
};

export const EMERGENCY_HOTLINES = [
  {
    id: "110",
    title: "🚨 緊急報案專線：110",
    tel: "tel:110",
    btnText: "撥打 110",
    urgent: true,
    desc: "遭遇跟蹤、肢體威脅或無法脫身時，優先進入亮燈超商或派出所並立即撥打。"
  },
  {
    id: "113",
    title: "🛡️ 保護專線：113（24H 免費）",
    tel: "tel:113",
    btnText: "撥打 113",
    urgent: true,
    desc: "家庭暴力、親密關係暴力、跟騷或性別暴力 24 小時全國保護諮詢專線。"
  },
  {
    id: "1925",
    title: "💚 衛福部安心專線：1925（24H 免費）",
    tel: "tel:1925",
    btnText: "撥打 1925",
    urgent: false,
    desc: "遭遇歧視、出櫃焦慮或情緒低潮時，24 小時免費專業心理支持。"
  },
  {
    id: "hotline-tp",
    title: "🌈 台灣同志諮詢熱線（台北）：(02) 2392-1969",
    tel: "tel:+886223921969",
    btnText: "撥打台北熱線",
    urgent: false,
    desc: "多元性別諮詢、不友善事件傾聽與法律／社群轉介（週一至五 14:00–22:00）。"
  },
  {
    id: "hotline-kh",
    title: "🌈 台灣同志諮詢熱線（高雄）：(07) 281-1265",
    tel: "tel:+88672811265",
    btnText: "撥打高雄熱線",
    urgent: false,
    desc: "南部辦公室同志諮詢熱線服務（週一至五 14:00–22:00）。"
  },
  {
    id: "1980",
    title: "💬 張老師輔導專線：1980",
    tel: "tel:1980",
    btnText: "撥打 1980",
    urgent: false,
    desc: "人際壓力、校園適應與情緒陪伴傾聽專線。"
  }
];
