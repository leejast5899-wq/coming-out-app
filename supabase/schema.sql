-- =====================================================================
-- SafePride 驕傲同行 — Supabase 階段 2 免費雲端資料庫建表與 RLS 安全腳本
-- 執行方式：登入 Supabase Dashboard -> SQL Editor -> New Query -> 貼上並 Run
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. 地圖標記與匿名回報主表
create table if not exists public.spots (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('friendly', 'warning')),
  category text not null check (char_length(category) <= 40),
  sub_type text not null default 'safe_hub' check (char_length(sub_type) <= 40),
  name text not null check (char_length(name) between 1 and 120),
  zone text not null check (char_length(zone) between 1 and 80),
  address text not null default '' check (char_length(address) <= 200),
  description text not null check (
    char_length(description) between 1 and 180
    and description !~ '09[0-9]{2}[- ]?[0-9]{3}[- ]?[0-9]{3}'
    and description !~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  ),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  confirmations integer not null default 1 check (confirmations >= 1),
  flags_count integer not null default 0 check (flags_count >= 0),
  status text not null default 'active' check (status in ('active', 'hidden', 'resolved')),
  device_hash text not null default '' check (char_length(device_hash) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists idx_spots_status_created on public.spots (status, created_at desc);
create index if not exists idx_spots_type on public.spots (type);

-- 2. 確認有效投票表（防同一裝置重複灌水）
create table if not exists public.spot_votes (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  device_hash text not null check (char_length(device_hash) between 4 and 120),
  created_at timestamptz not null default now(),
  unique (spot_id, device_hash)
);

-- 3. 不實資訊檢舉表（累積 >= 3 筆自動隱藏）
create table if not exists public.spot_flags (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null references public.spots(id) on delete cascade,
  device_hash text not null check (char_length(device_hash) between 4 and 120),
  reason text not null default '' check (char_length(reason) <= 160),
  created_at timestamptz not null default now(),
  unique (spot_id, device_hash)
);

-- 4. 環境改善連署表
create table if not exists public.petitions (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null check (char_length(device_hash) between 4 and 120),
  topic text not null default 'pccu_lighting_safety' check (char_length(topic) <= 80),
  created_at timestamptz not null default now(),
  unique (device_hash, topic)
);

-- =====================================================================
-- Row Level Security (RLS) 嚴格權限控管
-- =====================================================================
alter table public.spots enable row level security;
alter table public.spot_votes enable row level security;
alter table public.spot_flags enable row level security;
alter table public.petitions enable row level security;

-- 匿名與登入用戶僅能讀取公開 active 標記
drop policy if exists "Public can read active spots" on public.spots;
create policy "Public can read active spots"
  on public.spots for select
  to anon
  using (status = 'active');

-- 已登入之管理員可讀取所有狀態（含 hidden / resolved）
drop policy if exists "Admin can read all spots" on public.spots;
create policy "Admin can read all spots"
  on public.spots for select
  to authenticated
  using (true);

-- 匿名訪客僅能新增符合初始條件之 active 回報
drop policy if exists "Public can insert active spots" on public.spots;
create policy "Public can insert active spots"
  on public.spots for insert
  to anon, authenticated
  with check (
    status = 'active'
    and confirmations = 1
    and flags_count = 0
  );

-- 僅限已登入管理員（admin.html）可更新或刪除標記
drop policy if exists "Admin can update spots" on public.spots;
create policy "Admin can update spots"
  on public.spots for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete spots" on public.spots;
create policy "Admin can delete spots"
  on public.spots for delete
  to authenticated
  using (true);

-- 備註：spot_votes / spot_flags / petitions 不開放前端直接 SELECT，避免洩漏任何 device_hash。

-- =====================================================================
-- 原子化 SECURITY DEFINER RPC 函式
-- =====================================================================

-- A. 確認地點有效 (+1)
create or replace function public.confirm_spot(p_spot_id text, p_device_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_new_count integer;
begin
  select exists(select 1 from public.spots where id = p_spot_id and status = 'active') into v_exists;
  if not v_exists then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', '找不到該標記或尚未匯入雲端');
  end if;

  insert into public.spot_votes (spot_id, device_hash)
  values (p_spot_id, p_device_hash)
  on conflict (spot_id, device_hash) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'duplicate', 'message', '此裝置已經確認過這個地點囉');
  end if;

  update public.spots
    set confirmations = confirmations + 1
    where id = p_spot_id
    returning confirmations into v_new_count;

  return jsonb_build_object('ok', true, 'confirmations', v_new_count);
end;
$$;

-- B. 檢舉不實或惡意資訊（達 3 筆自動設為 hidden）
create or replace function public.flag_spot(p_spot_id text, p_device_hash text, p_reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_flags integer;
  v_status text;
begin
  select exists(select 1 from public.spots where id = p_spot_id and status = 'active') into v_exists;
  if not v_exists then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', '找不到該標記或已被隱藏');
  end if;

  insert into public.spot_flags (spot_id, device_hash, reason)
  values (p_spot_id, p_device_hash, left(coalesce(p_reason, ''), 160))
  on conflict (spot_id, device_hash) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'duplicate', 'message', '此裝置已經檢舉過這筆標記');
  end if;

  update public.spots
    set flags_count = flags_count + 1,
        status = case when flags_count + 1 >= 3 then 'hidden' else status end
    where id = p_spot_id
    returning flags_count, status into v_flags, v_status;

  return jsonb_build_object(
    'ok', true,
    'flags_count', v_flags,
    'hidden', (v_status = 'hidden')
  );
end;
$$;

-- C. 參與環境改善連署
create or replace function public.submit_petition(p_device_hash text, p_topic text default 'pccu_lighting_safety')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  insert into public.petitions (device_hash, topic)
  values (p_device_hash, coalesce(nullif(p_topic, ''), 'pccu_lighting_safety'))
  on conflict (device_hash, topic) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'duplicate', 'message', '你已經參與過本次連署，謝謝你的守護力量');
  end if;

  select count(*) into v_total
    from public.petitions
    where topic = coalesce(nullif(p_topic, ''), 'pccu_lighting_safety');

  return jsonb_build_object('ok', true, 'total', v_total);
