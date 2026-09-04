import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serverDal } from './_lib/serverDal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const slug = (req.query.slug || req.query.c || '').toString().trim();

    if (!slug) {
      return res.status(400).send('Falta el parámetro "slug" de la vista pública.');
    }

    let fullName = 'Profesional Registrado';
    let title = 'Currículum Vitae Verificado';
    let description = 'Consulta el perfil profesional y currículum vitae verificado en línea mediante LEECV.';

    try {
      const record = await serverDal.publishedCvs.getBySlugOrId(slug);
      if (record) {
        if (record.title) {
          title = record.title;
        }
        if (record.full_name || record.fullName) {
          fullName = record.full_name || record.fullName;
        }
        if (record.summary) {
          description = record.summary.slice(0, 200);
        }

        // Si tenemos drive_file_id y podemos obtener datos adicionales de Google Drive
        if (record.drive_file_id) {
          try {
            const driveUrl = `https://www.googleapis.com/drive/v3/files/${record.drive_file_id}?alt=media`;
            const driveRes = await fetch(driveUrl);
            if (driveRes.ok) {
              const cvJson: any = await driveRes.json();
              if (cvJson?.personalInfo?.fullName) {
                fullName = cvJson.personalInfo.fullName;
              }
              if (cvJson?.personalInfo?.title || cvJson?.personalInfo?.profession) {
                title = cvJson.personalInfo.title || cvJson.personalInfo.profession;
              }
              if (cvJson?.summary?.text) {
                description = cvJson.summary.text.slice(0, 200);
              }
            }
          } catch (_driveErr) {
            // Si falla la consulta a Drive, usamos los metadatos de Supabase
          }
        }
      }
    } catch (_dbErr) {
      // Fallback a metadatos genéricos elegantes si hay error de DB
    }

    function escapeHtml(str: string): string {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const safeFullName = escapeHtml(fullName);
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeSlug = escapeHtml(slug);

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Currículum de ${safeFullName} — ${safeTitle} | LEECV</title>
  <meta name="description" content="${safeDescription}" />
  <meta property="og:site_name" content="LEECV — Creador de CV Profesional" />
  <meta property="og:title" content="Currículum de ${safeFullName} — ${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="https://leecv.app/cv/${safeSlug}" />
  <meta property="og:image" content="https://leecv.app/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Currículum de ${safeFullName} — ${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="https://leecv.app/og-image.png" />
  <link rel="canonical" href="https://leecv.app/cv/${safeSlug}" />
</head>
<body>
  <h1>Currículum de ${safeFullName} — ${safeTitle}</h1>
  <p>${safeDescription}</p>
  <p><a href="https://leecv.app/cv/${safeSlug}">Ver Currículum Interactivo en LEECV</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).send(html);

  } catch (err: any) {
    return res.status(500).send(`Error generando metadatos de CV: ${err.message}`);
  }
}
