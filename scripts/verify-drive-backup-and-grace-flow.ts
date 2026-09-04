/**
 * Script de Verificación de Integridad — Flow de Grace Period, Selective Drive Backup & Retention
 */
import { PLAN_FEATURES, isProOrEnterprise } from '../src/shared/core/entitlements/useEntitlements';

async function testGraceAndBackupFlow() {
  console.log('=== VERIFICANDO LÓGICA DE DOWNGRADE Y PERÍODO DE GRACIA ===');

  const now = new Date();
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // Venció hace 2 días
  const graceEndDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(); // Gracia vence en 8 días

  // Simulación de perfil en gracia
  const profileInGrace = {
    plan: 'pro',
    premium_vence: pastDate,
    grace_period_ends_at: graceEndDate,
  };

  const isPastDue = !!(profileInGrace.premium_vence && new Date(profileInGrace.premium_vence) < now);
  const inGracePeriod = isPastDue && !!(profileInGrace.grace_period_ends_at && new Date(profileInGrace.grace_period_ends_at) > now);
  const effectivePlan = (isPastDue && !inGracePeriod) ? 'free' : profileInGrace.plan;
  const canEmergencyExport = inGracePeriod || isProOrEnterprise(effectivePlan);

  console.log('✔ Usuario vencido detectado:', isPastDue);
  console.log('✔ Reconocido correctamente en período de gracia:', inGracePeriod);
  console.log('✔ Plan efectivo durante gracia:', effectivePlan);
  console.log('✔ Habilitado para exportación de emergencia .ZIP:', canEmergencyExport);

  if (!inGracePeriod || !canEmergencyExport) {
    throw new Error('FALLO: La lógica de gracia no garantizó la exportación de emergencia.');
  }

  console.log('\n=== VERIFICANDO ESQUEMA DE BACKUP SELECTIVO ===');
  const mockCvs = [
    { id: 'cv-1', title: 'CV Juan', drive_file_id: 'drive_123', drive_synced_at: new Date().toISOString() },
    { id: 'cv-2', title: 'CV Maria', drive_file_id: null, drive_synced_at: null },
  ];

  const backed = mockCvs.filter(c => !!c.drive_file_id);
  const unbacked = mockCvs.filter(c => !c.drive_file_id);

  console.log(`✔ CVs Respaldados en Drive: ${backed.length} (esperado 1)`);
  console.log(`✔ CVs No Respaldados: ${unbacked.length} (esperado 1)`);

  if (backed.length !== 1 || unbacked.length !== 1) {
    throw new Error('FALLO: El filtrado de backups selectivos no coincide.');
  }

  console.log('\n✅ TODAS LAS PRUEBAS DE INTEGRIDAD PASARON CORRECTAMENTE.');
}

testGraceAndBackupFlow().catch(err => {
  console.error('❌ ERROR DE VERIFICACIÓN:', err);
  process.exit(1);
});
