# Plan: Estrategia ATS CRO Fase 2 — Auditor ATS en Tiempo Real y Catálogo pSEO Masivo (V2.6.0)

> **Rama de trabajo**: `feat/ats-cro-fase2-auditor-pseo`
> **Estado**: PLANIFICADO (Listo para revisión)
> **Versión objetivo**: `V2.6.0`

---

## 1. Objetivos de Negocio y Producto

1. **Auditor ATS en Tiempo Real en el Editor (`/crear-cv`)**:
   - Actualmente el usuario solo ve su diagnóstico ATS al momento de exportar o mediante un botón estático que no muestra su puntaje actual.
   - En esta fase, el usuario tendrá un **indicador de score ATS en tiempo real** en el Navbar y un **panel interactivo (Drawer / Modal)** que analiza el CV a medida que escribe, señalando hallazgos críticos (datos de contacto ausentes, palabras de relleno, datos sensibles) y oportunidades de optimización (fórmula ACR en experiencia laboral, verbos de acción).
   - Acciones de 1 clic: saltar directo a la sección con sugerencia de mejora ("Corregir en Experiencia", "Ocultar datos sensibles").

2. **Expansión Masiva de SEO Programático (pSEO) — 50+ Profesiones**:
   - Pasar de 3 profesiones a un catálogo exhaustivo de 52 profesiones agrupadas en 7 categorías (Tecnología, Administración/Finanzas, Ventas/Marketing, Salud, Operaciones/Logística, Servicios/Hospitalidad, Educación).
   - Cada profesión con metadatos específicos: palabras clave ATS más buscadas por reclutadores, ejemplo de logro cuantificado con fórmula ACR, secciones sugeridas y CTA de alta conversión hacia `/crear-cv`.
   - Prerenderizado estático de todas las rutas (`/cv/[slug]`) en `scripts/prerender.mjs`, sitemap canónico actualizado y 100% verificado por `npm run verify:seo`.

---

## 2. Especificación Técnica de Componentes y Archivos

### Eje 1: Auditor ATS en Vivo en el Editor

* **`src/shared/core/ats/useAtsLiveScore.ts`** (Nuevo Hook):
  - Recibe `cvData` y `jobDescription` (opcional).
  - Ejecuta de forma memorizada (`useMemo`) `runAtsPreflightCheck` con `resolveActivePreset(cvData)` y `cvDataToContentSections(cvData)`.
  - Retorna `{ score, warnings, criticalCount, warningCount, infoCount, linearReadingOrder }`.

* **`src/modules/cv-builder/components/AtsLiveAuditorPanel.tsx`** (Nuevo Componente):
  - Panel drawer/modal moderno y accesible (WCAG 2.1 AA) usando tokens de `uiDesignSystem`.
  - Visualización del Score con medidor circular o barra de avance con colores de estado:
    - Verde (>=85): "Excelente compatibilidad ATS".
    - Ámbar (60-84): "Buena compatibilidad, mejoras recomendadas".
    - Rojo (<60): "Riesgo de descarte en filtros ATS".
  - Filtro por severidad: "Todos", "Críticos", "Recomendaciones".
  - Botones de acción directa:
    - Botón "Ir a corregir" que activa la pestaña correspondiente del editor (`setActiveTab`) y enfoca el campo.
    - Botón "Ocultar datos sensibles" que aplica la exclusión de DNI/CUIT de inmediato sin salir del panel.
    - Botón "Asistente ACR" que abre la guía de redacción de impacto.

* **`src/modules/cv-builder/components/Navbar.tsx`**:
  - Actualizar la píldora ATS:
    - Muestra dinámicamente el score numérico: `ATS 85%` con punto de color semántico.
    - Visible tanto en escritorio como en móvil (diseño responsive compacto).
    - Al hacer clic, abre `AtsLiveAuditorPanel`.

* **`src/app/App.tsx` y `src/app/AppModals.tsx`**:
  - Conectar el estado del panel ATS en vivo y el salto directo a pestañas del editor (`setActiveTab`).

* **`src/shared/i18n/catalog/landing.ts`**:
  - Incorporar todas las etiquetas, títulos y recomendaciones en lenguaje sencillo sin términos vedados (`npm run check-plain-language`).

---

### Eje 2: Catálogo Masivo pSEO (50+ Profesiones)

* **`src/shared/core/seo/jobTemplatesData.json`** (Nuevo Archivo):
  - 52 profesiones completas con estructura tipada:
    ```json
    {
      "slug": "analista-de-datos",
      "title": "CV Analista de Datos",
      "category": "tecnologia",
      "description": "Plantilla de currículum optimizada para sistemas ATS de analistas de datos, SQL, Python y visualización.",
      "sections": ["Experiencia Laboral", "Habilidades Técnicas", "Proyectos y Modelos", "Formación Académica"],
      "keywords": ["SQL", "Python", "Power BI", "Tableau", "ETL", "Modelado Estadístico", "Métricas de Negocio"],
      "acrExample": "Optimización del embudo de ventas mediante modelos de regresión en Python, incrementando la conversión en un 18%."
    }
    ```

* **`src/shared/core/seo/jobTemplatesCatalog.ts`**:
  - Re-exporta el catálogo con tipado estricto `JobRoleTemplate` y métodos de consulta rápida (`getJobRoleBySlug`, `getAllJobRoles`).

* **`src/modules/landing/components/JobRoleLandingPage.tsx`**:
  - Rediseño con valor agregado real para el usuario:
    - Hero con título H1 optimizado para búsqueda ("Plantilla de CV para [Rol] compatible con ATS").
    - Píldora de palabras clave ATS recomendadas para copiar/incluir.
    - Tarjeta de Fórmula ACR con ejemplo concreto para ese rol.
    - Lista de secciones esenciales sugeridas.
    - Botón CTA principal de alta conversión: "Crear mi CV de [Rol]" que abre el editor con preconfiguración.
    - FAQ Schema estructurado para Google Rich Snippets.

* **`scripts/prerenderMeta.mjs` y `scripts/prerender.mjs`**:
  - Cargar dinámicamente las 52 rutas desde `jobTemplatesData.json`.
  - Prerenderizar `dist/cv/[slug]/index.html` con metadatos canónicos, OpenGraph y Schema.org.

* **`scripts/verify-seo-and-anchors.js` y `public/sitemap.xml`**:
  - Actualizar el sitemap con las 52 nuevas URLs.
  - Asegurar que `npm run verify:seo` verifique las 75+ rutas totales y pase al 100%.

---

### Eje 3: Versión y Pruebas

* **`src/shared/core/version.ts`**:
  - Bump a `V2.6.0` (MINOR: Auditor ATS en vivo en editor y catálogo masivo pSEO).
* **`tests/atsLiveAuditor.test.ts`**:
  - Test de cálculo de score en vivo y detección reactiva de cambios en `cvData`.
* **`tests/jobTemplatesCatalog.test.ts`**:
  - Test de integridad de las 52 profesiones (slugs únicos, campos requeridos, palabras clave y ejemplos ACR).

---

## 3. Checklist de Verificación de Gobernanza

- [ ] `npm run typecheck` (0 errores)
- [ ] `npm run typecheck:api` (0 errores)
- [ ] `npm test` (285+ passing, 0 failed)
- [ ] `npm run check-contrast` (0 nuevas violaciones)
- [ ] `npm run check-plain-language` (0 palabras vedadas)
- [ ] `npx tsx scripts/check-module-boundaries.js` (0 violations)
- [ ] `npm run build` (Build completo y prerender de 75+ rutas estáticas)
- [ ] `npm run verify:seo` (Verificaciones al 100%)
