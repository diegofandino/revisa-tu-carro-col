-- Accounts, membership, entitlements and account bootstrap on sign-up.
-- Spec 003 §5.1–5.3, §7.1, §7.4.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi cuenta' check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function private.set_updated_at();

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index account_members_user_idx on public.account_members (user_id, account_id);

create table public.account_entitlements (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  vehicle_limit integer not null default 1 check (vehicle_limit between 0 and 1000),
  updated_at timestamptz not null default now()
);

create trigger account_entitlements_set_updated_at
before update on public.account_entitlements
for each row execute function private.set_updated_at();

-- SECURITY DEFINER so policies on account_members do not recurse. Returns only a boolean
-- about the caller's own membership.
create function private.is_member(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_members m
    where m.account_id = p_account_id
      and m.user_id = (select auth.uid())
  );
$$;

create function private.is_owner(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_members m
    where m.account_id = p_account_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

revoke execute on function private.is_member(uuid), private.is_owner(uuid) from public;
grant execute on function private.is_member(uuid), private.is_owner(uuid) to authenticated;

-- One account per new user (MVP). Kept minimal: a failure here blocks sign-up.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  insert into public.accounts default values returning id into v_account_id;
  insert into public.account_members (account_id, user_id, role) values (v_account_id, new.id, 'owner');
  insert into public.account_entitlements (account_id) values (v_account_id);
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();
