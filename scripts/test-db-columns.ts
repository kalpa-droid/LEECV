import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabaseColumns() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('⚠️ No se encontró SUPABASE_SERVICE_ROLE_KEY. Saltando validación de columnas (solo para CI/CD).');
    process.exit(0);
  }

  console.log('🔍 Obteniendo esquema de Supabase...');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });

    if (!res.ok) {
      throw new Error(`Error al obtener esquema: ${res.statusText}`);
    }

    const openapi = await res.json();
    const profilesProps = openapi?.definitions?.profiles?.properties;

    if (!profilesProps) {
      throw new Error('No se encontró la definición de la tabla profiles en el esquema');
    }

    const validColumns = Object.keys(profilesProps);
    console.log(`✅ ${validColumns.length} columnas encontradas en 'profiles'.`);

    // Columnas que fueron eliminadas recientemente o que queremos vigilar
    const removedOrSuspiciousColumns = ['premium_vence', 'expires_at', 'plan_expires'];

    // Leer los archivos de api/_lib
    const apiLibDir = path.join(__dirname, '..', 'api', '_lib');
    let hasErrors = false;

    function checkFilesInDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          checkFilesInDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          for (const suspectCol of removedOrSuspiciousColumns) {
            // Check si la columna se menciona como string o propiedad
            if (content.includes(suspectCol) && !validColumns.includes(suspectCol)) {
              console.error(`❌ ERROR: Referencia a columna inexistente '${suspectCol}' en ${fullPath}`);
              hasErrors = true;
            }
          }
        }
      }
    }

    checkFilesInDir(apiLibDir);

    if (hasErrors) {
      console.error('💥 Falló la validación de columnas. Hay referencias a columnas que no existen en la base de datos.');
      process.exit(1);
    } else {
      console.log('✅ Ninguna columna eliminada fue detectada en api/_lib/*.ts');
      process.exit(0);
    }

  } catch (err: any) {
    console.error(`💥 Error ejecutando validación: ${err.message}`);
    process.exit(1);
  }
}

checkDatabaseColumns();
