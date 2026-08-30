/**
 * NÚCLEO — MOTOR DE MIGRACIÓN DE ESQUEMA CV (cvMigrationEngine.ts)
 *
 * Puerta de entrada universal obligatoria para cualquier objeto cvData
 * que ingrese al sistema desde:
 *  1. Almacenamiento local (loadDocumentById)
 *  2. Importación de archivos .JSON / .ZIP (jsonImporterExporter.ts)
 *  3. Restauración desde Google Drive (driveBackupService.ts)
 *
 * Si el documento carece de schemaVersion o es de una versión anterior a
 * CURRENT_SCHEMA_VERSION, ejecuta transformaciones secuenciales en cadena
 * (v0 -> v1 -> v2) garantizando compatibilidad total sin pérdidas ni errores.
 */

import { sanitizeCvData } from '../utils/cvDataSchema';

export const CURRENT_SCHEMA_VERSION = 1;

export function migrateCvData(rawCvData: any): any {
  if (!rawCvData || typeof rawCvData !== 'object') {
    return sanitizeCvData(rawCvData);
  }

  let migrated = { ...rawCvData };
  let currentVersion = typeof migrated.schemaVersion === 'number' ? migrated.schemaVersion : 0;

  // Si ya está en la versión más reciente, desinfectar y retornar de inmediato
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return sanitizeCvData(migrated);
  }

  // Cadena de Migraciones Secuenciales
  // ----------------------------------
  // Migration v0 -> v1: Inicialización de schemaVersion, preservación de competencias y customSections
  if (currentVersion < 1) {
    migrated.schemaVersion = 1;
    if (!Array.isArray(migrated.skills)) {
      migrated.skills = [];
    }
    if (!Array.isArray(migrated.customSections)) {
      migrated.customSections = [];
    }
    if (!migrated.sectionVisibility || typeof migrated.sectionVisibility !== 'object') {
      migrated.sectionVisibility = {};
    }
    currentVersion = 1;
  }

  // Futuras versiones (ej. v1 -> v2) se encadenan aquí de forma secuencial:
  // if (currentVersion < 2) { ... currentVersion = 2; }

  // Retornar objeto desinfectado garantizado
  return sanitizeCvData(migrated);
}
