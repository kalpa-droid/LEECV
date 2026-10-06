create table if not exists public.pending_grants (
  id uuid default gen_random_uuid() primary key,
  email text,
  provider text not null,
  external_id text not null,
  plan text not null,
  amount numeric,
  currency text,
  resolved_at timestamp with time zone,
  resolved_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

-- Enable RLS but restrict to admins
alter table public.pending_grants enable row level security;

create policy "Admins can manage pending grants" on public.pending_grants
  for all using (public.is_admin(auth.uid()));

create policy "Service role can insert pending grants" on public.pending_grants
  for insert with check (true); -- Usually bypassed by service_role anyway, but good for explicitness
