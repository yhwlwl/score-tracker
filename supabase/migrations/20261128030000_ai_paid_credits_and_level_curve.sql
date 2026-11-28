-- Paid AI credit top-ups (dual free/paid wallet + redeem codes) and calibrated account level curve.
-- Existing evaluated accounts never lose their level or already-granted free balance.
set local lock_timeout = '2s';
set local statement_timeout = '30s';

-- 1. Calibrate level thresholds and tenure requirements (monthly_credits unchanged).
update public.score_tracker_account_levels as l
set threshold = v.threshold, min_days = v.min_days, min_months = v.min_months
from (values
  (1,0,0,0),
  (2,50,0,0),
  (3,150,0,0),
  (4,200,7,0),
  (5,270,14,0),
  (6,350,30,2),
  (7,430,45,2),
  (8,520,60,3),
  (9,650,90,3),
  (10,800,120,4),
  (11,1000,150,5),
  (12,1200,180,6)
) as v(level, threshold, min_days, min_months)
where l.level = v.level;

-- 2. Extend AI policy, wallets, and tasks for dual free/paid balances.
alter table public.score_tracker_ai_policy
  add column if not exists topup_enabled boolean not null default false,
  add column if not exists topup_shop_url text not null default '',
  add column if not exists topup_notice text not null default '';

alter table public.score_tracker_ai_wallets
  add column if not exists paid_balance numeric(18,6) not null default 0 check(paid_balance >= 0),
  add column if not exists paid_held numeric(18,6) not null default 0 check(paid_held >= 0);

alter table public.score_tracker_ai_tasks
  add column if not exists held_free numeric(18,6) not null default 0 check(held_free >= 0),
  add column if not exists held_paid numeric(18,6) not null default 0 check(held_paid >= 0),
  add column if not exists charged_free numeric(18,6) not null default 0 check(charged_free >= 0),
  add column if not exists charged_paid numeric(18,6) not null default 0 check(charged_paid >= 0),
  add column if not exists budget_bypass boolean not null default false;

-- 3. Top-up pack catalog, redeem codes, orders, and anti-brute-force attempts.
create table if not exists public.score_tracker_ai_topup_packs (
  code text primary key,
  name text not null,
  price_cny numeric(10,2) not null check(price_cny > 0),
  credits integer not null check(credits > 0),
  tag text not null default '',
  sort_order integer not null default 0,
  enabled boolean not null default true
);

insert into public.score_tracker_ai_topup_packs(code, name, price_cny, credits, tag, sort_order, enabled) values
  ('pack_1', '1 元应急包', 1.00, 500, '', 1, true),
  ('pack_3', '3 元学期包', 3.00, 1650, '推荐', 2, true),
  ('pack_10', '9.9 元畅用包', 9.90, 6000, '划算', 3, true)
on conflict (code) do update
set name = excluded.name,
    price_cny = excluded.price_cny,
    credits = excluded.credits,
    tag = excluded.tag,
    sort_order = excluded.sort_order,
    enabled = excluded.enabled;

