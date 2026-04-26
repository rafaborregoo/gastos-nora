create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
add column if not exists active_household_id uuid references public.households(id) on delete set null;

drop policy if exists "profiles_select_own_or_household" on public.profiles;
create policy "profiles_select_own_or_household"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.household_members own_membership
    join public.household_members other_membership
      on other_membership.household_id = own_membership.household_id
    where own_membership.user_id = auth.uid()
      and own_membership.status = 'active'
      and other_membership.user_id = profiles.id
      and other_membership.status = 'active'
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create table if not exists public.account_members (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

alter table public.account_members enable row level security;

insert into public.account_members (account_id, user_id, role)
select a.id, hm.user_id, case when hm.role = 'owner' then 'owner' else 'member' end
from public.accounts a
join public.household_members hm on hm.household_id = a.household_id and hm.status = 'active'
where a.type = 'shared'
on conflict (account_id, user_id) do nothing;

insert into public.account_members (account_id, user_id, role)
select a.id, a.owner_user_id, 'owner'
from public.accounts a
where a.owner_user_id is not null
on conflict (account_id, user_id) do nothing;

drop policy if exists "account_members_select_household" on public.account_members;
create policy "account_members_select_household"
on public.account_members for select
using (
  exists (
    select 1 from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
);

drop policy if exists "account_members_write_household" on public.account_members;
create policy "account_members_write_household"
on public.account_members for all
using (
  exists (
    select 1 from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
)
with check (
  exists (
    select 1 from public.accounts a
    where a.id = account_id
      and public.is_household_member(a.household_id)
  )
);

create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted', 'revoked', 'expired')),
  token uuid not null default gen_random_uuid(),
  send_email boolean not null default false,
  accepted_by_user_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_household_invitations_token on public.household_invitations(token);
create index if not exists idx_household_invitations_email_status on public.household_invitations(lower(email), status);

alter table public.household_invitations enable row level security;

drop policy if exists "household_invitations_owner_select" on public.household_invitations;
create policy "household_invitations_owner_select"
on public.household_invitations for select
using (
  exists (
    select 1 from public.households h
    where h.id = household_id
      and h.owner_user_id = auth.uid()
  )
);

drop trigger if exists trg_household_invitations_updated_at on public.household_invitations;
create trigger trg_household_invitations_updated_at
before update on public.household_invitations
for each row execute function public.set_updated_at();

create table if not exists public.household_budget_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  period text not null default 'monthly' check (period in ('monthly')),
  target_percent numeric check (target_percent >= 0 and target_percent <= 100),
  target_amount numeric check (target_amount >= 0),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category_id)
);

alter table public.household_budget_goals enable row level security;

drop policy if exists "budget_goals_household_all" on public.household_budget_goals;
create policy "budget_goals_household_all"
on public.household_budget_goals for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop trigger if exists trg_household_budget_goals_updated_at on public.household_budget_goals;
create trigger trg_household_budget_goals_updated_at
before update on public.household_budget_goals
for each row execute function public.set_updated_at();

create table if not exists public.user_theme_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme_name text,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  mode text not null default 'light' check (mode in ('light', 'dark')),
  prompt text,
  tokens jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_theme_preferences enable row level security;

drop policy if exists "theme_preferences_own_all" on public.user_theme_preferences;
create policy "theme_preferences_own_all"
on public.user_theme_preferences for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists trg_user_theme_preferences_updated_at on public.user_theme_preferences;
create trigger trg_user_theme_preferences_updated_at
before update on public.user_theme_preferences
for each row execute function public.set_updated_at();

drop policy if exists "accounts_select_household_visible" on public.accounts;
create policy "accounts_select_household_visible"
on public.accounts for select
using (
  public.is_household_member(household_id)
  and (
    owner_user_id = auth.uid()
    or type = 'shared'
    or exists (
      select 1 from public.account_members am
      where am.account_id = id and am.user_id = auth.uid()
    )
  )
);

drop policy if exists "accounts_write_household_member" on public.accounts;
create policy "accounts_write_household_member"
on public.accounts for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "transaction_splits_select_household" on public.transaction_splits;
create policy "transaction_splits_select_household"
on public.transaction_splits for select
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and public.is_household_member(t.household_id)
  )
);

drop policy if exists "transaction_splits_write_household" on public.transaction_splits;
create policy "transaction_splits_write_household"
on public.transaction_splits for all
using (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and public.is_household_member(t.household_id)
  )
)
with check (
  exists (
    select 1 from public.transactions t
    where t.id = transaction_id and public.is_household_member(t.household_id)
  )
);

drop policy if exists "settlements_household_all" on public.settlements;
create policy "settlements_household_all"
on public.settlements for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "notifications_own_select_update" on public.notifications;
create policy "notifications_own_select_update"
on public.notifications for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop function if exists public.validate_transaction_splits(uuid);

create function public.validate_transaction_splits(tx_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  split_total numeric;
  duplicate_count integer;
  invalid_member_count integer;
begin
  select * into tx from public.transactions where id = tx_id;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if tx.is_shared is false or tx.type <> 'expense' then
    return;
  end if;

  select coalesce(sum(share_amount), 0) into split_total
  from public.transaction_splits
  where transaction_id = tx_id;

  if round(split_total::numeric, 2) <> round(tx.amount::numeric, 2) then
    raise exception 'La suma de los repartos no coincide con el importe.';
  end if;

  select count(*) into duplicate_count
  from (
    select user_id
    from public.transaction_splits
    where transaction_id = tx_id
    group by user_id
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception 'No puede haber personas duplicadas en el reparto.';
  end if;

  select count(*) into invalid_member_count
  from public.transaction_splits ts
  where ts.transaction_id = tx_id
    and not exists (
      select 1
      from public.household_members hm
      where hm.household_id = tx.household_id
        and hm.user_id = ts.user_id
        and hm.status = 'active'
    );

  if invalid_member_count > 0 then
    raise exception 'Todos los repartos deben pertenecer a miembros activos del hogar.';
  end if;
end;
$$;

create or replace view public.v_transaction_balance as
select
  t.id as transaction_id,
  t.household_id,
  t.title,
  t.amount as transaction_amount,
  t.transaction_date,
  t.paid_by_user_id,
  coalesce(sum(ts.share_amount) filter (where ts.user_id is distinct from t.paid_by_user_id), 0)::numeric as owed_to_payer,
  coalesce(settled.total_amount, 0)::numeric as settled_amount,
  greatest(
    coalesce(sum(ts.share_amount) filter (where ts.user_id is distinct from t.paid_by_user_id), 0)
      - coalesce(settled.total_amount, 0),
    0
  )::numeric as pending_amount
from public.transactions t
left join public.transaction_splits ts on ts.transaction_id = t.id
left join (
  select transaction_id, sum(amount) as total_amount
  from public.settlements
  where transaction_id is not null
  group by transaction_id
) settled on settled.transaction_id = t.id
where t.is_shared = true
group by t.id, settled.total_amount;
