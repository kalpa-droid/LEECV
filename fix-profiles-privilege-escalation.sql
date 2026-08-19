-- ============================================================
-- LEECV — Parche: impedir que un usuario se auto-otorgue
-- role='admin' o premium_activo=true editando su propia fila.
-- Ejecutar en: Supabase Dashboard > SQL Editor (después de migration.sql)
-- ============================================================

create or replace function public.protect_privileged_columns()
returns trigger as $$
begin
  -- Si quien ejecuta la actualización es admin, se permite cualquier cambio.
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Si NO es admin, estas columnas deben quedar exactamente igual que antes.
  if new.role is distinct from old.role
     or new.premium_activo is distinct from old.premium_activo
     or new.premium_vence is distinct from old.premium_vence
     or new.metodo_pago is distinct from old.metodo_pago then
    raise exception 'No autorizado para modificar campos de rol o estado premium';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_privileged_columns on public.profiles;
create trigger trg_protect_privileged_columns
  before update on public.profiles
  for each row execute procedure public.protect_privileged_columns();