create table if not exists public.score_tracker_ai_redeem_codes (
  code_hash text primary key check(code_hash ~ '^[0-9a-f]{64}$'),
  code_prefix text not null,
  pack_code text references public.score_tracker_ai_topup_packs(code) on delete set null,
  credits integer not null check(credits > 0 and credits <= 1000000),
  amount_cny numeric(10,2) not null default 0 check(amount_cny >= 0),
  batch_id uuid not null,
  batch_note text not null default '',
  max_uses integer not null default 1 check(max_uses between 1 and 10000),
  used_count integer not null default 0 check(used_count >= 0 and used_count <= max_uses),
  disabled boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.score_tracker_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists score_tracker_ai_redeem_codes_batch_idx on public.score_tracker_ai_redeem_codes(batch_id, created_at desc);
create index if not exists score_tracker_ai_redeem_codes_created_idx on public.score_tracker_ai_redeem_codes(created_at desc);

create table if not exists public.score_tracker_ai_topup_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  channel text not null check(channel in ('redeem_code','afdian_webhook','admin_grant')),
  external_order_no text not null unique,
  pack_code text references public.score_tracker_ai_topup_packs(code) on delete set null,
  credits numeric(18,6) not null check((channel = 'admin_grant' and credits <> 0) or credits > 0),
  amount_cny numeric(10,2) not null default 0 check(amount_cny >= 0),
  note text not null default '',
  actor_id uuid references public.score_tracker_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists score_tracker_ai_topup_orders_user_idx on public.score_tracker_ai_topup_orders(user_id, created_at desc);
create index if not exists score_tracker_ai_topup_orders_created_idx on public.score_tracker_ai_topup_orders(created_at desc);

create table if not exists public.score_tracker_ai_redeem_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.score_tracker_users(id) on delete cascade,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists score_tracker_ai_redeem_attempts_user_idx on public.score_tracker_ai_redeem_attempts(user_id, attempted_at desc);

-- 4. Update account, task start/finish, and call reserve RPCs for dual wallet support.
create or replace function public.score_tracker_ai_account(p_user uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  g jsonb;
  w score_tracker_ai_wallets;
  p score_tracker_ai_policy;
  b score_tracker_ai_budgets;
  mon date := (date_trunc('month', now() at time zone 'Asia/Shanghai'))::date;
  allowance integer;
  cap integer;
  amount numeric;
  step date;
  t record;
  eff_free numeric;
  eff_paid numeric;
  free_avail numeric;
  paid_avail numeric;
  packs jsonb;
begin
  g := score_tracker_growth_refresh(p_user);
  select * into p from score_tracker_ai_policy where id;
  insert into score_tracker_ai_wallets(user_id) values(p_user) on conflict do nothing;
  select * into w from score_tracker_ai_wallets where user_id = p_user for update;

  -- Expire only the personal hold. Unknown provider costs are NEVER released by time.
  for t in select * from score_tracker_ai_tasks where user_id = p_user and status = 'active' and created_at < now() - interval '45 minutes' for update loop
    eff_free := case when t.held_free = 0 and t.held_paid = 0 then t.approved_credits else t.held_free end;
    eff_paid := t.held_paid;
    update score_tracker_ai_wallets
    set held = greatest(0, held - eff_free),
        paid_held = greatest(0, paid_held - eff_paid)
    where user_id = p_user;
    update score_tracker_ai_tasks set status = 'expired', finished_at = now() where id = t.id;
  end loop;

  insert into score_tracker_ai_grants values(p_user, 'welcome', p.initial_credits, now()) on conflict do nothing;
  if found then
    update score_tracker_ai_wallets set balance = balance + p.initial_credits where user_id = p_user;
  end if;

  select monthly_credits into allowance from score_tracker_account_levels where level = (g->>'level')::int;
  cap := greatest(3000, allowance * 3);
  -- Monthly cap applies ONLY to free balance; paid_balance never expires and never blocks monthly grants.
  if allowance > 0 then
    for step in select generate_series(greatest(coalesce(w.grant_month, mon), mon - make_interval(months => ceil(cap::numeric / greatest(1, w.grant_allowance))::integer)), mon, interval '1 month')::date loop
      if step = mon then
        amount := case when w.grant_month = mon then greatest(0, allowance - w.grant_allowance) else allowance end;
      elsif step > w.grant_month then
        amount := w.grant_allowance;
      else
        amount := 0;
      end if;
      if amount > 0 then
        select least(amount, greatest(0, cap - balance)) into amount from score_tracker_ai_wallets where user_id = p_user;
        insert into score_tracker_ai_grants(user_id, grant_key, credits)
        values(p_user, 'month:' || step || ':' || case when step < mon then w.grant_allowance else allowance end, amount)
        on conflict do nothing;
        if found then
          update score_tracker_ai_wallets set balance = balance + amount where user_id = p_user;
        end if;
      end if;
    end loop;
    update score_tracker_ai_wallets set grant_month = mon, grant_allowance = allowance where user_id = p_user;
  end if;

  select * into w from score_tracker_ai_wallets where user_id = p_user;
  select * into b from score_tracker_ai_budgets where period = mon;
  free_avail := greatest(0, w.balance - w.held);
  paid_avail := greatest(0, w.paid_balance - w.paid_held);
  select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'name', x.name, 'price_cny', x.price_cny, 'credits', x.credits, 'tag', x.tag) order by x.sort_order, x.price_cny), '[]'::jsonb)
  into packs from score_tracker_ai_topup_packs x where x.enabled;

  return jsonb_build_object(
    'growth', g,
    'credits', jsonb_build_object(
      'balance', w.balance,
      'held', w.held + w.paid_held,
      'available', free_avail + paid_avail,
      'free_balance', w.balance,
      'free_held', w.held,
      'free_available', free_avail,
      'paid_balance', w.paid_balance,
      'paid_held', w.paid_held,
      'paid_available', paid_avail,
      'monthly', allowance,
      'cap', cap,
      'welcome', p.initial_credits,
      'period', mon
    ),
    'topup', jsonb_build_object(
      'enabled', p.topup_enabled,
      'shop_url', p.topup_shop_url,
      'notice', p.topup_notice,
      'packs', packs
    ),
    'enabled', p.enabled,
    'analysis_enabled', p.analysis_enabled,
    'budget_status', case
      when coalesce(b.spent_cny, 0) + coalesce(b.reserved_cny, 0) >= p.hard_limit_cny then 'paused'
      when coalesce(b.spent_cny, 0) + coalesce(b.reserved_cny, 0) >= p.warning_cny then 'busy'
      else 'available'
    end
  );
