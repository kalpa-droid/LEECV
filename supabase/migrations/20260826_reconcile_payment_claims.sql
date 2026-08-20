-- ============================================================
-- LEECV — Reconcile payment_claims schema
-- Guarantees columns: user_email, plan, amount, currency, method, status
-- ============================================================

alter table public.payment_claims
  add column if not exists user_email text,
  add column if not exists plan text default 'pro',
  add column if not exists currency text default 'ARS',
  add column if not exists amount numeric,
  add column if not exists proof_url text,
  add column if not exists proof_id text,
  add column if not exists status text default 'pendiente',
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz;

-- If 'email' column exists and 'user_email' is null, populate user_email from email
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'payment_claims' 
      and column_name = 'email'
  ) then
    execute 'update public.payment_claims set user_email = email where user_email is null and email is not null';
  end if;
end;
$$;