end;
$$;

-- D. 讀取連署總筆數（不暴露裝置雜湊）
create or replace function public.get_petition_count(p_topic text default 'pccu_lighting_safety')
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.petitions
  where topic = coalesce(nullif(p_topic, ''), 'pccu_lighting_safety');
$$;

grant execute on function public.confirm_spot(text, text) to anon, authenticated;
grant execute on function public.flag_spot(text, text, text) to anon, authenticated;
grant execute on function public.submit_petition(text, text) to anon, authenticated;
grant execute on function public.get_petition_count(text) to anon, authenticated;

-- =====================================================================
-- （選用）匯入文化大學與台北初始種子資料至雲端
-- 若匯入以下資料，一般訪客即可直接在雲端對種子點按讚確認！
-- =====================================================================
insert into public.spots (id, type, category, sub_type, name, zone, address, description, lat, lng, confirmations, status)
values
  ('seed-pccu-counseling', 'friendly', 'friendly_new', 'campus_support', '文化大學學生諮商中心（大孝館 205）', '文化大學校內', '臺北市士林區華岡路 55 號大孝館 2 樓 205 室', '校內正式心理輔導與性別友善支持資源，遭遇校園不友善對待、出櫃壓力或情緒困擾時可預約專業諮商。', 25.1365, 121.5422, 28, 'active'),
  ('seed-pccu-daen', 'friendly', 'friendly_new', 'safe_hub', '文化大學大恩館・明亮大廳與校安連繫點', '文化大學校內', '臺北市士林區華岡路 55 號大恩館', '校區核心樞紐，人流與監視照明充足，晚間下課或等候校車時可優先於明亮大廳內停留或聯繫校安人員。', 25.1378, 121.5435, 22, 'active'),
  ('seed-guanghua-26', 'friendly', 'friendly_new', 'safe_hub', '光華路 26 巷美食街（文大後門商圈）', '光華路 26 巷美食街', '臺北市士林區光華路 26 巷', '鄰近文大校區主要用餐街區，夜間店家營業燈火通明且學生人潮多，夜間返宿可優先作為明亮步行軸線。', 25.1373, 121.5413, 35, 'active'),
  ('seed-711-pccu', 'friendly', 'friendly_new', 'convenience_24h', '7-ELEVEN 文大門市（24H 亮燈守護站）', '山仔后格致路商圈', '臺北市士林區格致路 57 號', '24 小時營業、有店員與全程監視器，深夜若察覺被尾隨或遇言語騷擾，可立即走入店內尋求暫時庇護。', 25.1392, 121.5458, 31, 'active'),
  ('seed-mcd-ym', 'friendly', 'friendly_new', 'safe_hub', '麥當勞陽明山餐廳（安心等候據點）', '山仔后格致路商圈', '臺北市士林區格致路 62 號', '格致路主要燈亮門市與內用空間，等候紅5／260公車或友人接應時可於店內安全等候。', 25.1394, 121.5454, 24, 'active'),
  ('seed-police-shanzihou', 'friendly', 'friendly_new', 'police', '士林分局山仔后派出所', '山仔后格致路商圈', '臺北市士林區格致路 39 號', '距離文化大學最近之 24 小時警政據點，遇緊急跟蹤、肢體威脅或需報案蒐證時可直接前往求助。', 25.1369, 121.5465, 40, 'active'),
  ('seed-hotline-tw', 'friendly', 'friendly_new', 'ngo', '社團法人台灣同志諮詢熱線協會（總會）', '台北市區其他位置', '臺北市中正區羅斯福路二段 70 號 12 樓（捷運古亭站 7 號出口）', '台灣歷史最悠久的多元性別社群組織，提供同儕諮詢熱線、性別友善資源轉介與社群支持活動。', 25.0273, 121.5220, 52, 'active'),
  ('seed-warn-huagang-side', 'warning', 'lighting', 'lighting', '華岡路側巷・夜間起霧照明偏暗區', '華岡路／仰德大道口', '華岡路外圍側巷路段（座標已模糊保護）', '陽明山夜間起霧時路燈能見度低、路面濕滑，建議盡量結伴同行或改走光華路 26 巷主燈光動線。', 25.1356, 121.5408, 6, 'active'),
  ('seed-warn-alley-slope', 'warning', 'blindspot', 'blindspot', '光華路外圍下坡・巷弄轉角視線死角', '光華路 26 巷美食街', '光華路周邊支線巷口（座標已模糊保護）', '深夜店家打烊後人流銳減且轉角建物遮擋視線，獨行請避免邊走邊戴降噪耳機。', 25.1385, 121.5429, 4, 'active'),
  ('seed-warn-bus-night', 'warning', 'harassment', 'harassment', '格致路外圍・末班候車處不友善言語提醒', '山仔后格致路商圈', '格致路沿線候車帶（座標已模糊保護）', '曾有同學回報夜間等車遇路過騎士吹口哨與嘲諷穿搭，建議移至 7-ELEVEN 或麥當勞門口亮燈處候車。', 25.1362, 121.5452, 2, 'active')
on conflict (id) do nothing;