end $$;

create or replace function public.score_tracker_ai_task_start(p_user uuid, p_task uuid, p_feature text, p_floor integer default 0, p_cap integer default 1000)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  account jsonb;
  t score_tracker_ai_tasks;
  w score_tracker_ai_wallets;
  p score_tracker_ai_policy;
  b score_tracker_ai_budgets;
  mon date := (date_trunc('month', now() at time zone 'Asia/Shanghai'))::date;
  free_avail numeric;
  paid_avail numeric;
  total_avail numeric;
  approved numeric := 0;
  hold_free numeric := 0;
  hold_paid numeric := 0;
  budget_paused boolean := false;
  bypass boolean := false;
  min_floor integer := greatest(1, p_floor);
begin
  if p_feature = 'study_question' then
    perform pg_advisory_xact_lock(hashtextextended(p_task::text, 0));
  end if;
  account := score_tracker_ai_account(p_user);
  select * into p from score_tracker_ai_policy where id;
  if not p.enabled then return jsonb_build_object('allowed', false, 'reason', 'ai_disabled'); end if;
  if p_feature not in ('vision', 'paper_entry', 'probe', 'admin_test', 'study_question') then
    return jsonb_build_object('allowed', false, 'reason', 'analysis_disabled');
  end if;
  if p_feature = 'admin_test' and not exists(select 1 from score_tracker_users where id = p_user and is_admin) then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select * into t from score_tracker_ai_tasks where id = p_task;
  if found then
    return jsonb_build_object('allowed', t.user_id = p_user and t.feature = p_feature and t.status in ('active', 'succeeded'), 'duplicate', true, 'status', t.status, 'approved', t.approved_credits, 'account', account);
  end if;

  select * into w from score_tracker_ai_wallets where user_id = p_user for update;
  if exists(select 1 from score_tracker_ai_tasks where user_id = p_user and created_at > now() - interval '15 seconds') then
    return jsonb_build_object('allowed', false, 'reason', 'cooldown');
  end if;
  if (select count(*) from score_tracker_ai_tasks where user_id = p_user and status = 'active') >= 2 then
    return jsonb_build_object('allowed', false, 'reason', 'concurrency');
  end if;

  free_avail := greatest(0, w.balance - w.held);
  paid_avail := greatest(0, w.paid_balance - w.paid_held);
  total_avail := free_avail + paid_avail;
  select * into b from score_tracker_ai_budgets where period = mon;
  budget_paused := coalesce(b.spent_cny, 0) + coalesce(b.reserved_cny, 0) >= p.hard_limit_cny;

  if p_feature not in ('probe', 'admin_test') then
    if budget_paused then
      if paid_avail >= min_floor then
        approved := least(paid_avail, greatest(1, least(p_cap, 3000)));
        hold_free := 0;
        hold_paid := approved;
        bypass := true;
      elsif free_avail >= min_floor then
        return jsonb_build_object('allowed', false, 'reason', 'site_budget', 'account', account);
      else
        return jsonb_build_object('allowed', false, 'reason', 'credits_exhausted', 'account', account);
      end if;
    else
      if total_avail < min_floor then
        return jsonb_build_object('allowed', false, 'reason', 'credits_exhausted', 'account', account);
      end if;
      approved := least(total_avail, greatest(1, least(p_cap, 3000)));
      hold_free := least(free_avail, approved);
      hold_paid := greatest(0, approved - hold_free);
      -- Tasks funded 100% by paid credits are never blocked by the shared free site budget cap.
      bypass := (hold_free = 0 and hold_paid > 0);
    end if;
  end if;

  insert into score_tracker_ai_tasks(id, user_id, feature, approved_credits, held_free, held_paid, budget_bypass)
  values(p_task, p_user, p_feature, approved, hold_free, hold_paid, bypass);

  update score_tracker_ai_wallets
  set held = held + hold_free,
      paid_held = paid_held + hold_paid
  where user_id = p_user;

  return jsonb_build_object('allowed', true, 'consumed', true, 'approved', approved, 'held_free', hold_free, 'held_paid', hold_paid, 'budget_bypass', bypass, 'account', account);
