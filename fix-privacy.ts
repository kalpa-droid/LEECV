import * as fs from 'fs';
let content = fs.readFileSync('src/shared/legal/PrivacyPolicyContent.tsx', 'utf8');

content = content.replace('(RLS en Supabase)', '');
content = content.replace(/2\. Almacenamiento en Supabase y Google Drive API/, '2. Almacenamiento Seguro de Datos');
content = content.replace(/Los datos de tus currículums y respaldos se almacenan de manera segura en Supabase Database y opcionalmente en tu propia cuenta de Google Drive\./, 'Los datos de tus currículums y respaldos se almacenan de manera segura y privada.');
content = content.replace(/<p>\s*Al conectar tu cuenta de Google Drive[\s\S]*?<\/ul>/, '');
content = content.replace(/, historial de currículums o revocar el acceso a tu Google Drive/, ' e historial de currículums');

fs.writeFileSync('src/shared/legal/PrivacyPolicyContent.tsx', content);
