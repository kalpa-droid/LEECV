-- Tamaños de HOJA física (A4, A3, A5, Carta, Legal, Oficio) — son estándares
-- de impresora fijos e inmodificables. Ni el admin ni el usuario cambian sus
-- medidas; el admin solo elige cuáles están HABILITADOS en el selector.
-- (La tarjeta de presentación NO es un tamaño de hoja — es un objeto que se
-- coloca DENTRO de una hoja. Su tamaño se maneja en card_object_presets.)
create table if not exists public.page_sizes (
  id text primary key,               -- 'a3', 'a5', etc. — siempre un estándar real
  name text not null,
  width_mm numeric not null,
  height_mm numeric not null,
  label text not null,
  active boolean not null default true, -- admin prende/apaga cuáles se ofrecen
  created_at timestamptz not null default now()
);

alter table public.page_sizes enable row level security;

drop policy if exists "todos leen tamaños activos" on public.page_sizes;
create policy "todos leen tamaños activos"
  on public.page_sizes for select
  using (active = true or public.is_admin(auth.uid()));

drop policy if exists "admin gestiona tamaños de hoja" on public.page_sizes;
create policy "admin gestiona tamaños de hoja"
  on public.page_sizes for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

insert into public.page_sizes (id, name, width_mm, height_mm, label) values
  ('a4', 'A4', 210, 297, 'A4 (210 × 297 mm)'),
  ('a3', 'A3', 297, 420, 'A3 (297 × 420 mm)'),
  ('a5', 'A5', 148, 210, 'A5 (148 × 210 mm)'),
  ('carta', 'Carta', 216, 279, 'Carta (216 × 279 mm)'),
  ('legal', 'Legal', 216, 356, 'Legal (216 × 356 mm)'),
  ('oficio', 'Oficio', 216, 330, 'Oficio (216 × 330 mm)')
on conflict (id) do nothing;