end $$;

create or replace function public.score_tracker_ai_call_reserve(p_user uuid, p_task uuid, p_call text, p_model text, p_max_output integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  p score_tracker_ai_policy;
  b score_tracker_ai_budgets;
  t score_tracker_ai_tasks;
  mon date := (date_trunc('month', now() at time zone 'Asia/Shanghai'))::date;
  bound numeric;
begin
  select * into p from score_tracker_ai_policy where id;
  if not p.enabled then return jsonb_build_object('allowed', false, 'reason', 'ai_disabled'); end if;
  if p_model is null or p_model not in ('deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4.1-flash', 'deepseek-v4-flash-vision-exp') or p_max_output is null or p_max_output < 1 or p_max_output > 131072 then
    return jsonb_build_object('allowed', false, 'reason', 'unpriced_model');
  end if;
  bound := (p.context_limit * p.input_rate + p_max_output * p.output_rate) / 1000000 * p.cost_multiplier;
  insert into score_tracker_ai_budgets(period) values(mon) on conflict do nothing;
  select * into b from score_tracker_ai_budgets where period = mon for update;
  if p.starts_period is null or mon = p.starts_period and not b.opening_recorded then
    return jsonb_build_object('allowed', false, 'reason', 'opening_budget_required');
  end if;
  select * into t from score_tracker_ai_tasks where id = p_task and user_id = p_user for update;
  if not found or t.status <> 'active' or t.created_at < now() - interval '45 minutes' then
    return jsonb_build_object('allowed', false, 'reason', 'task_inactive');
  end if;
  if t.feature not in ('probe', 'admin_test') and t.spent_credits >= t.approved_credits then
    return jsonb_build_object('allowed', false, 'reason', 'task_credit_cap');
  end if;
  if exists(select 1 from score_tracker_ai_calls where id = p_call) then
    return jsonb_build_object('allowed', false, 'reason', 'duplicate_call');
  end if;
  if not t.budget_bypass and b.spent_cny + b.reserved_cny + bound > p.hard_limit_cny then
    return jsonb_build_object('allowed', false, 'reason', 'site_budget');
  end if;
  insert into score_tracker_ai_calls(id, task_id, period, model, reserved_cny, input_rate, cache_rate, output_rate, cost_multiplier, max_output)
  values(p_call, p_task, mon, p_model, bound, p.input_rate, p.cache_rate, p.output_rate, p.cost_multiplier, p_max_output);
  update score_tracker_ai_budgets set reserved_cny = reserved_cny + bound where period = mon;
  return jsonb_build_object('allowed', true, 'reserved_cny', bound);
end $$;

create or replace function public.score_tracker_ai_task_finish(p_user uuid, p_task uuid, p_success boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  w score_tracker_ai_wallets;
  t score_tracker_ai_tasks;
  charge numeric;
  eff_free numeric;
  eff_paid numeric;
  charge_free numeric;
  charge_paid numeric;
begin
  select * into w from score_tracker_ai_wallets where user_id = p_user for update;
  select * into t from score_tracker_ai_tasks where id = p_task and user_id = p_user for update;
  if not found then return jsonb_build_object('finished', false); end if;
  if t.status <> 'active' then
    return jsonb_build_object('finished', true, 'charged', t.charged_credits, 'charged_free', t.charged_free, 'charged_paid', t.charged_paid);
  end if;

  eff_free := case when t.held_free = 0 and t.held_paid = 0 then t.approved_credits else t.held_free end;
  eff_paid := t.held_paid;
  charge := case when p_success and t.feature not in ('probe', 'admin_test') then least(t.approved_credits, ceil(t.spent_credits)) else 0 end;
  charge_free := least(charge, eff_free, coalesce(w.balance, 0));
  charge_paid := least(greatest(0, charge - charge_free), eff_paid, coalesce(w.paid_balance, 0));

  update score_tracker_ai_wallets
  set balance = greatest(0, balance - charge_free),
      held = greatest(0, held - eff_free),
      paid_balance = greatest(0, paid_balance - charge_paid),
      paid_held = greatest(0, paid_held - eff_paid)
  where user_id = p_user;

  update score_tracker_ai_tasks
  set status = case when p_success then 'succeeded' else 'failed' end,
      charged_credits = charge_free + charge_paid,
      charged_free = charge_free,
      charged_paid = charge_paid,
      finished_at = now()
  where id = p_task;

  return jsonb_build_object('finished', true, 'charged', charge_free + charge_paid, 'charged_free', charge_free, 'charged_paid', charge_paid);
end $$;

-- 5. Redeem code & unified idempotent paid credit top-up RPCs.
create or replace function public.score_tracker_ai_redeem_code(p_user uuid, p_code_hash text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  rc score_tracker_ai_redeem_codes;
  recent_fails integer;
  next_seq integer;
  acct jsonb;
begin
  insert into score_tracker_ai_wallets(user_id) values(p_user) on conflict do nothing;
  perform 1 from score_tracker_ai_wallets where user_id = p_user for update;

  select count(*) into recent_fails
  from score_tracker_ai_redeem_attempts
  where user_id = p_user and not succeeded and attempted_at > now() - interval '10 minutes';
  if recent_fails >= 5 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited', 'error', '尝试次数过多，请 10 分钟后再试');
  end if;

  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, false);
    return jsonb_build_object('ok', false, 'code', 'invalid_code', 'error', '兑换码格式不正确');
  end if;

  select * into rc from score_tracker_ai_redeem_codes where code_hash = p_code_hash for update;
  if not found then
    insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, false);
    return jsonb_build_object('ok', false, 'code', 'invalid_code', 'error', '兑换码无效，请核对后重试');
  end if;

  if rc.disabled then
    insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, false);
    return jsonb_build_object('ok', false, 'code', 'code_disabled', 'error', '该兑换码已停用');
  end if;

  if rc.expires_at is not null and rc.expires_at <= now() then
    insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, false);
    return jsonb_build_object('ok', false, 'code', 'code_expired', 'error', '该兑换码已过期');
  end if;

  if rc.used_count >= rc.max_uses then
    insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, false);
    return jsonb_build_object('ok', false, 'code', 'code_used', 'error', '该兑换码已被使用');
  end if;

  if exists(select 1 from score_tracker_ai_topup_orders where user_id = p_user and external_order_no like 'redeem:' || p_code_hash || ':%') then
    return jsonb_build_object('ok', false, 'code', 'already_redeemed', 'error', '你已兑换过该兑换码');
  end if;

  update score_tracker_ai_redeem_codes
  set used_count = used_count + 1
  where code_hash = p_code_hash
  returning used_count into next_seq;

  insert into score_tracker_ai_topup_orders(user_id, channel, external_order_no, pack_code, credits, amount_cny, note)
  values(p_user, 'redeem_code', 'redeem:' || p_code_hash || ':' || next_seq, rc.pack_code, rc.credits, rc.amount_cny, rc.batch_note);

  update score_tracker_ai_wallets
  set paid_balance = paid_balance + rc.credits
  where user_id = p_user;

  insert into score_tracker_ai_redeem_attempts(user_id, succeeded) values(p_user, true);

  acct := score_tracker_ai_account(p_user);
  return jsonb_build_object('ok', true, 'credits', rc.credits, 'pack_code', rc.pack_code, 'account', acct);
