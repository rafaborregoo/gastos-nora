create extension if not exists "pgcrypto";

create table if not exists public.transaction_audit_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  changed_by uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete', 'status_change')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.transaction_audit_log enable row level security;

drop policy if exists "transaction_audit_select_household" on public.transaction_audit_log;
create policy "transaction_audit_select_household"
on public.transaction_audit_log
for select
using (
  transaction_id is not null
  and exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and public.is_household_member(t.household_id)
  )
);

drop policy if exists "transaction_audit_insert_own" on public.transaction_audit_log;
drop policy if exists "transaction_audit_update_none" on public.transaction_audit_log;
drop policy if exists "transaction_audit_delete_none" on public.transaction_audit_log;

create or replace function public.log_transaction_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.transaction_audit_log (
      transaction_id,
      changed_by,
      action,
      before_data,
      after_data
    )
    values (
      new.id,
      actor,
      'insert',
      null,
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.transaction_audit_log (
      transaction_id,
      changed_by,
      action,
      before_data,
      after_data
    )
    values (
      new.id,
      actor,
      case
        when old.status is distinct from new.status then 'status_change'
        else 'update'
      end,
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.transaction_audit_log (
      transaction_id,
      changed_by,
      action,
      before_data,
      after_data
    )
    values (
      old.id,
      actor,
      'delete',
      to_jsonb(old),
      null
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_transaction_audit_log on public.transactions;
create trigger trg_transaction_audit_log
after insert or update or delete on public.transactions
for each row
execute function public.log_transaction_changes();
