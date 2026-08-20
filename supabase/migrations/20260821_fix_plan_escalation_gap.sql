-- Fix: plan/plan_vence no estaban protegidos por el trigger
-- de protect_privileged_columns, permitiendo auto-escalamiento
-- de plan gratis a pro/enterprise por parte de cualquier usuario.

create or replace function public.protect_privileged_columns()
returns trigger as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.plan_vence is distinct from old.plan_vence
     or new.premium_activo is distinct from old.premium_activo
     or new.premium_vence is distinct from old.premium_vence
     or new.metodo_pago is distinct from old.metodo_pago then
    raise exception 'No autorizado para modificar campos de rol o estado premium';
  end if;

  return new;
end;
$$ language plpgsql security definer;