end $$;

create or replace function public.score_tracker_ai_credit_topup(
  p_user uuid,
  p_channel text,
  p_external_order_no text,
  p_credits numeric,
  p_amount_cny numeric default 0,
  p_pack_code text default null,
  p_note text default '',
  p_actor uuid default null
)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  w score_tracker_ai_wallets;
  existing score_tracker_ai_topup_orders;
begin
  if p_channel not in ('afdian_webhook', 'admin_grant') then
    raise exception 'invalid_topup_channel';
  end if;
  if p_channel = 'admin_grant' and not exists(select 1 from score_tracker_users where id = p_actor and is_admin) then
    raise exception 'forbidden';
  end if;
  if not exists(select 1 from score_tracker_users where id = p_user) then
    raise exception 'account_missing';
  end if;
  if p_external_order_no is null or btrim(p_external_order_no) = '' then
    raise exception 'missing_order_no';
  end if;
  if p_credits is null or p_credits = 0 or (p_channel <> 'admin_grant' and p_credits < 0) then
    raise exception 'invalid_credits';
  end if;

  insert into score_tracker_ai_wallets(user_id) values(p_user) on conflict do nothing;
  select * into w from score_tracker_ai_wallets where user_id = p_user for update;

  select * into existing from score_tracker_ai_topup_orders where external_order_no = p_external_order_no;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'credits', existing.credits, 'paid_balance', w.paid_balance);
  end if;

  if p_credits < 0 and (w.paid_balance - w.paid_held + p_credits) < 0 then
    raise exception 'insufficient_paid_balance';
  end if;

  insert into score_tracker_ai_topup_orders(user_id, channel, external_order_no, pack_code, credits, amount_cny, note, actor_id)
  values(p_user, p_channel, p_external_order_no, p_pack_code, p_credits, greatest(0, coalesce(p_amount_cny, 0)), coalesce(left(p_note, 200), ''), p_actor);

  update score_tracker_ai_wallets
  set paid_balance = paid_balance + p_credits
  where user_id = p_user
  returning * into w;

  return jsonb_build_object('ok', true, 'duplicate', false, 'credits', p_credits, 'paid_balance', w.paid_balance);
