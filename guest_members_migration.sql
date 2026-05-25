-- ============================================================
-- Guest Members Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. New guest_members table
create table if not exists public.guest_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.expense_groups(id) on delete cascade not null,
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null
);

-- 2. Make user_id nullable on expense_splits (to allow guest splits)
alter table public.expense_splits
  alter column user_id drop not null;

-- 3. Add guest_member_id column to expense_splits
alter table public.expense_splits
  add column if not exists guest_member_id uuid
  references public.guest_members(id) on delete cascade;

-- 4. Grant permissions (consistent with rest of app)
grant all privileges on public.guest_members to anon, authenticated;

-- Done