end $$;

create or replace function public.score_tracker_ai_release_ready()
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
  select to_regprocedure('public.score_tracker_growth_refresh(uuid)') is not null
  and to_regprocedure('public.score_tracker_ai_account(uuid)') is not null
  and to_regprocedure('public.score_tracker_ai_task_start(uuid,uuid,text,integer,integer)') is not null
  and to_regprocedure('public.score_tracker_ai_call_reserve(uuid,uuid,text,text,integer)') is not null
  and to_regprocedure('public.score_tracker_ai_call_settle(uuid,text,jsonb,text,integer)') is not null
  and to_regprocedure('public.score_tracker_ai_paper_reserve(uuid,uuid,uuid,uuid,text,text)') is not null
  and to_regprocedure('public.score_tracker_ai_redeem_code(uuid,text)') is not null
  and to_regprocedure('public.score_tracker_ai_credit_topup(uuid,text,text,numeric,numeric,text,text,uuid)') is not null;
$$;

-- 6. Lock down new tables and RPCs to service_role only (zero client SQL access).
do $$ declare n text; f record; begin
  foreach n in array array[
    'score_tracker_ai_topup_packs',
    'score_tracker_ai_redeem_codes',
    'score_tracker_ai_topup_orders',
    'score_tracker_ai_redeem_attempts'
  ] loop
    execute format('alter table public.%I enable row level security', n);
    execute format('revoke all on public.%I from public,anon,authenticated', n);
    execute format('grant select,insert,update,delete on public.%I to service_role', n);
  end loop;
  grant usage, select on sequence public.score_tracker_ai_redeem_attempts_id_seq to service_role;
  for f in select oid::regprocedure signature from pg_proc where pronamespace = 'public'::regnamespace and (proname like 'score_tracker_growth_%' or proname like 'score_tracker_ai_%') loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
