## [2026-11-27] - PR #184 (V3.14.3): EditorLee — Auto-Aplicación Directa al Importar en Borrador Vacío, Revisión Persistente en Raíz y Coherencia Digital PDF con Rescate OCR

**Commit en `main`:** `a87df68fffcd1de583a8c6b98a3b97bd27c9fef5`

**Resumen:**
- **Auto-aplicación directa y modal raíz persistente (`EditorLeeStudioContent.tsx`, `EditorialInicioArchivoPanel.tsx`, `StructuredImportReviewModal.tsx`)**:
  - Elevación del callback `onImportReady` y los estados `pendingImportReview` / `postponedImportReview` a `EditorLeeStudioContent.tsx`: si el borrador actual está vacío (`!hasEditorialSubstantiveContent`), aplica automáticamente las secciones, metadatos y preset detectado (`applyEditorialImportPayload`), crea un punto de historial (`commitBoundary`), sincroniza `debouncedDraft`, guarda al instante en IndexedDB y enfoca el primer capítulo.
  - Cuando la obra ya tiene contenido real, abre `<EditorialImportReviewModal>` desde el nivel raíz (inmune a cambios de pestaña durante la lectura), desactiva el cierre accidental por clic en el backdrop (`closeOnOverlayClick={false}`) y ofrece banner recuperable **`Revisar e importar`** si se pospone.
- **Coherencia digital estricta y rescate OCR post-limpieza en PDF (`pdfEditorialExtractor.ts`)**:
  - Endurecimiento de `hasUsableEditorialDigitalText()` para rechazar glifos PUA/CID rotos (`\uE000-\uF8FF`, `\uFFFD`, controles), palabras fusionadas sin espacios (`avgWordLen > 18`), sellos de escáner y folios de margen, y rescate OCR automático tras `stripRepeatedHeadersAndFooters()` si alguna página queda sin texto imprimible.
- **Limpieza de rangos AST y respaldo no vacío (`documentAst.ts`, `editorialUniversalImporter.ts`, `version.ts`)**:
  - Limpieza de `startBlockId`/`endBlockId`/`excludedBlockIds` al consolidar `blockIds` reparados en `sanitizeHallucinatedSections` y `repairProposalToLosslessBijection`, descarte de secciones vacías con respaldo `'Contenido principal'`/`'Contenido importado'` (`sectionHasImportableRecords`), suite `tests/v3143PdfImportVisibilityAndAutoApply.test.ts` (`4/4`) y bump PATCH a `V3.14.3`.
- **Verificación:** `tests/v3143PdfImportVisibilityAndAutoApply.test.ts` (`4/4`), suite dirigida (`25/25`), `npm run check-all` en 0 errores en local y GitHub Actions (`check-all` + Vercel Preview) en verde antes del merge.

---

## [2026-11-27] - PR #182 (V3.14.2): EditorLee — Cero Pérdida de Texto en AST, Extractores PDF/DOCX, Persistencia/Pestañas y Guardas Anti-Alucinación

**Commit en `main`:** `935021dcde1b90a643d2f3df065670a362278949`

**Resumen:**
- **Guardas AST anti-alucinación y biyección sin pérdidas (`documentAst.ts`, `catalog.ts`)**:
  - Creación de `sanitizeHallucinatedSections()` para neutralizar secciones inventadas sin bloques reales o cortes falsos de `anexo` / `bibliografia` / `glosario` sin evidencia de encabezado o léxico real, reabsorbiéndolos al capítulo previo (preservando bibliografías reales).
  - Adición de `expandBlockIdListOrRanges()` (soporta rangos `"blk_A..blk_B"` en `blockIds`), soporte de `startBlockId` sin `endBlockId` mediante `nextSectionStartBlockId`, filtros positivos `isGenuineCoverMetadataBlock()` / `isGenuineTocBlock()` contra agujeros negros de portada/TOC, preservación de secciones de 1 solo bloque `heading` en `reconstructEditorialSectionsFromAst()` y endurecimiento de prompts en `editorial_analyze_ast_structure` / `_long` manteniendo `tier: 'fast'`.
- **Extractores PDF y DOCX sin descarte silencioso (`pdfEditorialExtractor.ts`, `pdfGeometryHelpers.ts`, `docxClientExtractor.ts`)**:
  - Incorporación de `hasUsableEditorialDigitalText()` para retener páginas digitales cortas o con kerning y respaldo automático a líneas digitales si falla OCR; ajuste de `detectTablesInPageLines()` (`colGapMin` y `avgRowChars <= 85`) para distinguir prosa justificada de tablas reales.
  - Sustitución del grep por `outerHTML` en `<w:sdt>` de DOCX por `isTocSdtElement()` sobre `<w:sdtPr>` + procesamiento recursivo `processContainerChildren()` para conservar párrafos y tablas dentro de bloques `<w:sdt>` aunque mencionen `"índice"`.
- **Persistencia, pestañas, modales y versionado (`EditorLeeStudioContent.tsx`, `capabilityRegistry.ts`, `EditorialGlobalNormModal.tsx`, `EditorialImportReviewModal.tsx`, `version.ts`)**:
  - Incorporación de prefijos `ed_copy_` / `ed_teamcopy_` en `capabilityRegistry.ts`, sincronización de ID activo al abrir/duplicar/abrir desde disco (`activateEditorialDocument`), recuperación automática del último manuscrito guardado al recargar, flush en `pagehide`/`beforeunload`, confirmación con `useConfirm()` al reemplazar estructura sobre contenido real (`hasEditorialSubstantiveContent`), poda de placeholders `rec_seed_*` vacíos al importar y bump PATCH a `V3.14.2`.
- **Verificación:** `tests/v3142ZeroTextLossAndAntiHallucination.test.ts` (`5/5`), suite dirigida (`26/26`), `npm run check-all` en 0 errores en local y GitHub Actions (`check-all` + Vercel Preview) en verde antes del merge.

---

## [2026-11-27] - PR #180 (V3.14.1): Motor PDF — Blindaje de Fuentes Estándar (`Times-Roman` / `Helvetica`) y Validación SFNT Profunda sin `Font.clear()`

**Commit en `main`:** `98f2c405baecdb76daaa08aecfd68931c8bde379`

**Resumen:**
- **Eliminación de `Font.clear()` y preservación de familias estándar (`pdfFontRegistry.ts`, `fontSanitizer.ts`)**:
  - Detectado que `Font.clear()` en `@react-pdf/font` v4.0.10 vaciaba las 12 fuentes estándar Type1 (`Times-Roman`, `Helvetica`, `Courier` y variantes) durante los reintentos de `VectorDocViewer.tsx`, provocando `Font family not registered: Times-Roman`.
  - Se reemplazó el limpiado destructivo en `resetBrokenDynamicFonts()` por limpieza selectiva de familias dinámicas, bypass de sesión para fuentes cacheadas, `Font.reset()` y auto-reparación O(1) vía `ensureStandardPdfFontsRegistered()` / `initPdfFonts()`, además de sincronizar `isDynamicFontRegistered()` con `setLiveFontRegistryProbe()` sin importar `@react-pdf/renderer` en el sanitizador puro.
- **Validación SFNT profunda, deduplicación y recuperación de visor (`pdfFontRegistry.ts`, `VectorDocViewer.tsx`)**:
  - Refuerzo de `isValidSfntFontBytes()` (tablas obligatorias `head`, `hhea`, `maxp`, `cmap`, `loca`/`glyf`), creación de `verifySfntDataUrlSafe()` con prueba real de `layout()` + `createSubset().encode()` sobre glifos compuestos latinos (sin romper si `fontkit` no es resoluble directamente) y deduplicación de promesas concurrentes en `ensureAcademicOrCustomFontRegistered()`.
  - Invocación garantizada de `initPdfFonts()` en `VectorDocViewer.tsx` antes del renderizado y respaldo sin imágenes (`stripPdfImagesFromElement` / `sanitizeImageFieldsInData`) si el reintento vuelve a fallar por imágenes corruptas heredadas.
- **Pruebas y versionado (`tests/pdfFontRegistry.test.ts`, `src/shared/core/version.ts`)**:
  - 4 nuevos tests de regresión (recuperación completa tras `Font.clear()`, limpieza selectiva sin afectar fuentes estándar, registro concurrente de `Tinos`/`Arimo` con español completo y rechazo de SFNT truncado) y bump PATCH a `V3.14.1`.
- **Verificación:** `tests/pdfFontRegistry.test.ts` (`8/8`), `npm run check-all` en 0 errores en local y GitHub Actions (`check-all` + Vercel Preview) en verde antes del merge.

---

## [2026-11-27] - PR #178 (V3.14.0): EditorLee — Grafo Vivo de Referencias Cruzadas (Tabla N, Figura N, Anexo A), Auto-Vinculación Bibliográfica e Interiores Diferenciados por Plantilla

**Commit en `main`:** `ed867e1470fc22f75a352842e8d00e5ebe6c7e2a`

**Resumen:**
- **Grafo Vivo de Referencias Cruzadas (`editorialCrossRefEngine.ts`, `CleanBlockCanvas.tsx`, `EditorialSectionFocusPanel.tsx`)**:
  - Numeración dinámica de `Tabla N`, `Figura N` y `Anexo A..Z` en orden de lectura sobre las secciones visibles, renumerando automáticamente tokens `[[ref:<targetId>]]` al reordenar capítulos o agregar bloques.
  - Resolutor unificado `resolveAllEditorialInlineTokens` en vista previa de capítulos, PDF y Word, y selector unificado **`Citar / Ref.`** en capítulos para insertar fuentes o tablas/figuras/anexos en un clic.
- **Auto-Parseo Bibliográfico, Rótulos Normativos y Preflight (`editorialCrossRefEngine.ts`, `editorialUniversalImporter.ts`, `editorialCitationFormatter.ts`, `EditorialBibliographyPanel.tsx`, `editorialPreflightEngine.ts`)**:
  - Conversión automática de bibliografías importadas en texto plano/listas hacia `bibliography_item` estructurados y enlace inequívoco de citas `(Autor, Año)`, `[N]` y menciones a `Tabla N`, `Figura N` y `Anexo A` (disponible también bajo demanda con **`Vincular en capítulos`**).
  - Formateo normativo `formatNormativeElementCaption` (APA 7 en dos líneas arriba de tablas y figuras; Vancouver/IEEE con Figura debajo; literario limpio) sin duplicar prefijos, más alertas `broken_cross_reference` y `uncited_bibliography_item` en Preflight.
- **Diferenciación Visual Real de Interiores (`editorialInteriorTheme.ts`, `EditorialPdfDocument.tsx`, `EditorialBlockPrimitives.tsx`, `editorialDocxExporter.ts`)**:
  - 5 arquetipos interiores (`literario`, `academico_formal`, `cientifico_imryd`, `ejecutivo_proyecto`, `didactico_guia`) acoplados a `coverPaletteKey` con contraste WCAG 2.1 AA verificado (`>= 4.5:1`), diferenciando encabezados, subtítulos, citas en bloque, recuadros de resumen y estilos de tabla tanto en PDF como en Word.
- **Verificación:** `tests/v3140CrossRefsAndPresetInteriors.test.ts` (5/5), `npm run check-all` en 0 errores en local y GitHub Actions (`check-all` + Vercel Preview) en verde antes del merge.

---

## [2026-11-27] - PR #177 (V3.13.0): EditorLee — Desarme Nativo sin Pérdidas (.docx/.odt/.pdf), Mapa Panorámico, Conciencia Global de IA, Vista Previa Blindada y Flujo de 7 Pasos

**Commit en `main`:** `4910a9401e0137169b50b4c027f0a3f9b5059c09`

**Resumen:**
- **Vista Previa PDF Blindada contra `DataView` / `fontkit` / EXIF (`pdfFontRegistry.ts`, `fontSanitizer.ts`, `imageCompressor.ts`, `VectorDocViewer.tsx`, `EditorLeeStudioContent.tsx`, `sw.js`, `vercel.json`)**:
  - Verificación SFNT previa con `fontkit.create()` antes de `Font.register()`, limpieza de segmentos APP1 EXIF corruptos e imágenes truncadas (con guardas anti-bloqueo), hidratación `asset://` al abrir paquetes locales, cache bust `leecv-pwa-v5`, exclusión de assets estáticos del fallback SPA en Vercel y reintento automático en `VectorDocViewer`.
- **Desarme Nativo sin Pérdidas en Navegador (`docxClientExtractor.ts`, `ooxmlMathAndDiagramParser.ts`, `odtClientExtractor.ts`, `pdfGeometryHelpers.ts`, `pdfEditorialExtractor.ts`)**:
  - Word OOXML (`.docx`): deduplicación `mc:AlternateContent` / `mc:Fallback`, cuadros `<w:txbxContent>` / `<v:textbox>`, fórmulas `<m:oMath>`, SmartArt, imágenes dentro de celdas y `gridSpan`, `endnotes.xml` (corrigiendo reenvío en `extractParagraphRichText`), extracción DIB desde EMF y captura de índice original hasta 50 MB.
  - LibreOffice Writer (`.odt`): soporte cliente completo con encabezados, tablas, notas al pie, fórmulas MathML e imágenes.
  - PDF geométrico + visión selectiva: detección tolerante `%PDF` en los primeros 1024 bytes, limpieza de encabezados/pies repetidos, ordenamiento multicolumna XY-Cut, tablas por grilla, rastreo CTM de diagramas/imágenes y asistencia multimodal acotada (`editorial_assist_complex_objects`).
- **Mapa Panorámico, Auditoría Estructural y Conciencia Global de IA (`documentAst.ts`, `editorialUniversalImporter.ts`, `candidateContext.ts`, `catalog.ts`, `ai-generate.ts`, `aiClient.ts`, `editorial.ts`)**:
  - Esquema `StructureAnalysisSchema` tolerante a `null` y expansión de rangos `startBlockId..endBlockId` evitando el colapso en un solo `Capítulo 1`, extracción automática de portada y auditoría (`auditIssues`: títulos duplicados, apartados vacíos, diferencias contra `<imported_toc>`).
  - Inyección de `EditorialDocumentDigest` (`buildCandidateContext`) en todas las tareas editoriales y conocimiento modular de Lidio.
- **Importación Directa, Fusión Granular y Reordenamiento en 7 Pasos (`EditorialInicioArchivoPanel.tsx`, `EditorialImportReviewModal.tsx`, `editorialStepSequence.ts`, `EditorLeeStudioContent.tsx`)**:
  - Eliminado el paso intermedio `"Armar capítulos"` al subir archivos (conservado solo en pegado manual), modal de revisión con fusión granular por capítulo (`agregar debajo`, `sobreescribir`, `sección nueva`, `omitir`) y reordenamiento lógico de 7 pasos (`Inicio → Portada → Capítulos → Citas → Estructura → Estilo → Índice y Salida`).
- **Verificación:** `tests/v3130EditorialDisassemblyAndMap.test.ts` (11/11), `tests/editorLeeDockAndChunker.test.ts` (5/5), `npm run check-all` en 0 errores en local y GitHub Actions (`check-all` + Vercel Preview) en verde antes del merge.

---

## [2026-11-27] - PR #175 (V3.12.0): EditorLee — Motor AST Canónico Lossless con Asset Vault, Reorganización en 7 Pasos, Lienzo Limpio y Corrector Multilingüe

**Commit en `main`:** `4a90dbabea76c8b8146c9c8e5ab8b0b698317fb6`

**Resumen:**
- **Motor AST Canónico Lossless y Seguridad de Ingesta (`documentAst.ts`, `docxClientExtractor.ts`, `editorialUniversalImporter.ts`, `catalog.ts`)**:
  - Esquema Zod canónico (`DocumentASTSchema`, `CanonicalBlockSchema`, bloques `blk_00001..`) que separa los binarios/figuras (`localAssetStore` por hash) del razonamiento estructural por punteros (`buildCompactSkeleton`), auditoría determinista (`assertLosslessIntegrity`) y autoreparación contigua de biyección 1:1 (`repairProposalToLosslessBijection`, `reconstructEditorialSectionsFromAst`).
  - Validación por magic bytes reales (`detectSafeDocumentMime`), límites anti Zip-Bomb en `.docx`, recorte canvas por `bbox` en PDFs y tareas de IA tipadas con esquema OpenAPI compartido (`editorial_analyze_ast_structure`, `editorial_analyze_ast_structure_long` en `tier: 'fast'`, `editorial_proofread_section`).
- **Reorganización de EditorLee en 7 Pasos sin Ruido (`editorialStepSequence.ts`, `editorialDockEngine.ts`, `EditorLeeStudioContent.tsx`)**:
  - Entrada unificada **Inicio y Archivo** (`EditorialInicioArchivoPanel.tsx`), **Datos y Portada** (`EditorialCoverPanel.tsx`), **Estructura y Hoja** (`EditorialStructurePanel.tsx`), **Estilo y Tipografía** (`EditorialStylePanel.tsx`) e **Índice General** (`EditorialTocPanel`).
  - Eliminación del banner repetido `LocalBackupShieldBanner`, guías redundantes y paneles huérfanos (`EditorialPresetInicioPanel.tsx`, `EditorialImportAiPanel.tsx`), además de registro de respaldo en disco sin ciclos de importación (`fileHandleStore.ts` + `nativeFileDocumentService.ts` + `storageResilienceEngine.ts`).
- **Cascada Global-Sección, Lienzo Limpio y Corrector Multilingüe (`editorialPaginationEngine.ts`, `sanitizeEditorialData.ts`, `editorialBlockOperations.ts`, `chapter-editor/*`, `EditorialSectionFocusPanel.tsx`)**:
  - Soporte en cascada de `bodyColumns`, `columnsOverride`, `startNewPageOverride` y `sectionCover.mode` (`'inherit' | 'on' | 'off'`) en paginación, PDF de dos pasadas y Word (`.docx`).
  - Editor de capítulos **Lienzo Limpio** (`CleanBlockCanvas`, `InsertBetweenDivider`, `CleanBlockMediaEditor`) con lectura corrida sin botones en bloques inactivos, división de párrafos, inserción entre bloques, `useConfirm()` y cajón `SectionProofreadDrawer`.
- **Verificación:** `tests/editorial/v3120AstLosslessAndCleanCanvas.test.ts` (5/5), `npm run check-all` en 0 errores en local y GitHub Actions (`2m13s`) + Vercel Preview en verde antes del merge.

---

## [2026-11-27] - PR #174 (V3.11.1): Blindaje de Vista Previa contra DataView (Imágenes DOCX y Fuentes TTF/OTF), Undo/Redo Universal en las 6 Apps y Confirmaciones useConfirm()

**Commit en `main`:** `a1f9b77121710d233997257b5d5498468cc342ea`

**Resumen:**
- **Blindaje DataView / PDF Preview (`imageCompressor.ts`, `localAssetStore.ts`, `docxClientExtractor.ts`, `localFontStore.ts`, `academicFontCatalog.ts`, `pdfFontRegistry.ts`, `EditorialPdfDocument.tsx`, `EditorialPdfCovers.tsx`)**:
  - Saneamiento y validación binaria SFNT/imagen antes de entregar activos o fuentes TTF/OTF al motor `@react-pdf/renderer`, evitando el fallo `Offset is outside the bounds of the DataView` y convirtiendo formatos `.emf`/`.wmf` no compatibles en placeholders editables.
- **Undo/Redo Universal en las 6 Apps y Confirmaciones Canónicas (`useStudioHistory.ts`, `StudioNavbar.tsx`, `UndoRedoControls.tsx`, estudios y secciones)**:
  - Conexión de `useStudioHistory` (coalescing 800 ms, tope 50 estados, móvil + escritorio) en CV/Carta, EditorLee, FacturLee, CardStudio, BookStudio y PlannerStudio, y reemplazo de confirmaciones nativas por `useConfirm()` en acciones destructivas.
- **Verificación:** `tests/v3111DataViewAndStudioHistory.test.ts` (4/4), `npm run check-all` en 0 errores en local, GitHub Actions (`1m23s`) y Vercel Preview antes del merge.

---

## [2026-11-26] - PR #172 (V3.11.0): EditorLee — Motor Editorial Integral: Doble Faz / Simple Faz, Capítulos en Hoja Aparte / Página Impar, Presets Informes/Proyectos y Exportación Word (.docx) con Márgenes Simétricos

**Commit en `main`:** `cfcc533e8c85db88fd42379c65a283b78539e1d8`

**Resumen:**
- **Modelo Editorial, Paginación y Páginas Blancas de Cortesía (`editorialTypes.ts`, `editorialPaginationEngine.ts`)**:
  - Incorporados modos de impresión `simplex` (simple faz) y `duplex` (doble faz), modos de inicio de capítulo (`continuous`, `next_page`, `odd_page`), y resolución en cascada (`resolveEffectiveEditorialPagination`, `resolveSectionEffectiveStartNewPage`).
  - Motor puro `computePaginationWithCourtesyBlanks`: en simplex garantiza 0 hojas blancas residuales; en duplex inserta página blanca de cortesía limpia únicamente si una sección con `odd_page` caería en página par física.
- **Nuevos Presets Canónicos para Informes y Proyectos (`editorialSectionCatalog.ts`, `editorialPresetCatalog.ts`, `capabilityRegistry.ts`, `editorialDockEngine.ts`)**:
  - Creados presets de fábrica `informe-proyecto` y `proyecto-tecnico` con A4, margen de encuadernación interior de 30 mm, pie de página "Página X de Y" e inicio en hoja aparte por defecto.
  - 8 nuevas secciones canónicas (`resumen_ejecutivo`, `introduccion`, `metodologia`, `resultados_discusion`, `cronograma`, `presupuesto_recursos`, `conclusiones`, `anexos_apendices`) con íconos dedicados sin colisiones.
- **Motor PDF de 2 Pasadas con Márgenes Simétricos en Páginas Pares (`EditorialPdfDocument.tsx`, `editorialTwoPassRenderer.ts`)**:
  - Integración de dimensiones físicas exactas vía `getPageSize(design.paperSize)`.
  - Agrupación fluida contigua para secciones que no inician en hoja aparte (`continuous`), intercalado de páginas blancas de cortesía con numeración transparente, y traslación física de márgenes en páginas pares vía `pdf-lib` para encuadernación simétrica real.
- **Exportación Word (.docx) Integral con Márgenes Simétricos (`editorialDocxExporter.ts`, `EditorLeeStudioContent.tsx`)**:
  - Exportador OOXML nativo con carga dinámica de librerías (`docx` y `jszip`), inyección de `<w:mirrorMargins/>`, encabezados y pies diferenciados par/impar, numeración dinámica y saltos de página/sección respetando el flujo de impresión.
- **UI de Controles Globales (Estándar Cero Ruido V3.2) (`StudioNavbar.tsx`, `EditorialPrintFlowModal.tsx`, `EditorialGlobalNormModal.tsx`, `editorialNormEngine.ts`)**:
  - Tres píldoras globales en la barra superior (`Formato`, `Impresión`, `Normas`), modal dedicado `EditorialPrintFlowModal` para elegir Simple Faz / Doble Faz y salto de capítulos sin cálculos manuales, y selectores en los paneles de sección.
- **Verificación:** Suite `tests/editorial/v3110EditorialPaginationAndDocx.test.ts` (5/5), `npm run check-all` en 0 errores en local, GitHub Actions (`1m42s`) y Vercel Preview antes del merge.

---

## [2026-11-26] - PR #170 (V3.10.1): Arranque Limpio sin Flash en leecv.app, Blindaje contra Pantalla Blanca en IA y Optimización de Barra Superior Móvil

**Commit en `main`:** `f5a22f4ce1372a64fe5b0abecf5b912978bffb60`

**Resumen:**
- **Eliminación del Flash en Carga y Prerenderizado (`index.html`, `scripts/prerender.mjs`, `App.tsx`, `AtsAuditHeroWidget.tsx`)**:
  - Corrección del markup estático prerenderizado para reflejar la identidad visual exacta de LEECV, eliminando el parpadeo de estilos durante la hidratación de React y unificando el widget de auditoría ATS.
- **Blindaje contra Pantalla Blanca en Importación y Análisis IA (`imageCompressor.ts`, `localAssetStore.ts`, `VectorDocViewer.tsx`)**:
  - Corrección de desbordamiento de memoria y cuotas de almacenamiento en activos locales, reemplazo de colores hex sueltos por RGB para cumplimiento de tokens de diseño, y manejo robusto de excepciones en el visor de documentos vectoriales para evitar caídas catastróficas de la aplicación.
- **Optimización de Barra Superior Móvil (Estándar Cero Ruido V3.2) (`StudioNavbar.tsx`, `FacturadorStudioContent.tsx`)**:
  - Removido el botón redundante "Ver" en la barra superior en dispositivos móviles cuando los paneles están desplegados (manteniendo únicamente el botón de colapso de paneles).
  - Removida la exhibición del número largo de factura en la píldora superior de FacturLee para priorizar espacio para píldoras globales.
- **Verificación:** Suite `tests/v3101BootStabilityAndMobileTopbar.test.ts` (3/3), `npm run check-all` en 0 errores en local, GitHub Actions y Vercel Preview antes del merge.

---

## [2026-11-25] - PR #168 (V3.10.0): Monetización Modular sin Suscripción Forzosa, Blindaje IA Pro/Ágil, Respaldo Google Drive, Sala de Equipo EditorLee y Admin con Telegram

**Commit en `main`:** `13e0d741245f53e077a68c565a368932b8cd41d1`

**Resumen:**
- **Etapa 1 — Landing 5 Apps, Carta/Tarjeta gratis y Legales (`LandingPage`, `PortalProductsGrid`, `legalCopyEngine`)**:
  - Vidriera principal enfocada en las 5 aplicaciones núcleo + **Carta de Presentación** y **Tarjeta QR** 100% gratis dentro de Currículum, previews WebP y anexos legales generales y por aplicación (alcance de compra definitiva vs. vitalicia, cierre ordenado y ausencia de débitos automáticos).
- **Etapa 2 — Blindaje IA Pro/Ágil, cuotas y caché (`keyRotation.ts`, `catalog.ts`, `api/ai-generate.ts`, `aiClient.ts`, `AIButton.tsx`)**:
  - Separación de `GEMINI_PRO_API_KEYS` respecto del pool rápido `gemini` preservando buckets 429 aislados y revocación compartida 401/403, reclasificación de tareas ágiles vs. Pro, cuotas diarias divididas Fast/Pro con trazabilidad `userId` desde JWT y caché de deduplicación + cooldown en botón IA.
- **Etapa 3 — Pases permanentes, Pase 30d, Billetera y FacturLee 3 gratis (`pricingCatalog`, `applyPayment.ts`, `api/entitlements-api.ts`, `FacturadorStudioContent`, `PdfCheckoutModal`)**:
  - Incorporados `pass_30d`, `pass_editorlee`, `pass_facturlee` y `pass_editorial_team_30d` (compra única por Mercado Pago / PayPal con `returnPath` al estudio o canje directo por créditos de billetera), 3 pruebas gratis iniciales en FacturLee y migración SQL `supabase/migrations/20261125_passes_wallet_teams_funnel.sql`.
- **Etapa 4 — Guardado Cero-Miedo, Google Drive personal y Sesión 1 Crédito (`documentStorageService`, `googleDriveClient.ts`, `exportSessionGrant.ts`, `UniversalBackupModal`)**:
  - `navigator.storage.persist()`, integración con Google Drive personal (`drive.file` con carpetas propias y subida resumable >4 MB), ventana de 15 minutos que cubre PDF + Word/Excel + Drive con 1 crédito, y apertura segura en copia nueva sin pisar borradores locales.
- **Etapa 5 — Sala de Equipo en vivo en EditorLee (`editorialTeamHandler.ts`, `editorialTeamClient.ts`, `EditorialTeamModal`, `EditorLeeStudioContent`)**:
  - Salas colaborativas de hasta 10 personas (titular Pro/`pass_30d`/`pass_editorial_team_30d` + hasta 9 invitados gratis) con bloqueo por capítulo, versionado optimista y sincronización en vivo vía Supabase Realtime aislada de borradores locales (`supabase/migrations/20261126_editorial_teams.sql`).
- **Etapa 6 — Admin automatizado, Bot real de Telegram y correos `leecv.app` (`telegramAlert.ts`, `adminNotifier.ts`, `whatsappAlert.ts`, `lifecycleEmails.ts`, `cron-downgrade.ts`, `admin-api.ts`)**:
  - Reemplazado el stub `wa.me` por alertas reales al Bot de Telegram + unificador no bloqueante, migración de correos a `leecv.app` (`hola@leecv.app`), avisos tranquilos 5 días antes de vencer y acciones Admin (`grant-app-pass`, `revoke-app-pass`, `list-user-passes`, `funnel-metrics`, `test-telegram-alert`, liberación de `resolve-pending-grant` invitado hacia `unclaimed_email_credits` y visibilidad de los 4 pools de IA).
- **Verificación:** `npm run check-all` en `0` errores local (`131` archivos / `1001` tests en verde; 2 skipped preexistentes), GitHub Actions (`check-all` en `2m07s`, `SUCCESS`) y Vercel Preview (`SUCCESS`) antes del merge; 10 endpoints serverless en raíz `api/*.ts`.

---

## [2026-11-24] - PR #166 (V3.9.0): EditorLEE Motor Editorial Pro PR 2 (Fases 6–8) — 12 Formatos, 4 Normas Estructurales Exactas, 7 Estilos Bibliográficos, Preflight y Controles en Estudio

**Commit en `main`:** `cc0371fae3055090616c37b9313a6051108c977c`

**Resumen:**
- **Catálogo de 12 Formatos en 3 Grupos y Paridad PDF (`editorialTypes.ts`, `editorialPresetCatalog.ts`, `editorialPresetDetector.ts`, `pdf/editorialPresets.ts`)**:
  - Publicados los 12 formatos principales agrupados en `literario`, `academico` y `practico` (con 3 alias heredados retrocompatibles `tp-secundaria`, `cientifico-vancouver` y `trabajo-practico-monografia-tesis`) y paridad 1-a-1 con el registro PDF (`pageCategory: 'editorial'`).
- **4 Normas Estructurales Exactas y 7 Estilos Bibliográficos (`editorialNormEngine.ts`, `editorialCitationFormatter.ts`, `EditorialPdfDocument.tsx`)**:
  - Implementado `resolveEditorialNormMetrics()` con márgenes exactos de `25.4 mm` (1 pulgada), desplazamiento inicial `36 pt`, `0 pt` entre párrafos y sangría francesa `36 pt` para APA 7 / Chicago / MLA; citas en bloque Chicago en `1.0`; folios arriba a la derecha en APA 7 / MLA y bloque inicial MLA; y novela literaria con `14 pt` más supresión del primer párrafo tras encabezado.
  - Completados los 7 estilos de referencia (`apa7`, `vancouver`, `ieee`, `harvard`, `chicago`, `mla`, `tradicional`) con cursiva en todos, columna numérica tabulada (`1.` / `[1]`) en Vancouver e IEEE y soporte de `bibAnnotation` (bibliografía comentada).
- **Auditoría Previa a Exportar (`editorialPreflightEngine.ts`, `EditorialPreflightModal.tsx`, `EditorLeeStudioContent.tsx`)**:
  - Nuevo motor puro `runEditorialPreflight` + `autoCleanEditorialPunctuation` conectado antes de `consumeCreditIfNeeded()`, detectando títulos vacíos/genéricos (`"Mi obra"`), secciones vacías, placeholders de figura, baja nitidez y comas/espacios reparables en 1 clic sin gastar créditos si hay errores bloqueantes.
- **Controles UI y Versionado (`EditorialGlobalNormModal.tsx`, `EditorialPresetInicioPanel.tsx`, `EditorialSectionFocusPanel.tsx`, `EditorialDesignAndMetaPanels.tsx`, `EditorialBibliographyPanel.tsx`, `version.ts`)**:
  - Selector agrupado en 3 familias, editores completos (`kickerLabel`, `masterPageMode`, `poem`, `callout`, `epigraph`, `figure_placeholder` convertible a `image`), controles globales (`preliminaryRomanNumerals`, `preventRunts`, `annotatedBibliography`, `headerMode`, `footerMode`), notas comentadas `bibAnnotation` y bump a `V3.9.0`.
- **Verificación:** `tests/editorial/editorialNormEngine.test.ts` (`7/7`), `tests/editorial/editorialPreflightEngine.test.ts` (`4/4`), `npm run typecheck` y `npm run check-all` en `0` errores en local, GitHub Actions (`2m3s`) y Vercel Preview antes del merge.

---

## [2026-11-24] - PR #164 (V3.8.0): EditorLEE Motor Editorial Pro PR 1 (Fases 1–5) — Tipografía Unicode TTF, Extractor OOXML v2, Índice Exacto en 2 Pasadas y Bloques PDF Blindados

**Commit en `main`:** `66c91e60496f1a87ef188de7243c37122dfd2131`

**Resumen:**
- **Modelo y Sanitizador (`editorialTypes.ts`, `sanitizeEditorialData.ts`)**:
  - Agregados tipos retrocompatibles `poem`, `figure_placeholder`, `footnote_list` y `epigraph`; propiedades `calloutTitle`, `calloutItems`, variantes `caja`/`resguardo`, `footnotes`, `tableHasHeaderRow`, `preserveLineBreaks`, `keepTogether` y `bibAnnotation`; además de `kickerLabel`, `masterPageMode`, `runningHeaderText`, `epigraphText`/`epigraphAuthor`, `headerMode`, `footerMode`, `preliminaryRomanNumerals`, `preventRunts` y `annotatedBibliography`.
- **Fuentes Unicode Locales y Motor Tipográfico Puro (`public/fonts/editorial/`, `academicFontCatalog.ts`, `pdfFontRegistry.ts`, `editorialTypographyEngine.ts`)**:
  - Incorporadas las 8 fuentes estáticas TTF completas (`Tinos` y `Arimo` en 4 pesos, 3 209–3 240 glifos c/u) servidas desde `/fonts/editorial/*.ttf` con fallback CDN para eliminar corrupción de glifos (`—`, `–`, `©`, `«`, `»`, `·`, `•`, signos matemáticos y griegos).
  - Implementados `sanitizeEditorialText()` (preserva `\u00A0` y versos en `preserveLineBreaks`), `stripTrailingHeaderPunctuation()` (`"Mi obra." -> "Mi obra"`), `preventParagraphRunts()`, `parseInlineRichRuns()` (`**bold**`, `*italic*`, `***bi***`, `◆`, `[^N]`) y `detectUnsafeWinAnsiChars()`.
- **Extractor OOXML v2, Chunker, Importador y API (`docxClientExtractor.ts`, `editorialManuscriptChunker.ts`, `editorialUniversalImporter.ts`, `api/editorial-doc-api.ts`)**:
  - Conservación de negritas/cursivas `<w:b/>`/`<w:i/>`, `<w:br/>`, exclusión de `<w:del>`, lectura de `word/footnotes.xml`, omisión de índices manuales (`ÍNDICE GENERAL`) además de `TOC*`, conversión de tablas de 1 columna y bloques `CAJA N` sombreados en `callout` estructurados intactos, tablas clave-valor (`tableHasHeaderRow: false`), fusión de versos en `poem` y detección de `figure_placeholder`.
  - Fusión de portadillas `Heading 1 + ◆ + Heading 2` en una única sección (`kickerLabel` + `title`) dejando `Heading 2+` internos como `subtitle`; guardia de retención IA al `98%`, advertencia clara al importar PDF y actualización de `api/editorial-doc-api.ts` (`mammoth.convertToHtml` + `export-docx`).
- **Índice Dinámico Exacto en 2 Pasadas (`editorialTocResolver.ts`, `editorialTwoPassRenderer.ts`, `VectorDocViewer.tsx`, `EditorLeeStudioContent.tsx`)**:
  - Reemplazada la estimación fija por marcadores `__TOC_ID:<id>__` escaneados con `pdfjs-dist` (`MAX_TOC_PASSES = 2` más convergencia acotada), folios romanos en preliminares (`ii, iii...`) y reinicio arábigo en `1` al iniciar el cuerpo.
- **Bloques PDF Blindados (`EditorialBlockPrimitives.tsx`, `EditorialPdfCovers.tsx`, `EditorialPdfDocument.tsx`)**:
  - `EditorialDiamondSvg` vectorial para `◆` (sin `◆ -> Æ`), `EditorialTableBlock` con `computeOptimalTableLayout` + encabezados `fixed` + filas `wrap={false}`, `EditorialCalloutBlock`, `EditorialPoemBlock`, `EditorialFigurePlaceholderBlock`, `EditorialEpigraphBlock`, `EditorialFootnoteListBlock`, bandas de 2 columnas (`partitionRecordsIntoColumnBands`), texto alrededor de imágenes (`splitTextAroundImage`), `minPresenceAhead={56}`, `orphans={2} widows={2}`, sangría de `36 pt` y 3 Páginas Maestras (`clean`, `preliminary`, `body`).
- **Verificación:** Suites `tests/editorial/{editorialTypographyEngine,docxClientExtractor,editorialTocResolver}.test.ts` (`29/29` editoriales en verde), versión `V3.8.0` y `npm run check-all` con `0` errores en local, GitHub Actions (`1m41s`) y Vercel Preview antes del merge.

---

## [2026-11-24] - PR #162 (V3.7.0): Libro Folleto — Separadores de Capítulos, Color y Cuentagotas, Guillotina en Casa, Paridad/Foliado y Portal Global de Modales

**Commit en `main`:** `577d6cce92317fe8a9f732c0ad2e78de9a0f7ebe`

**Resumen:**
- **Portal Global de Modales (`Modal.tsx`, `LightboxModal.tsx`, `CreditsModal.tsx`, `CoverLetterOnboardingModal.tsx`, `RetentionOfferModal.tsx`)**:
  - Montaje vía `createPortal(..., document.body)` con `zIndex.modal` (`9999`), `overflow-y-auto` en el backdrop y `max-h-[calc(100dvh-2rem)]` para evitar que la barra superior (`StudioNavbar`) o el contenedor `z-20` del panel recorten ventanas emergentes en cualquier app.
- **Tapa, Contratapa y Selector de Color + Cuentagotas (`BookCoverStep.tsx`, `BookBackCoverStep.tsx`, `BookCoverColorPickerGrid.tsx`, `bookColorUtils.ts`)**:
  - Etiquetas actualizadas a **`Crear Tapa`** y **`Crear Contratapa`**, con las perillas **`Hoja detrás`** y **`Hoja delante`** movidas a `headerRight` del encabezado del panel junto a su globito de ayuda `?`.
  - Botón *"Canon Clásico"* reemplazado visualmente por **`Elegir color`** (manteniendo `monica-classic` intacto para CV y EditorLEE), con `<input type="color">`, cuentagotas (`EyeDropper` con fallback) y selector de texto claro/oscuro por contraste WCAG.
- **Paso 5. Separadores (`BookDividersStep.tsx`, `BookSectionDividerModal.tsx`, `bookStepSequence.ts`, `appRegistry.ts`, `bookDividerCanvas.ts`, `impositionMath.ts`)**:
  - Secuencia ampliada a 8 pasos ubicando **`5. Separadores`** (`Bookmark`) antes de **`6. Encuentro un número`**.
  - Corrección matemática de paridad con `countInsertedPagesBeforePdfPage` y `countBlanksBehindCoverWithOffset`, más soporte de `blank` y tokens `divider:` dentro de `hasSplitIds` (modo fotocopia).
- **Paso 6, Paso 7 (`Armado y Guías`), Guillotina en Casa y Conteo (`BookFoliadoStep.tsx`, `BookImpositionStep.tsx`, `BookPreviewExportStep.tsx`, `bookSeparateCover.ts`, `bookPageCount.ts`, `bookPrintProfileEngine.ts`)**:
  - Paso 6 opcional: no ejecuta IA ni agrega blancos si no se elige calibración; ofrece confirmación en 1 clic sin IA cuando hay separadores con hoja detrás.
  - Paso 7 adaptado a configuración global: en **En casa** muestra destinos A y B (`tapa_y_contratapa_guillotina.pdf` con Contratapa a la izquierda y Tapa a la derecha) y oculta grosor de lomo/*creep*; en **Imprenta** mantiene A, B y C (`Contratapa | Lomo | Tapa`).
  - Extracción opcional de 1ª y última página del PDF al separar tapas sin tapa/contratapa creada (`extractPdfCoversWhenSeparate`), desglose en vivo (`computeBookPageBreakdown`), modo `at-least-one` para el blanco antes de contratapa y selector manual `paddingPlacement`.
- **Verificación:** `tests/i18n/bookStudio.test.ts`, `tests/book-engine/bookDividersAndParity.test.ts`, `tests/modalPortal.test.tsx`, versión `V3.7.0` y `npm run check-all` en verde local, en GitHub Actions y Preview Deploy de Vercel antes del merge.

---

## [2026-11-23] - PR #157 (V3.5.0): Libro Folleto y EditorLEE — Modo Automático, Orientación y Foliado IA, Separadores de Capítulos y Detector de Tipo de Obra

**Commit en `main`:** `716d5e534513249cc5f91fe066b3501141bb5461`

**Resumen:**
- **Libro Folleto — Modo Automático Directo (`BookSourceTypeStep.tsx`, `BookStudioContent.tsx`)**:
  - Inicia por defecto en `workflowMode: 'auto'` para quienes solo desean maquetar y ordenar las páginas (tanto en PDF Estándar como en PDF Fotocopia/Escaneado) directo hacia el armado e impresión sin preguntas intermedias, con opción a cambiar a **Modo Guiado / Personalizado (pasos 1 a 6)** con 1 clic.
- **Libro Folleto — Orientación Inteligente con IA en Fotocopia/Escaneado (`bookOrientationAi.ts`, `catalog.ts`, `BookSourceTypeStep.tsx`, `BookOrganizeStep.tsx`, `ThumbnailCard.tsx`, `LightboxModal.tsx`)**:
  - Inspecciona primero matriz de transformación del texto OCR nativo (Capa 0) y, si no alcanza, envía muestras comprimidas de las hojas `[2, 5, 10, 15]` a `book_detect_orientation`.
  - Si las muestras coinciden en un mismo giro (`0°`, `+90°` derecha, `-90°/270°` izquierda o `180°`), lo aplica automáticamente a todas las páginas verticales. Si detecta giros mixtos, avisa al usuario y ofrece **Girar manualmente** o **Que la IA revise cada página (imagen muy comprimida)** (lotes de 4 hojas ≤16 págs. o grillas 2×2 rotuladas `[A..D]` >16 págs.).
  - Corregido bug de doble rotación (`90° + 90° = 180°`) en `ThumbnailCard.tsx` y `LightboxModal.tsx`.
- **Libro Folleto — Paso 5 ("5. Encuentro un número") Asistido por IA (`bookFoliadoAi.ts`, `impositionMath.ts`, `BookFoliadoStep.tsx`, `LightboxModal.tsx`)**:
  - Búsqueda progresiva en las hojas `[2, 5, 10, 15]` (y segunda ola `[20, 25, 30, 40]` si solo aparecen preliminares romanos) combinando texto nativo en franja superior/inferior + recortes JPEG con Vision (`book_detect_page_numbers`).
  - Deduce matemáticamente qué hoja del PDF corresponde a la **Página 1** (p. ej. si halla el número `10` en la hoja 14 del PDF, retrocede 9 páginas hasta la hoja 5) y renderiza en pantalla la **miniatura de la Página 1 deducida** (con soporte para mitades Izquierda/Derecha en fotocopia, capítulos sueltos y botones `◀ / ▶` de ajuste fino ±1 hoja).
- **Carátulas / Separadores por Capítulos o Secciones (`bookDividerCanvas.ts`, `BookSectionDividerModal.tsx`, `PdfPreviewStrip.tsx`, `bookPageCount.ts`, `impositionEngine.ts`, `EditorialPdfCovers.tsx`, `EditorialPdfDocument.tsx`, `editorialTocResolver.ts`, `EditorialCoverPanel.tsx`, `EditorialSectionFocusPanel.tsx`)**:
  - **Libro Folleto:** Inserción manual de portadas interiores antes de cualquier página del PDF con 2 formatos (**Con hoja blanca detrás (2 págs.)** o **Solo 1 página**), consumiendo los 6 arquetipos de `COVER_PRESETS_CATALOG` o imagen subida y preservando la calidad vectorial de las páginas originales del PDF en `useVectorPath`.
  - **EditorLEE:** Componente `<EditorialSectionDividerPage />` consumiendo los 6 arquetipos de `COVER_PRESETS_CATALOG`, desactivado por defecto y activable globalmente o por capítulo/apartado (con opción de dorso blanco y ajuste automático de numeración en el índice TOC).
- **EditorLEE — Recomendación IA de Tipo de Obra al Importar + Acceso desde "Obra activa" (`editorialPresetDetector.ts`, `EditorialImportAiPanel.tsx`, `EditorialPresetInicioPanel.tsx`)**:
  - Agregado botón directo **"Importar manuscrito o apuntes (Word, PDF, fotos)"** dentro de `<PanelSection title="Obra activa">`.
  - Detector híbrido (`detectEditorialPresetFromText` + tarea IA `editorial_detect_preset`) que, al subir o estructurar un documento cuyo contenido corresponde a otro preset (p. ej. un *Informe / Proyecto* con la app en *Libro / Novela*), muestra una sugerencia instantánea para cambiar con 1 clic respetando `preserve-manual`.
- **Verificación:** Suite de tests `tests/book-engine/bookOrientationAndFoliadoAi.test.ts` y `tests/editorial/editorialPresetDetectorAndCovers.test.ts`, versión `V3.5.0` y `npm run check-all` en verde local y en GitHub Actions.

---

## [2026-11-22] - PR #155 (V3.4.0): TopBar de 4 Zonas, Tema en Preferencias, Docks Compactos y Estándar Cero Ruido en CV, EditorLee y Libro/Folleto

**Commit en `main`:** `6f9dc8f7278f4f70a7c55e77a517d8ed0a5c5a22`

**Resumen:**
- **TopBar de 4 Zonas, Tema Global y Móvil (`StudioNavbar.tsx`, `AppShell.tsx`, `StudioHost.tsx`, `appContract.ts`, `topBarActionRegistry.ts`)**:
  - Quitado `ThemeToggleButton` de la barra superior en estudios y reubicado el selector de los 4 temas (`UI_THEME_CYCLE`) dentro del menú **Cuenta & Preferencias** (junto a Créditos, Compartir y Privacidad).
  - Eliminado el botón móvil `"Editar"` inútil de la barra superior, unificando el intercambio editor/vista previa en móvil vía `isPanelOpen` y un botón único `"Ver"` (`onCloseMobilePanel`).
  - Implementado presupuesto declarativo `TOPBAR_BUDGET` (`globalContextPills` máx. 3 con 1 modal = 1 eje, `globalActions` máx. 2) con sanitización anti emoji+ícono (`stripLeadingEmoji`) y delegación completa en `StudioHost.tsx`.
- **CV Builder (`cvDockProvider.ts`, `CvWorkspaceContent.tsx`)**:
  - Igualado `diseno` (**Estilo & Color**) a `isLarge: false` (`2×2` uniforme con tipografía, hoja y portada); reordenado el Dock con `importar_datos` + `vacante` al principio y `nueva_seccion` (`+`) al final (`groupBreakBefore: true`), moviendo `carta` a `globalActions` en barra superior.
- **EditorLee (`EditorLeeStudioContent.tsx`, `EditorialGlobalNormModal.tsx`, `editorialNormEngine.ts`, `editorialDockEngine.ts`, `editorialStepSequence.ts`, paneles)**:
  - Desdoblado el modal global ruidoso en **3 píldoras independientes en barra superior** (`Tipo de obra`, `Norma visual`, `Estilo de citas`), eliminando la duplicación Modal ↔ Panel y Panel ↔ Panel en `EditorialPresetInicioPanel`, `EditorialDesignAndMetaPanels` y `EditorialBibliographyPanel`.
  - Dock convertido a botones núcleo compactos (`isLarge: false`) en 2 columnas manteniendo badges para capítulos y apartados (`i`, `ii`, `1`, `2`, `Cl`, `A`).
- **Libro / Folleto (`bookPrintProfileEngine.ts`, `BookPrintTargetModal.tsx`, `BookPaperSizeModal.tsx`, `BookStudioContent.tsx` y pasos `BookSourceTypeStep`..`BookPreviewExportStep`)**:
  - Eliminada la doble casita (`pillText` limpio e íconos únicos `printHome` / `printShop` / `disenoHoja`), añadidas 2 píldoras globales en TopBar (`En casa / Imprenta` + `Hoja (...)`) sin repetir selectores en Paso 1 (`1.b`) ni en Paso 6, y aplicados los 3 canales de ayuda Cero Ruido (`?`, `ContextualGuideBox`, `emitLidioMessage({ kind: 'state' })` + `SectionSwitch`).
- **Fábrica de Apps Nativas y Guardrails (`scripts/new-app.ts`, `scripts/verify-app-contract.ts`, `docs/APP_BLUEPRINT.md`, `docs/ARQUITECTURA_PLATAFORMA.md`, `AGENTS.md`, `version.ts` V3.4.0)**:
  - Formalizadas las reglas de TopBar, 1-eje-1-modal, anti-duplicación, anti emoji+ícono y Dock compacto de 2 columnas en generador, auditoría de contrato, guías y suite de tests (`npm run check-all` en verde local y en GitHub Actions).

---

## [2026-11-22] - PR B (V3.3.0): EditorLee — Píldora Global de Normas Separadas, Cascada Anti-Pisado y Citas Automáticas en Línea

**Resumen:**
- **Separación de Ejes Globales (`editorialNormEngine.ts` + `editorialTypes.ts` + `editorialPresetCatalog.ts`)**:
  - Desacoplada la **Norma Estructural de Página** (`structuralNormId`: `libre`, `apa7`, `chicago`, `mla`) del **Estilo de Referencias Bibliográficas** (`bibliographyStyle`: `apa7`, `vancouver`, `ieee`, `harvard`, `chicago`, `mla`, `tradicional`).
  - Integrado `checkEditorialNormCompatibility()`: confirma automáticamente combinaciones estándar como estructura `APA 7` + citas `Vancouver / IEEE / Harvard`, y advierte con tono informativo el acoplamiento estricto al mezclar `Chicago` o `MLA 9`.
  - Aplicada cascada 3 niveles con `manualOverrides` (`applyEditorialGlobalConfig`, `markEditorialFieldManual`, `clearEditorialFieldManual`) en `EditorialDisenoPanel` junto a `<ManualOverrideBadge />` en márgenes, hoja, tipografía, cuerpo, interlineado, sangría y numeración.
- **Píldora Global en Barra Superior y Modal Unificado (`EditorialGlobalNormModal.tsx` + `EditorLeeStudioContent.tsx`)**:
  - Agregada la píldora `globalContextPill` junto a `ATS` en `StudioNavbar` (`APA 7 · Vancouver`, `APA 7 · IEEE`, `Libro`, `Chicago`, etc.), abriendo `EditorialGlobalNormModal` con detección de conflictos manuales (`Conservar mis ajustes finos` vs `Aplicar toda la norma nueva`).
- **Citas Automáticas en Capítulos, Secciones y Anexos (`editorialCitationFormatter.ts` + `EditorialSectionFocusPanel.tsx` + `EditorialPdfDocument.tsx`)**:
  - Añadidas reglas completas de formato para **IEEE** `[1]`, **Harvard** y **MLA 9** junto a APA 7, Vancouver, Chicago y Tradicional.
  - Agregado selector `+ Citar fuente` (existentes + creación rápida en línea `+ Nueva fuente` con página opcional) dentro de `EditorialSectionFocusPanel`, insertando tokens canónicos `[[cite:bibId]]` y mostrando previsualización en vivo.
  - Al cambiar de norma global, `computeCitationAppearanceOrder`, `resolveInlineCitationsInText` y `syncSectionsBibliographyOrder` actualizan automáticamente todas las citas en los capítulos y reordenan la bibliografía en el PDF (`EditorialPdfDocument.tsx`).
- **Verificación**: Nueva suite `tests/editorLeeNormCascadeAndInlineCitations.test.ts`, conocimiento modular `api/_lib/aiTasks/appKnowledge/editorial.ts` actualizado, versión `V3.3.0` y `npm run check-all` en verde.

---

## [2026-11-22] - PR A (V3.2.0): Taxonomía de Botones, Píldora Global Universal, Cascada Anti-Pisado y Perfiles En casa vs Imprenta en Libro/Folleto

**Resumen:**
- **Motor Universal de Cascada Anti-Pisado (`configCascadeEngine.ts` + `ManualOverrideBadge.tsx`)**:
  - Implementada jerarquía explícita Nivel 1 (Global) → Nivel 2 (Preset/Tema) → Nivel 3 (`manualOverrides` puntuales), evitando pisar ajustes manuales sin consentimiento (`detectGlobalConflicts`, `applyGlobalConfigWithCascade` con `'preserve-manual'` vs `'apply-all'`, e insignia Cero Ruido con reset puntual `↺`).
- **Píldora Global Universal en `StudioNavbar.tsx` + `capabilityRegistry.ts`**:
  - Agregada capacidad declarativa `global_context` (CV, Libro/Folleto, EditorLee) y `globalContextPill` junto a `ATS`, dejando un único patrón canónico para decisiones de nivel documento en barra superior.
- **Taxonomía Visual de Botones (8 Roles en Dock y Paneles)**:
  - Definidos `DockButtonRole` (`catalog`, `preset`, `record`, `custom_record`, `ai_utility`, `handoff`) y `UiButtonRole` (`preset`, `record`, `io`, `export_paid`, `ai`, `handoff`, `destructive`) con separadores de grupo `--ui-dock-separator` en `StudioDock.tsx`.
  - Asignados roles explícitos en todos los proveedores de Dock (`cv`, `cover_letter`, `business_card`, `editorial`, `book`, `planner`, `invoice`), botones de `ExperienciaSection.tsx` y `ActionTileButton` de `ImportDataSection.tsx` / `JsonDownloadModal.tsx`.
- **Libro / Folleto — Píldora `🏠 En casa` vs `🏭 Imprenta` y Hojas Extendidas**:
  - Agregados `sra3` (320 × 450 mm), `a3_plus` (329 × 483 mm) y `a2` (420 × 594 mm) en `pageSizes.ts` con lenguaje sencillo (`appLabel` técnico entre paréntesis).
  - Creado `bookPrintProfileEngine.ts` + `BookPrintTargetModal.tsx`: hojas caseras (`A4`, `Carta`, `Oficio`, `Legal`, `A3`) vs pliegos de imprenta (`A3`, `SRA3`, `A3+`, `A2`), extendido `impositionEngine.ts`, `CoverPreviewThumbnail.tsx`, `BookSourceTypeStep.tsx`, `BookPreviewExportStep.tsx` y refactorizado `BookImpositionStep.tsx` con `<SectionSwitch />`, `<LidioHelpTrigger />` y `<ManualOverrideBadge />`.
- **Fábrica Agéntica de Apps (`scripts/new-app.ts`, `docs/APP_BLUEPRINT.md`, `AGENTS.md`)**:
  - Generación automática de roles `DockButtonRole` en `<id>StepSequence.ts`, `<ActionTileButton role="..." />`, `<VisibilityEyeToggle />`, `<ManualOverrideBadge />` y `globalContextPill` en `<Pascal>StudioContent.tsx`, validados en `npm run new-app -- --selftest`.
- **Verificación**: Suites nuevas `tests/buttonTaxonomyAndCascade.test.ts` y `tests/bookPrintProfiles.test.ts`, versión fijada en `V3.2.0` y pasada completa de `npm run check-all` en verde.

---

## [2026-11-22] - PR 2 (V3.1.0): EditorLee — Importación Universal + OCR, Chunker de Textos Largos, Dock Numerado, Presets Secundaria/Terciario/APA 7/Vancouver, Bibliografía y Portadas Adaptadas

**Resumen:**
- **Etapa 4A — Presets Académicos/Literarios, APA 7 y Vancouver**:
  - Expandido `editorialTypes.ts`, `editorialSectionCatalog.ts` (`marco_teorico`, `resultados`, `discusion` con clave canónica `sectionKey` y `category`) y `editorialPresetCatalog.ts` + `pdf/editorialPresets.ts` con presets investigados para **Informe Escolar Secundaria (`tp-secundaria`)**, **Monografía Terciaria (`monografia-terciaria`)**, **Tesis Universitaria Normas APA 7.ª ed. (`tesis-apa7`)** (márgenes 25 mm, interlineado doble 2.0, inicio de párrafo desplazado y referencias alfabéticas), **Informe Científico IMRyD Vancouver (`cientifico-vancouver`)** (orden numérico `[1], [2]` de aparición) y libros/novelas (`libro-ensayo-novela`).
  - Creado motor puro `editorialCitationFormatter.ts` (`formatEditorialCitation`, `sortBibliographyRecords`, `BIBLIOGRAPHY_NORM_GUIDES`) para orden y formato automático APA 7, Vancouver ICMJE, Chicago y Tradicional.
- **Etapa 4B — Dock Numerado (`i`, `ii`, `1`, `2`, `A`), Portadas Vectoriales y Render PDF**:
  - Agregado `badgeLabel` a `stepSequenceRegistry.ts` y soporte en `StudioDock.tsx`; creado `editorialDockEngine.ts` (`buildEditorialDockTabs`, `resolveSectionBadgeLabel` con Regla 8) y conectado en `appRegistry.ts` + `assistantTips.ts` para mostrar cada capítulo/sección como botón con distintivo (`i`, `ii` en preliminares; `1`, `2` en cuerpo; `A`, `B` en anexos).
  - Creado `EditorialPdfCovers.tsx` adaptando los 6 arquetipos de `COVER_PRESETS_CATALOG` y las paletas de `PRESET_COLORS` (literaria, académica y ejecutiva) e integrado en `EditorialPdfDocument.tsx` junto con formato real de citas APA 7 (cursiva y margen francés) y Vancouver.
- **Etapa 5 — Importación Universal (DOCX/ODT/RTF/PDF digital + OCR/Fotos) y Chunker Largo**:
  - Extendido `api/editorial-doc-api.ts` (acción `parse-document` con extracción directa para Word `.docx`, LibreOffice/Google Docs `.odt` vía `jszip`, `.rtf`, `.html`, `.txt` y `.md`) y `vercel.json`.
  - Habilitado reenvío seguro de imágenes en `api/ai-generate.ts`, mejorado `editorial_structure` para textos largos planos sin jerarquía y añadidas tareas `editorial_ocr_page` y `editorial_format_citation` en `api/_lib/aiTasks/catalog.ts` + `aiClient.ts`.
  - Creados `editorialManuscriptChunker.ts` (segmentación inteligente, fusión continua `continuesPreviousSection` y respaldo heurístico Regla 8) y `editorialUniversalImporter.ts` (PDF híbrido con `analyzePdfPage` + OCR selectivo por `pageImageEncoder`).
- **Etapa 6 — UI Modular Cero Ruido para EditorLee**:
  - Modularizado `EditorLeeStudioContent.tsx` (reducción de 1 551 a ~435 líneas) extrayendo `EditorialPresetInicioPanel.tsx`, `EditorialCoverPanel.tsx`, `EditorialSectionFocusPanel.tsx` (lápiz por bloque + botones IA reales de reescritura/ortografía con confirmación previa), `EditorialSectionsOverviewPanel.tsx`, `EditorialBibliographyPanel.tsx`, `EditorialDesignAndMetaPanels.tsx` y refactor de `EditorialImportAiPanel.tsx`, junto con actualización de `api/_lib/aiTasks/appKnowledge/editorial.ts`.
- **Verificación**: Nuevas suites `tests/editorLeePresetsAndCitations.test.ts` y `tests/editorLeeDockAndChunker.test.ts`, actualización de `version.ts` a `V3.1.0` y pasada completa de `npm run check-all` en verde.

---

## [2026-11-22] - PR 1 (V3.0.0): UI Cero Ruido, Lidio `?` y Móvil, Región en Barra Superior, 3 Botones de Diseño y Carpeta Segura

**Resumen:**
- **Etapa 0 — Bus vivo de Lidio y geometría móvil corregida**:
  - Creado `src/shared/core/assistant/lidioBus.ts` (`emitLidioMessage`, `subscribeLidioMessages`) con deduplicación por `groupKey`.
  - Jerarquía formal de `zIndex` en `uiDesignSystem.ts` (`dock: 900 < assistantFab: 950 < assistantToast: 1050 < assistantDialog: 1100 < modal: 9999`) y animación `.ui-ai-sparkle-loop` con `prefers-reduced-motion` en `src/index.css`.
  - Reubicado el FAB y las notificaciones de Lidio sobre el Dock móvil (`bottom-[86px]`) en `FloatingAssistant.tsx` y `AssistantNotificationToast.tsx`; diálogo de Lidio en móvil transformado a bottom-sheet legible (`82dvh`) con backdrop; `AppShell.tsx` agrega `pb-24 md:pb-0` para evitar cortes detrás del Dock inferior.
- **Etapa 1 — Primitivos UI Cero Ruido y Fábrica de Apps**:
  - Registrados 5 íconos únicos verificados en `iconRegistry.ts` + `iconCatalog.ts` (`helpBubble`, `diseno_tipografia`, `diseno_hoja`, `region`, `folderSafe`).
  - Creados `LidioHelpTrigger.tsx` (Portal en escritorio/modales y `lidioBus` en móvil), `ContextualGuideBox.tsx` (siempre visible solo para redactar), `VisibilityEyeToggle.tsx`, `SectionSwitch.tsx`, `ActionTileButton.tsx` y `ActionGrid.tsx`.
  - Actualizados `AIButton.tsx` (símbolo IA animado `iconOnly` por defecto), `PanelSection.tsx` (`helpText`, `headerRight`), `InfoHint.tsx` y `Modal.tsx` (eliminado `z-[${...}]` dinámico y agregado `helpText`).
  - Actualizados `scripts/new-app.ts` (+ `--selftest`), `tests/appFactoryPhase10.test.ts`, `docs/APP_BLUEPRINT.md` y `AGENTS.md`.
- **Etapa 2 — Refactor CV, Región en Barra Superior, 3 Botones de Diseño, Modales y Otras Apps**:
  - Elevado el selector internacional de formato (`¿Para quién es este CV?`) a píldora `🌐 <shortBadge>` en `StudioNavbar.tsx` junto a `ATS`, abriendo el modal unificado `FormatConfirmationModal.tsx` desde `AppModals.tsx` / `useWorkspaceModalsAndExport.ts` / `CvWorkspaceContent.tsx` / `App.tsx`, con capacidad declarativa `region_format` en `capabilityRegistry.ts` y `cvFormatRegistry.ts`.
  - Corregida la cascada de 3 niveles en `presetHierarchyEngine.ts`: cambiar de plantilla visual preserva las secciones apagadas por el usuario o por la región y el bloqueo de 1 columna en `us-resume` / `ats-one-column`; alternar entre 2 columnas izquierda/derecha mantiene formatos 2-col (`europass`, `tech-portfolio`, `latam-clasico`).
  - Dividido Diseño del CV en `cvDockProvider.ts` en 3 botones (`diseno` Estilo & Color, `diseno_tipografia` Letra & Espacio, `diseno_hoja` Hoja & Columnas), retirado `CoverLetterCrossSellBanner` de `EditorPanel.tsx`, actualizado `ruleTargetTabs.ts` (`multicol_layout -> diseno_hoja`), `assistantTips.ts` y `api/_lib/aiTasks/appKnowledge/cv.ts`.
  - Refactorizados `ImportDataSection.tsx` (`ActionGrid` 2 columnas con `?`), `PersonalInfoFields.tsx` (`VisibilityEyeToggle`), `SectionToggle.tsx`, `RepeatableSection.tsx`, `PortadaSection.tsx`, `PersonalInfoSection.tsx` (`SectionSwitch`), `FirmaSection.tsx` (fix de props `sectionKey`/`sectionTitle`), `RecordFormSection.tsx`, `ObjetivoSection.tsx`, `ResumenSection.tsx`, `HabilidadesSection.tsx`, `CompetenciasSection.tsx`, `ExperienciaSection.tsx`, `JobTargetSection.tsx`, `ApplicationCoverLetterSection.tsx`, modales (`PrepareApplicationModal`, `ImportCvAiModal`, `ImportCertificateAiModal`, `CoverLetterExportModal`, `SaveModal`, `SaveAsVersionModal`) y ajustes limpios en `card-studio` (`CardBackSection`, `CardSizeSection`) y `facturador-studio` (`FactRespaldoStep`).
- **Etapa 3 — Carpeta Segura Explícita en Disco**:
  - Creado `src/shared/core/storage/fileHandleStore.ts` y extendido `nativeFileDocumentService.ts` (`chooseWorkspaceFolder`, `getWorkspaceFolderStatus`, `listWorkspaceFolderFiles`, escritura directa en Carpeta Segura y aviso explícito vía Lidio al usar Descargas en navegadores sin API de carpeta), integrado en `JsonDownloadModal.tsx` y `SavedCVsModal.tsx`.
- **Verificación**: Nuevas suites `tests/uiZeroNoiseSystem.test.ts`, `tests/presetCascadeV3.test.ts` y `tests/workspaceFolderPersistence.test.ts`; actualización de `scripts/verify-cv-engine-harmony.js`, `tests/presetComposition.test.ts` y `tests/ruleTargetTabs.test.ts`; versión fijada en `V3.0.0`.

---

## [2026-11-21] - Flujo de Postulaciones IA/ATS, Importación Certificados, Mover Registros, Archivos Tipo Word y Visor EditorLee (V2.29.0)

**Resumen:**
- **Fase 1 — Hotfix `Times New Roman` y Visor EditorLee**: Habilitadas `Times-Roman` (+ Bold/Italic/BoldItalic) en `fontSanitizer.ts`; corregidos `editorialPresetCatalog.ts` y `EditorialPdfDocument.tsx` (`sanitizeFontFamily`, `#6B7280`, tamaño de hoja unificado, carátula multipreset y anclas `ANCHOR_START`/`ANCHOR_END`); habilitado `anchorMap` universal en `pdfAnchorEngine.ts`; integrado `ScaledPaperSheet` + `quantizeRasterZoom` + foco al tocar secciones en `EditorLeeStudioContent.tsx`.
- **Fase 2 — Panel "Importar datos" en CV**: Añadida apertura de archivos de respaldo (`.json`/`.leecv`/`.zip`) en `ImportDataSection.tsx`, acción backend `extract-certificate` en `api/cv-import-api.ts` y modal `ImportCertificateAiModal.tsx` con selector de sección y pregunta para adjuntar imagen en `Certificados`.
- **Fase 3 — Reclasificación de Registros**: Creado motor puro `recordReclassificationEngine.ts` con familias compatibles estrictas (bloqueando `redes` y `referencias`) y preservación en Descripción de campos extra; integrado botón `"Mover a…"` en `RepeatableSection.tsx`.
- **Fase 4 — Postulaciones IA/ATS + Carta Gratuita + Lidio**: Agregadas tareas `suggest_job_profiles` y `tailor_cv_for_application` en `api/_lib/aiTasks/catalog.ts`; rediseñado `JobTargetSection.tsx` + `PrepareApplicationModal.tsx` (Puesto "Ninguno"/Empresa "Ninguna" en CV Base, botón "Analizar en qué me perfilo", tabla de oportunidades y modal editable de descripción antes de crear/optimizar el CV derivado); metadatos ATS nativos `<Document subject keywords>` en `pdfAtsMetadataBuilder.ts` + `TemplateRenderer.tsx`; Carta de Presentación desbloqueada en CV Base, con botón directo desde Vacante, sin consumo de créditos y exportación siempre separada (`ApplicationCoverLetterSection.tsx`, `CoverLetterExportModal.tsx`); conocimiento actualizado de Lidio.
- **Fase 5 — Archivos portátiles estilo Word y PWA**: Creados `leecvPackageCodec.ts`, `nativeFileDocumentService.ts` y `fileLaunchHandler.ts`; integrados guardado/apertura `.leedoc` con `Ctrl+S` y bloques `+ Imagen` en `EditorLeeStudioContent.tsx`, opción `.leecv` en `JsonDownloadModal.tsx`, y `file_handlers` / `launch_handler` con iconos de rayo en `public/manifest.json` y `src/app/App.tsx`.

---

## [2026-11-21] - Fases 8, 9 y 10: Cápsulas Verticales (0/0 AST), card-studio independiente y Fábrica de Apps (V2.28.0)

**Resumen:**
- **Fase 8 — Cápsulas Verticales (`{domain, pdf}`), `src/shared/kits/` y 0 violaciones / 0 ciclos AST**:
  - Rotura de los 2 ciclos runtime en `pdf-engine`: conversión a `import type` de interfaces en `presetSchema.ts`, `typographyHierarchyEngine.ts` y `unifiedTextHierarchyEngine.ts`; traslado de `syncPresetsFromStorage()` hacia `presetStorageService.ts` y actualización en `usePaymentReturnAndUpdates.ts`.
  - Integración de `cover-letter` dentro de `src/modules/cv-builder/` (`components/cover-letter/*` y `pdf/CoverLetterPdfDocument.tsx`), eliminando `src/modules/cover-letter/`.
  - Creado `pdfCategoryRegistry.ts` e invertido `pdfExporter.ts` para despachar exportadores PDF por categoría sin importar módulos de producto.
  - Promovidos `impositionMath.ts`, `impositionPlanner.ts` y `canvasColors.ts` a `src/shared/kits/print-imposition/`; traslado de `pdfSourceClassifier.ts` a `src/shared/core/pdf-engine/`.
  - Encapsulados los motores y PDFs de `book-studio`, `facturador-studio`, `editor-lee-studio` y `planner-studio` bajo `src/modules/<app>/{domain,pdf}`, eliminando `book-engine/`, `facturador-engine/` y `editorial-engine/`. Exención consistente de `src/modules/<app>/pdf/` en `audit-ui-tokens.js`, `check-contrast.js` y `check-module-boundaries.js`.
  - Baseline AST de `scripts/import-graph-baseline.json` bajado a **0 violaciones de frontera** y **0 ciclos runtime** (`[] / []`) sobre `477` archivos.
- **Fase 9 — `src/modules/card-studio/` independiente + Puerto `contact-profile@1`**:
  - Creada la cápsula `src/modules/card-studio/` (`CardStudioContent.tsx`, `cardStepSequence.ts`, `domain/cardContactImport.ts`, `ui/*`) con selector granular de campos vía `portBroker.ts` (`PORT_CONTACT_PROFILE_V1`) y detección de cambios de revisión (`checkPortSourceOutdated`) manteniendo ediciones manuales.
  - Montada `business_card` como estudio lazy independiente en `appRegistry.ts` y `appSurfaceManifest.ts`, eliminando ramas `docType === 'business_card'` de `EditorPanel.tsx` y `DisenoSection.tsx` (`check-docType-leaks`: `71 → 54`, `DisenoSection.tsx` y `CardExtractSection.tsx` en `0`). Tests: `tests/cardStudioPhase9.test.ts` (3/3).
- **Fase 10 — Fábrica de Apps, Verificador de Contrato y Documentación Final**:
  - Creado generador `scripts/new-app.ts` (`npm run new-app` y `npm run new-app:selftest`) con guardias contra tipos purgados y contra `full-summary` en bóvedas `local-encrypted`.
  - Creado `scripts/verify-app-contract.ts` (`verify:app-contract`) e integrado a `npm run check-all` junto a `new-app:selftest`, más `tests/appFactoryPhase10.test.ts` (3/3).
  - Actualizados `docs/APP_BLUEPRINT.md`, `docs/ARQUITECTURA_PLATAFORMA.md`, `AGENTS.md` y `src/shared/core/version.ts`.
- **Validación Local Completa (`npm run check-all`)**: `99 passed | 2 skipped (101)` archivos (`849 passed | 2 skipped`), `0` fronteras/ciclos AST, `0` jerga, `0` tokens UI, `0` violaciones nuevas de contraste, bundle inicial sin librerías pesadas (`entry` `24.2 KB`, `lazy-app` `58.0 KB`) y `83` rutas SEO prerenderizadas.

---

## [2026-11-21] - Fase 5B + Fase 6: StudioHost unificado, Composition Root y Bundle Budget (V2.28.0)

**Resumen:**
- **Fase 5B — Liberación del Shell hacia `src/shared/core/studio-host/` (0 cruces del shell, `D18 = 0`)**:
  - Migrados al tronco sin shims de compatibilidad: `StudioNavbar.tsx` (desacoplado de `useCVContext`, recibe `undo/redo/canUndo/canRedo` por props y elimina **5 → 0** fugas `docType`), `PdfCheckoutModal.tsx`, `FloatingAssistant.tsx`, `AssistantNotificationToast.tsx`, `paymentService.ts` (`shared/core/payments/`), `PhotoCropperModal.tsx` y `SignatureModal.tsx` (`shared/core/ui/`).
  - Creado `src/shared/core/studio-host/stepSequenceRegistry.ts` y `src/modules/cv-builder/cvDockProvider.ts`; reemplazado `CanvaIconDock.tsx` (1011 L, 34 fugas) por `StudioDock.tsx` (297 L, **0 fugas**, 0 colores hex sueltos), actualizados todos los estudios y eliminado `CanvaIconDock.tsx`.
  - Montado `<FloatingAssistant docType="planner" />` en `PlannerStudioContent.tsx` (cerrando la cobertura 7/7 de Lidio en vivo).
  - Desacoplado `assistantTips.ts` de `bookStepSequence` y `facturadorStepSequence` mediante `stepSequenceRegistry` (`D18`: **2 → 0** `[trunk-to-engine]`).
  - Eliminado `switch` de `docType` en `DocumentTabsBar.tsx` (**6 → 0**) usando `getDocumentTypeConfig().iconName`, y `NewDocumentMenu.tsx` migrado a render dinámico sobre `ALL_DOCUMENT_TYPE_IDS` con `onSelectDocument`.
  - Actualizados `scripts/ui-tokens-allowlist.json` y los 5 scripts de verificación heredados a las rutas canónicas de `studio-host`.
- **Fase 6 — Composition Root (`appRegistry.ts`), `<StudioRoute>`, `App.tsx < 350 L` y Bundle Budget**:
  - Creado `src/app/appRegistry.ts` (`APP_REGISTRY as const satisfies Record<RegisteredDocumentTypeId, AppRuntimeEntry>` + registro de proveedores del Dock para las 7 apps) y `src/app/StudioRoute.tsx` (enrutado standalone único con modales unificados).
  - Extraídos `useDocumentCreation.ts` (`handleNewDocument(docType)` único guiado por registro), `usePaymentReturnAndUpdates.ts`, `useAppNavigationAndTabs.ts`, `useWorkspaceModalsAndExport.ts` y `CvWorkspaceContent.tsx` (lazy), reduciendo `src/app/App.tsx` de **1291 → 267 líneas** y eliminando todas sus fugas (`30 → 0`).
  - Bundle Budget inicial: extraído `src/shared/core/pdf-engine/layers/typography/fontSanitizer.ts` (puro, sin `@react-pdf/renderer`) y migrado `vite.config.js` a `rolldownOptions.output.codeSplitting` con `includeDependenciesRecursively: false` en `vendor-react-pdf`, eliminando **1227.1 KB** (`vendor-react-pdf`) de la precarga inicial de `/` y bajando el chunk entry `index-*.js` de **201.4 KB → 24.0 KB**.
  - Agregados `scripts/verify-app-mounted.ts` (`verify:app-mounted`) y `scripts/check-bundle-budget.ts` (`check-bundle-budget`) al pipeline `npm run check-all`.
  - Bajados estrictamente los baselines AST: `import-graph` (**31 → 10** fronteras; 0 cruces de shell y D18=0; sobre 473 archivos) y `docType-leaks` (**146 → 71** total en 11 archivos; `app` 34→0). Tests: `tests/studioHostAndAppRegistryPhase5B6.test.ts` (6/6).

---

## [2026-11-21] - Fases 0, 1, 2, 3, 4, 5A y 7 + Suite de Conformidad sobre V2.28.0 (feat/editorlee-facturlee-web-integration-v228)

**Resumen:**
- **Fase 0 — Red de seguridad arquitectónica por AST**:
  - `scripts/check-import-graph.ts`: Compiler API de TypeScript + detección de ciclos runtime (Tarjan SCC) + aislamiento de bóveda (`vault-network-isolation`) + `--selftest` (6/6) + `scripts/import-graph-baseline.json` (bajó **35 → 31** violaciones de frontera, 2 ciclos, sobre 463 archivos).
  - `scripts/check-docType-leaks.ts`: detector AST de fugas `docType` + `--selftest` (6/6) + `scripts/docType-leaks-baseline.json` (bajó **199 → 146** total; `shared/` bajó **61 → 11**, -82%).
- **Fase 1 — Cierre de EditorLee (`D2`)**:
  - `sanitizeEditorialData()` idempotente conectado en `loadDocumentById()`, prefijos de título/borrador (`DOC_TITLE_PREFIX.editorial`, `draft_editorial`, `draft_invoice`), aislamiento local sin contaminar CV/Supabase, corrección del autoguardado al montar + botón "Abrir", y `tests/editorLeePhase1.test.ts` (4/4).
- **Fase 2 — Contratos puros + Registro v2 + Purga `portfolio`/`certificate` (`D9`, `D10`)**:
  - Creada capa pura `src/shared/contracts/` (0 dependencias externas: `appContract`, `persistenceContract`, `assistantContract`, `sessionContract`, `ports/contactProfile`).
  - `DOCUMENT_TYPE_REGISTRY` migrado a `as const satisfies Record<string, DocumentTypeManifest>`, derivando `DocumentTypeId` desde el registro. Eliminados por completo `portfolio` y `certificate` de `capabilityRegistry.ts`, `syncEngine.ts`, `AdminOverviewTab.tsx` y `api/_lib/serverDal.ts`.
  - Eliminados todos los `if`/`switch` de `capabilityRegistry.ts` (**27 → 0**) y `documentHelpers.ts` (**6 → 0**).
  - Añadidos `scripts/check-forbidden-doctypes.ts` (+ `--selftest`) y `scripts/verify-registry-coverage.ts` al pipeline `check-all`, más `tests/registryContractsPhase2.test.ts` (4/4).
- **Fase 3 — Local-First Core (`D7`, `D8`)**:
  - Creados `documentEnvelope.ts` (sobres versionados + migración/sanitización por `docType`), `localAssetStore.ts` (externalización `asset://<hash>` de imágenes/PDFs base64 en IndexedDB), `localDocumentStore.ts`, `encryptedVaultDriver.ts` (sin dependencias de red) y `legacyCloudImporter.ts` (importación única de filas históricas `cvs` clasificadas por su `docType` real).
  - `documentStorageService.ts` y `syncEngine.ts` conectados a Local-First (listas aisladas por tipo, sin subidas automáticas de `cv_data` completo, sin `migrateCvData` sobre `book`/`planner`/`invoice`/`editorial`), verificado en `tests/localFirstCorePhase3.test.ts` (4/4).
- **Fase 4 — Respaldo en nube opt-in de texto estructurado**:
  - Migración SQL aditiva e idempotente `supabase/migrations/20261121_local_first_cloud_backups.sql` (`user_preferences` + `document_backups` con RLS, CHECK `doc_type in ('cv','business_card','cover_letter')` y CHECK `pg_column_size(projection) <= 65536`). **Pendiente de Kalpa:** aplicar en producción antes de habilitar el interruptor de respaldo en nube.
  - Creados `cloudBackupProjections.ts` (proyecciones por lista blanca sin diseño ni binarios + guardas genéricas) y `cloudBackupReplicator.ts` (opt-in apagado por defecto, concurrencia optimista por `revision`, restauración local sin pisar copias más nuevas), verificados en `tests/cloudBackupPhase4.test.ts` (4/4).
- **Fase 5A — D14 cerrado (0 `shared-boundary`) + Fundamentos `StudioHost`, `DocumentSession` y `PortBroker`**:
  - `UndoRedoControls.tsx` y `workspaceController.ts` desacoplados de `CVContext` e `initialCVData` (D14 = 0); corregidos 2 imports cruzados de servicios (`StorageDriveTab`, `CoverLetterEditorPanel`).
  - Creados `DocumentSessionContext.tsx` (`useDocumentSession<T>`), `StudioHost.tsx` (inversión de control del shell) y `portBroker.ts` (`contact-profile@1` para que `card-studio` importe campos elegidos desde un CV guardado y detecte cambios de revisión), verificados en `tests/studioHostAndPortsPhase5A.test.ts` (3/3).
- **Fase 7 — Lidio modular 7/7 + FacturLee `metadata-only` con completitud (`D6`, `D12`)**:
  - Descompuesto el prompt monolítico de `api/_lib/aiTasks/catalog.ts` en `api/_lib/aiTasks/appKnowledge/{platform,cv,cover_letter,business_card,book,planner,invoice,editorial,index}.ts` con inyección selectiva por `docType` y sanitizador estricto en servidor (`sanitizeMetadataOnlyEditorState`).
  - Creado `src/shared/core/facturador-engine/facturadorCompleteness.ts` (catálogo estático de campos obligatorios, validador CUIT Módulo 11 y `buildFacturadorMetadataOnlyContext`) conectado en vivo en `FacturadorStudioContent.tsx` -> `FloatingAssistant.tsx`.
  - `assistantTips.ts` (7/7 apps, fugas `16 → 0`) y `FloatingAssistant.tsx` (7/7 apps, fugas `2 → 0`). Test canario de cero fuga de valores en `tests/lidioPrivacyCompletenessPhase7.test.ts` (5/5).
- **Suite de Conformidad (adelanto Fase 10)**:
  - `tests/contracts/appConformance.test.ts` (`describe.each(ALL_DOCUMENT_TYPE_IDS)`, 29 tests automáticos heredados por toda app nueva).

---

## [2026-11-20] - EditorLee 100% Nativo, Integración Web Pública y Pilar 8 Regla 10 (feat/editorlee-facturlee-web-integration-v228, V2.28.0)

**Resumen:**
- **Bloque 1 — Conectar y completar EditorLee al 100% (Regla 10 completa)**:
  - Enrutado e iconos: agregado icono `editor` a `iconCatalog.ts` e `iconRegistry.ts` (71 iconos únicos, 0 colisiones en `check-icon-uniqueness`).
  - Menú y pestañas: integrados `onSelectEditorial` y `onNewEditorial` en `NewDocumentMenu.tsx`, `DocumentTabsBar.tsx`, `App.tsx` y `FacturadorStudioContent.tsx`.
  - Backend parseo/export Word: instalado `mammoth` y creado endpoint `api/editorial-doc-api.ts` con acciones `parse-docx` y `export-docx` bajo rate limiting; conectados rewrites en `vercel.json` y llamadas via `apiFetch()` + `withErrorHandling()` en `EditorialImportAiPanel.tsx`.
  - Paneles reales: implementados `PortadaEditorialStep`, `SeccionesEditorialStep` (con `EDITORIAL_SECTION_CATALOG` y `Field`), `DiseñoEditorialStep` (con `PAGE_SIZES` y `Field`), `TocEditorialStep` (con `generateSectionAnchors`), `MetadatosEditorialStep`, y montaje de `EditorialImportAiPanel`.
  - Persistencia y Navbar: conectados `saveDocumentDraftLocal`, `loadDocumentById`, `sanitizeEditorialData`, `onSaveCVClick`, descarga de respaldo `.leecv-editor` y `getSavedEditorialsList`.
  - Eliminación de bypass: el botón "Exportar PDF" valida obligatoriamente `consumeCreditIfNeeded()` y abre `PdfCheckoutModal`.
- **Bloque 2 — Exponer EditorLee y FacturLee en Web Pública y SEO**:
  - Textos públicos (`landing.ts`): actualizados títulos a "Siete herramientas", añadidos `nav.editorlee`, `nav.facturas`, `heroCarousel.facturas`, `heroCarousel.editorlee`, `products.editorlee`, `faq.q5/a5` y `faq.q6/a6` con 0 palabras de jerga técnica (`check-plain-language`).
  - Assets marketing: creados assets webp para previews de factura y editor en `public/marketing/`.
  - Componentes Landing: ampliado `HeroCarousel.tsx` (5 slides, iconos dedicados y corrección de tokens cromáticos), 7.ª tarjeta en `PortalProductsGrid.tsx`, enlaces y bloques zigzag de detalle en `LandingPage.tsx`.
  - SEO y Prerender: añadidas rutas `/crear-agenda`, `/crear-carta`, `/crear-factura` y `/crear-editor` en `scripts/prerenderMeta.mjs` y `public/sitemap.xml` (84 rutas estáticas prerenderizadas).
- **Bloque 3 — Regla + Script automático (Pilar 8 Regla 10)**:
  - Manifiesto canónico de superficie: creado `src/shared/core/capabilities/appSurfaceManifest.ts` (`APP_SURFACE_MANIFEST`) declarando especificaciones completas para los 7 tipos de documento.
  - Script bloqueante: creado `scripts/verify-app-completeness.ts` conectado a `npm run verify:app-completeness` y enlazado en `npm run check-all` (112 verificaciones automáticas de integridad).
  - Documentación: actualizado `AGENTS.md` (Pilar 8 de Regla 10 y fila en Regla 1) y `docs/APP_BLUEPRINT.md` (Paso 9 y checklist pre-merge).
- **Versionado**: Bump a `V2.28.0` en `src/shared/core/version.ts`.
- **Validación Local (Regla 0)**: `npm run check-all` superado con 0 errores.

---

## [2026-11-20] - EditorLee: Editor de Libros e Informes 100% Nativo (PR #147, feat/editorlee-nativo, V2.27.0)

**Resumen:**
- Implementación de **EditorLee** (`/crear-editor`) como aplicación 100% nativa de LEECV, cumpliendo los 7 pilares canónicos de `AGENTS.md` (Regla 10) y `docs/APP_BLUEPRINT.md`:
  1. **Capacidades y Registro Central**: `DocumentTypeId = 'editorial'` registrado en `DOCUMENT_TYPE_REGISTRY`, `CAPABILITY_REGISTRY`, mapa de rutas (`/crear-editor`), títulos e inferencia determinista.
  2. **Formularios y UI Canónica**: Integración total en `<CanvaIconDock />` (7 pasos de navegación: inicio → portada → secciones → diseño → TOC → metadatos → IA) en desktop y mobile con íconos canónicos de `iconCatalog`.
  3. **Motor PDF Universal y Visor Centralizado**: Previsualización y exportación continua usando `@react-pdf/renderer` + `VectorDocViewer` (zoom, pan, centrado y doble página idéntico a CV y FacturLee).
  4. **Gating de Créditos y Pasarela Unificada**: Exportación protegida mediante `useExportEntitlement()` y `PdfCheckoutModal` (1 crédito por exportación de PDF de libro/informe).
  5. **Alta, Login y Reclamo Idempotente**: Respaldo local y soporte para migración de tokens vía `claimCreditsOnAuth`.
  6. **Trazabilidad y Observabilidad**: Envuelto con `withErrorHandling()` en todas las operaciones asíncronas de exportación y guardado.
  7. **Motor de IA Unificado y Entrenamiento de Lidio**: Registradas las tareas `editorial_structure`, `editorial_rewrite`, `editorial_refine` en `api/_lib/aiTasks/catalog.ts` y entrenado Lidio en `app_guide_assistant` con el bloque de conocimiento detallado de EditorLee.
- **Resolución de Errores y Calidad (Regla 0)**:
  - Corregidos errores tipográficos, JSX y de TypeScript en `EditorialPdfDocument.tsx`, `EditorialBlockPrimitives.tsx`, `sanitizeEditorialData.ts`, `editorialMath.ts`, `editorialPresetCatalog.ts`, `EditorLeeStudioContent.tsx` y `FloatingAssistant.tsx`.
  - Reemplazado término técnico en `editorialMath.ts` para cumplir auditoría de lenguaje sencillo (`check-plain-language`).
  - `npm run check-all` superado con 0 errores (tests vitest, plain-language, tokens, contraste WCAG 2.1 AA, unicidad de íconos, build y 80 páginas SEO prerenderizadas).
- **Versionado**: `src/shared/core/version.ts` actualizado a `V2.27.0` (MINOR bump).

**Merge (Regla 6 paso 7 - confirmación de hash):**
- PR: #147 (`feat/editorlee-nativo`) mergeada a `main` (squash).
- Hash confirmado en `origin/main`: `2246c3a3a788a7ea2b166dc6ad16cd3811c972b5`.
- CI GitHub Actions: `check-all` en 1m13s (0 errores), Vercel Preview (pass).
- Verificado local: `git pull origin main` sincronizado, working tree clean.

---

## [2026-11-14] - OCR: Mapeo Completo IA->PDF sin Perdida de Datos (PR #91, feat/ocr-full-pdf-mapping)

**Resumen:**
- Cierra los 6 cortes de contrato diagnosticados por Kalpa en el flujo Importar CV con IA -> PDF:
  1. Header del PDF con solo `fullName`: `TemplateRenderer` cae a `resolveDisplayName` (ya existia) y `resolveInitials` resuelve las iniciales en los 6 placeholders de foto (antes "CV" generico).
  2. `IMPORTABLE_SCALAR_FIELDS` ampliado: `titlePrefix`, `dni`, `cuit`, `birthDate`, `nacionalidad`, `estadoCivil`, `disponibilidad`, `licenciaConducir`, `frase` ya no se descartan.
  3. Aliases sin traductor resueltos en `normalizeImportedCvData`: `location->cityProvince`, `role->quote`, `linkedin/portfolio->redes+website` (API devuelve `linkedin` minuscula), `summary/objective/frase` raiz o dentro de `personalInfo` -> raiz.
  4. `proficiency` de idiomas perdido: `cvDataAdapter.ts` lee `proficiency -> nivel`; normalizacion deriva `nivelDominio/nivel` dentro del loop de listas (no antes, donde `normalized.languages` no existia).
  5. `extract-page` ampliado: schema + prompt piden `givenNames`/`surname` y las 9 secciones faltantes (`objective`, `frase`, `redes`, `hardSkills`, `informatics`, `profession`, `references`, `portfolio`); `consolidate-ats` alineado.
  6. `mergePageFragments` fusiona `summary`/`objective`/`frase`; al confirmar la importacion se activan `contacto` y `datos-personales` (id canonico; `personales` es solo la pestaña del editor); `initialCVData.ts` alineado a `datos-personales`.
- Bonus UX: boton "Usar todo lo detectado" en `ImportReviewDiffModal` (scalars=replace, listas=add o replace sobre duplicado detectado).
- Nuevo contrato de tests `tests/importToPdfPipeline.test.ts` (11 tests end-to-end OCR->PDF). Durante el test se encontraron y arreglaron 5 bugs propios: `linkedIn` vs `linkedin`, copia de summary/objective/frase solo desde personalInfo, derivacion de nivel de idiomas no-op, loop IMPORTABLE_LIST_FIELDS pisando `redes` ya enriquecidas (bloque movido despues del loop) y crash si el raw no trae `personalInfo` (inicializado siempre a `{}`).
- Versiones: Fase 1 commit `b0c1eaf`; Fases 2+3 commit `da7431d`.

**Decision tomada:** un solo PR para las 3 fases (aprobado por Kalpa, Regla 7). `'personales'` es id de pestaña del editor, no seccion renderizable; el id canonico es `'datos-personales'`. Las políticas de formato (`us-resume` oculta dni/birthDate/estadoCivil/etc.) siguen vigentes al render: activar secciones no rompe políticas porque el adapter filtra campos con `resolvePersonalFieldVisibility`.

**Merge (Regla 6 paso 7 - confirmacion de hash):**
- PR: #91 (`feat/ocr-full-pdf-mapping`) mergeada a `main` (squash) por orden explicita de Kalpa.
- Hash confirmado en `origin/main`: `14aab1b3af06ba856e2ea555f4f2b7ffa3577172`.
- CI GitHub Actions: check-all en 1m4s (0 errores). Vercel: deployment completed (preview pass).
- Local antes del push: `npx tsc --noEmit` exit 0; vitest 363 passed / 2 skipped; `npm run check-all` exit 0 (SEO 40/40).

## [2026-11-16] - Book Studio / Lidio: Fase 1+2 — Apertura y Origen PDF (PR #118, fix/book-studio-lidio-integration)

**Resumen:**
- `inferDocumentTypeId` reconoce presets `libro-*`/`book` → docType `"book"` (`capabilityRegistry.ts`); guarda anti-bucle `lastCreatedTabIdRef` en `App.tsx` para `/crear-libro`.
- Origen PDF híbrido: `canUseNativeFilePicker()` (iframe cross-origin → false) + `pickSourcePdf()` tipado (`picked | cancelled | fallback-required`) en `bookAssetManager.ts`; `BookSourceTypeStep.tsx` con `triggerPick` único (nativo → input de respaldo siempre montado).
- Instancia ÚNICA de pdf.js en `BookStudioContent.tsx` (`loadSourcePdf`): arrayBuffer 1 vez, auto-rotación fotocopia, `pdfDoc` compartido con preview, conteo real persistido. Eliminado `handleFileSelect`.
- `PdfPreviewStrip.tsx`: error de apertura visible + "Probar con otro PDF"; miniaturas por `assetId` (getThumbUrl).
- cMaps locales: `impositionEngine.ts` usa `/cmaps/` → CDN → sin cMaps; `scripts/copy-pdfjs-cmaps.mjs` + `prebuild` copian `node_modules/pdfjs-dist/cmaps` a `public/cmaps/` (gitignored).
- Tests nuevos: `inferDocumentTypeId('libro-standard') === 'book'` (+ inferencias existentes) y `pickSourcePdf` fallback en Node.

**Estado:** PR #118 abierta (commit `a87e9e1`); pendiente CI verde + aprobación CODEOWNER (toca `src/shared/core/`). NO mergeada.

**Validación local:** `npm run check-all` EXIT=0 (tests, typecheck, lint, gobernanza, build, SEO 40/40, plain-language OK, contraste 0 nuevas). Pre-commit/pre-push husky verdes. Artefactos (`tsconfig.tsbuildinfo`, `install-windows.ps1`) excluidos.

**Siguiente paso:** Kalpa aprueba #118 → merge squash (sin `--delete-branch`) → verificar hash en `origin/main` → Fase 3 (paridad tapa/contratapa: retiro en blanco sin contratapa en `impositionEngine.ts:~1104`, `calculateFinalBookPageCount`, botón "sin tapa" en UI) en PR aparte.

# Registro de Intervenciones de Agentes (SESSION_LOG)

## [2026-11-13] - Iconos Unicos Canonicos + Blindaje de Contraste (PR #89, feat/unique-icons-contrast)

**Resumen:**
- **Nucleo (Fase 1):** `src/shared/core/ui/iconCatalog.ts` (nuevo) — catálogo central con `SECTION_ICON_IDS` (26 canónicas + `personalizada-1..5` + `card_*` + `social-*`), `PRODUCT_ICON_IDS`, `UI_ICON_IDS` y `resolveSectionIconId(sectionId, cvData)` puro (precedencia: `sectionIconOverrides[slot]` > `customSections[].iconId` > slot determinista > mapeo canónico > `fallback`; normaliza sufijo `-cont` de banners de contenedor).
- `src/shared/core/pdf-engine/layers/icons/iconRegistry.ts`: 58 trazados SVG únicos, cero duplicados (eliminadas colisiones históricas: personales/card_front, cursos/card_back, competencias/objetivo, resumen/experiencia, profesion/portafolio, premios/logros, publicaciones/cursos).
- Motor PDF respeta overrides/iconId: `cvDataAdapter.ts`, `recordTypes.ts`, `TemplateRenderer.tsx`; `activeSectionsDockEngine.ts` lee el resolver central.
- **UI (Fase 2):** `CanvaIconDock.tsx` (desktop+móvil), `WizardModal.tsx`, `Navbar.tsx`, `NewDocumentMenu.tsx` consumen el catálogo; swaps en Portada/Diseno/NuevaSeccion/CardBack/CardSize/LandingPage/RecordFormSection (emoji fuera).
- `NuevaSeccionSection.tsx` persiste `sectionIconOverrides` por slot: ícono determinista para `personalizada-N` sin preset.
- **Contraste (Fase 3):** 25 usos de `--color-primary-*` fantasma corregidos a `--color-accent-*` reales en 10 archivos; 0 referencias restantes en `src/`.
- **Gobernanza (Fase 4):** `scripts/check-icon-uniqueness.js` (Check A trazados duplicados, Check B cobertura canónica + card_* + social-*, Check C colisiones intra-mapa y entre familias) enganchado a `npm run check-all` y `.husky/pre-commit`; `tests/iconUniqueness.test.ts` (10 invariantes); fila nueva en AGENTS.md Regla 1.

**Decisión tomada:** un solo PR para las 4 fases (aprobado por Kalpa, Regla 7). Misma entidad/acción = mismo ícono; entidades distintas = ícono distinto (cero colisiones).

**Merge (Regla 6 paso 7 - confirmación de hash):**
- PR: #89 (`feat/unique-icons-contrast`) mergeada a `main` (squash).
- Hash confirmado en `origin/main`: `8bee26eada9481073f008f7f1ad365aeeedaa5fd`.
- CI GitHub Actions: check-all en 59s (0 errores).
- Vercel Deployment: Deployment has completed.

---
## [2026-11-12] - V2.8.4: Reclasificación Dinámica a 20+ Secciones, Borrador Persistente Anti-Pérdidas y Extracción Completa sin Podas

**Resumen:**
- `src/modules/cv-builder/components/modals/ImportReviewDiffModal.tsx`:
  - Selector de sección por cada registro con dropdown con las 14 categorías canónicas (`SECTION_OPTIONS`).
  - Reclasificación instantánea con adaptación dinámica de campos en vivo (`reclassifyRecord`).
  - Activación automática de cada sección con registros asignados al aplicar (`activateSection`).
- `src/modules/cv-builder/utils/cvImportReview.ts`:
  - `SECTION_OPTIONS` y función `reclassifyRecord(fromField, toField, item)` que convierte atributos (cargo/empresa <-> curso/institución/año <-> proyecto, etc.).
- `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`:
  - Reinicio automático a `idle` en cada apertura/cierre (`isOpen`).
  - Resguardo automático del borrador extraído en `localStorage` (`leecv_last_imported_draft`).
- `src/modules/cv-builder/components/editor/sections/ImportDataSection.tsx`:
  - Banner de rescate ante cierres accidentales: *"Extracción reciente guardada... [Revisar y clasificar] [Descartar]"*.
  - Limpieza de borrador tras confirmación o descarte.
- `api/cv-import-api.ts`:
  - Ampliado el esquema de extracción y prompt para capturar `coursesAndCertificates`, `projects`, `publications`, `achievements`.
  - Orden estricta a la IA: prohibido recortar a un "top 3"; conservar el 100% de los registros de todas las páginas.
- `src/shared/core/cv-import/mergeFragments.ts` y `mergePageFragments.ts`:
  - Cobertura completa de todas las listas en la fusión de páginas.
- `tests/cvImportReview.test.ts` y `tests/mergeFragments.test.ts`:
  - Pruebas unitarias de reclasificación y fusión multilínea (17/17 pasaron).
- `src/shared/core/version.ts`:
  - Bump a V2.8.4.

**Merge (Regla 6 paso 7 — confirmación de hash):**
- PR: #78 (`feat/ocr-reclassify-and-draft-v284`) mergeada a `main`.
- Hash confirmado en `origin/main`: `bbee47e68aa2676711a9f8bd80abfdcc90184b23`.
- CI GitHub Actions: ✅ `check-all` en 1m7s (0 errores).
- Vercel Deployment: ✅ `Deployment has completed`.

---

## [2026-11-11] - V2.8.3: Resiliencia Total de OCR — canvas 1400px, reintentos con backoff, tolerancia a fallos y fallback Gemini 2.0

**Resumen:**
- `src/modules/cv-builder/components/modals/ImportCvAiModal.tsx`:
  - Canvas optimizado: escala adaptativa con límite de altura a 1400px.
  - Progreso transparente en tiempo real ("Leyendo página X de Y...").
  - Reintentos con backoff y tolerancia a fallos parciales.
- `src/shared/core/cv-import/pageImageEncoder.ts`:
  - Calidad JPEG optimizada `[0.75, 0.62, 0.48, 0.35]`, imágenes livianas (~300KB) que Gemini procesa en 3-5 segundos.
- `api/_lib/aiProviders/gemini.ts`:
  - Timeout 28s y fallback automático a `gemini-2.0-flash` si Gemini 3.8 está saturado (503).
- `api/cv-import-api.ts`:
  - Consolidación ATS resiliente con Groq y fallback a Gemini.

**Merge (Regla 6 paso 7 — confirmación de hash):**
- PR: #77 (`feat/ocr-resilience-fast-pipeline`) mergeada a `main`.
- Hash confirmado en `origin/main`: `ae92192e1998997ad28ece22b497f8b8edc3284d`.
- CI GitHub Actions: ✅ `check-all` en 51s (0 errores).
- Vercel Deployment: ✅ `Deployment has completed`.

---

## [2026-11-09] - V2.5.2 (feat/ocr-fase1-v252): Fase 1 OCR Estabilizado — jobs async, polling, límite 10 páginas

**Resumen:**
- `api/cv-import-api.ts`: nueva ruta `job-status`, límite 10 páginas por job, creación/actualización de jobs en tabla `ocr_jobs`, errores (`ai_not_configured`, `ai_rate_limited`, `ai_provider_error`) marcan job como `failed`.
- `api/_lib/serverDal.ts`: sección `ocrJobs` con 4 métodos (create, getById, update, listByUser) usando `supabaseAdmin`.
- `src/shared/core/storage/dataAccessLayer.ts`: sección `ocrJobs` cliente con los mismos 4 métodos.
- `ImportCvAiModal.tsx`: modo async con polling cada 3s, timeout 5 min, fallback sync, estados visuales "Procesando..." / done / error.

**Flujo implementado:** PDF subido → job `processing` en Supabase → frontend polling 3s → `completed` muestra CV / `failed` muestra error traducido. PDF >10 páginas → mensaje inmediato + sólo primeras 10.

**Estado:** ✅ MERGEADA — PR #68 mergeada a `main`. Hash confirmado: `356a682a3f31d37c97a51ff0e27aa159aaa3d32d`. CI ✅ / Vercel ✅.

**Versión:** V2.5.1 → V2.5.2

---

## [2026-11-09/10] - V2.6.0 (feat/ats-cro-fase2-auditor-pseo): Auditor ATS en vivo + pSEO 52 profesiones

**Resumen:**
- **Eje 1 – Auditor ATS en vivo:** `useAtsLiveScore`, `AtsLiveAuditorPanel`, score pill en `Navbar`, wiring en `App.tsx`/`AppModals.tsx`.
- **Eje 2 – pSEO masivo:** `jobTemplatesCatalog.ts`, `jobTemplatesData.json` (52 profesiones, 7 categorías), `prerenderMeta.mjs`, `JobRoleLandingPage.tsx` (hero AA-safe), sitemap actualizado (83 URLs).
- **Eje 3 – Gobernanza:** bump de versión a `V2.6.0`, `tests/jobTemplatesCatalog.test.ts`, `tests/atsLiveAuditor.test.ts`, `check-all` 0 errores.

**Estado:** PR #69 abierta https://github.com/kalpa-droid/LEECV/pull/69 — CI ✅ SUCCESS (1m21s) / Vercel ✅ — `mergeStateStatus: CLEAN` — pendiente aprobación CODEOWNER (toca `src/shared/core/`).

**Versión:** V2.5.2 → V2.6.0

## [2026-11-01] - V2.5.0 (feat/hotfix-login-validaciones-v250): Hotfix validaciones + mejoras landing + artículos blog

**Resumen (Fase A + Fase B + landing/blog):**
- Fase A (hotfix): corregida regex email (`[^\s@]`) que bloqueaba correos con 's'; corregido patrón código (`^[0-9]{6}$`); `requestOtp` con `shouldCreateUser`.
- Fase B (pestañas): modo `login` (`shouldCreateUser: false`) / `register` (`true`); sin alta silenciosa.
- Landing: 3 FeatureCards (`coverLetter`, `professionalDesign`, `transparency`); Portal con `Cartas`; i18n actualizado.
- Blog: artículos existentes cubren todos los dolores (`MANUAL_DOLORES_Y_BENEFICIOS.md`).

**3 decisiones confirmadas:** 2 pestañas ✅ / no alta silenciosa ✅ / conservar CV local ✅

**Estado:** rama `feat/hotfix-login-validaciones-v250` (`ade7449`); `check-all` 0 errores; build OK; 284 tests passed.

## [2026-11-01 22:54] - Merge registrado: Fase D (`23c6702`) + Fase A/B (`ade7449`) sobre base `71c4f91`

**Merge (Regla 6 paso 7 — confirmación de hash):**
- `main` confirmado: `71c4f91` (`Feat/estrategia ats cro (#64)`)
- Ramas lista para PR: `feat/hotfix-login-validaciones-v250` (`ade7449`) + `feat/panel-cuenta-creditos-fase-d` (`23c6702`)
- No push directo a `main` (GitHub Ruleset `GH013` activo desde 2026-09-06).
- `.opencode/CONTEXT.md`: creado con registro de traspaso completo (agente, archivos, decisiones, próxima acción: Fase C/E/F).
- CV local conservado en logout confirmado: `authService.ts:109-128` solo limpia claves `sb-`/`auth-token`; IndexedDB y datos de editor no se tocan.

Este archivo documenta los cambios realizados en el repositorio por agentes de IA, para mantener un rastro histórico de qué se hizo, por qué y en qué momento.

## [2026-10-31] - V2.3.3: Motor Canónico de Acreditación y Consumo de Créditos Unificado

**Resumen:**
Se eliminaron discrepancias entre el motor de visualización de créditos y el motor de consumo. `getTokenStats` en el DAL ahora consulta de forma unificada por `user_id` y `email`, `useEntitlements` sincroniza en tiempo real tanto los derechos como el balance visual ante consumos y recargas, y se conectó la auto-acreditación (`claimCreditsOnAuth`) inmediatamente al retornar de pasarelas de pago en `App.tsx`.

**Acciones Tomadas:**
- **Núcleo de Datos (`src/shared/core/storage/dataAccessLayer.ts`)**:
  - `getTokenStats` adaptado para aceptar identificador compuesto (`{ userId?: string, email?: string }`) y realizar consulta combinada con `.or(user_id.eq,email.eq)`. Resuelve cualquier desfasaje por tokens acreditados a nivel UUID vs email.
- **Motor de Derechos (`src/shared/core/entitlements/useEntitlements.ts`)**:
  - `fetchStats` refactorizado con `useCallback` para consultar tokens por identidad canónica.
  - `consumeExport` actualiza el balance de tokens localmente de inmediato tras cada exportación exitosa.
  - `refreshEntitlements` ejecuta concurrentemente la actualización de derechos (`useExportEntitlement`) y el balance de tokens (`fetchStats`).
- **Retorno de Pagos (`src/app/App.tsx`)**:
  - `procesarRetornoPago` ahora invoca `claimCreditsOnAuth(user)` y `refreshEntitlements()` tras capturas de PayPal o confirmaciones de Mercado Pago, asegurando que los créditos aparezcan sin necesidad de refrescar el navegador.
- **Gobernanza y Calidad**:
  - Versión actualizada a `V2.3.3` en `src/shared/core/version.ts`.

## [2026-10-31] - V2.3.2: Botón de Iniciar Sesión en Landing Page, Login OTP/Contraseña Robusto y Extracción de PDF con IA sin Bloqueos

**Resumen:**
Se incorporó el botón de "Iniciar sesión" en la cabecera y el hero de la Landing Page, se resolvió la persistencia de sesión al registrarse o iniciar sesión (sincronización síncrona en React y soporte a código OTP de 6 dígitos que entrega sesión activa sin trabas de confirmación de email), y se eliminó la restricción que bloqueaba la extracción de PDF con IA para usuarios invitados.

**Acciones Tomadas:**
- **Landing Page (`src/modules/landing/LandingPage.tsx`)**:
  - Incorporado botón visible de "Iniciar sesión" en la barra de navegación superior (junto al selector de temas) y en la sección Hero como botón secundario. Si el usuario ya está autenticado, muestra una píldora con su nombre/correo y acceso a "Mi Cuenta".
  - Enrutamiento y modal conectados en `src/app/App.tsx` mediante estado y callback `onOpenLogin`.
- **Autenticación y Persistencia (`AuthContext.tsx`, `authService.ts`, `LoginModal.tsx`)**:
  - `authService.ts`: `signup` devuelve tanto el usuario como la sesión (`{ user, session }`). Al hacer login con contraseña se ejecutan reclamos de créditos huérfanos con `claimCreditsOnAuth`.
  - `AuthContext.tsx`: `initAuth` sincroniza `user` y `profile` de manera síncrona en React utilizando `supabase.auth.getUser()`. Las funciones `login`, `signup` y `logout` actualizan el estado de forma inmediata.
  - `LoginModal.tsx`: selector de pestañas que permite el acceso rápido vía código por email (OTP de 6 dígitos) recomendado y acceso tradicional por contraseña. Si el registro con contraseña requiere confirmación de correo en Supabase, muestra mensaje instructivo claro sin cerrar el modal engañosamente.
  - `CreditsModal.tsx`: botón de rescate "Iniciar sesión" para usuarios que abren el modal de créditos como invitados.
- **Extracción de PDF con IA (`ImportCvAiModal.tsx`)**:
  - Eliminado el bloqueo estricto que abortaba la importación si no existía sesión de Supabase previa. La extracción utiliza el rate limiting por IP del backend `cv-import-api.ts` y asocia las credenciales de sesión cuando están disponibles.
- **Gobernanza y Control de Calidad**:
  - Versión actualizada a `V2.3.2` en `src/shared/core/version.ts`.
  - Typecheck: 0 errores.
  - Pruebas unitarias: 273 pasadas, 0 fallidas.
  - Auditoría de contraste WCAG 2.1 AA: 0 violaciones nuevas.
  - Límites de módulos y lenguaje sencillo: 0 violaciones.

## [2026-10-31] - Etapas 2 y 3: Webhook Guest Credits, Alertas WhatsApp Admin (+5493878342772), Login OTP Passwordless y Panel Admin 360° (PR #54)

**Resumen:**
Se completaron las Etapas 2 y 3 del plan maestro (`.opencode/plans/plan-pagos-admin-magic-link.md`): backend de pagos adaptado para escribir créditos huérfanos a `unclaimed_email_credits`, alertas automáticas de WhatsApp al administrador ante eventos críticos, modal de login passwordless (OTP/Magic Link de 6 dígitos) en 2 pasos, botón de rescate por WhatsApp en checkout de PDF, y panel administrativo con búsqueda instantánea de clientes, acreditación rápida de créditos con motivo obligatorio y visor de auditoría de errores `admin_error_logs`.

**Acciones Tomadas:**
- **Backend de Pagos y Webhooks (Etapa 2 - PR #54)**:
  - `api/_lib/applyPayment.ts`: cuando un usuario invitado compra un pack (5 o 10 PDFs), los créditos se registran en `unclaimed_email_credits` con estado `held` en lugar de fallar o requerir sesión previa.
  - `api/_lib/whatsappAlert.ts`: módulo no bloqueante para despacho de alertas a WhatsApp admin (`+5493878342772`) ante pagos huérfanos, incidencias o compras de invitados.
  - `supabase/migrations/20261031_fix_payments_admin_contracts.sql`: corrección de contratos SQL: agregada columna `detail` y CHECK expandido en `admin_notifications` (incluye `'payment_held_guest'`), y columna `updated_at` en `payment_claims`.
- **Frontend y Panel Admin (Etapa 3 - PR #54)**:
  - `src/modules/auth/components/LoginPasswordlessModal.tsx`: interfaz passwordless en 2 pasos (ingreso de email con solicitud de OTP de 6 dígitos + ingreso de código con confirmación y auto-claim automático).
  - `src/modules/cv/components/modals/PdfCheckoutModal.tsx`: agregado botón directo de rescate y consulta por WhatsApp contextual antes de abonar.
  - `src/modules/admin/components/UsersTab.tsx`: buscador de usuarios por email, botones rápidos de acreditación manual (+1, +5, +10 créditos) con prompt de justificación obligatoria que invoca `grant_export_tokens`, y botón de contacto por WhatsApp.
  - `src/modules/admin/components/AuditAndErrorsTab.tsx`: visor filtrable de `admin_error_logs` por nivel (ERROR, WARN, INFO), origen y fingerprint para trazabilidad y diagnóstico en tiempo real.
- **Auditoría y Pruebas**:
  - Corrección de pruebas en `tests/applyPayment.test.ts` para validar inserción en `unclaimed_email_credits`.
  - Corrección de ratios de contraste WCAG AA en `AuditAndErrorsTab.tsx`, `LoginPasswordlessModal.tsx` y botón WhatsApp en `UsersTab.tsx`.

**Validación y publicación:**
- `npm run check-all`: 257 pruebas aprobadas, typecheck en verde, 0 violaciones de tokens y contraste (0 en modales), prerenderizado de 25 rutas completado.
- PR [#54](https://github.com/kalpa-droid/LEECV/pull/54) aprobada y fusionada con squash a `main`. Commit de merge: `fd20051cc94bb2aca889f66510667d7f747a7286`.

## [2026-10-30] - Etapa 1: Autenticación Passwordless (OTP/Magic Link), Auto-Acreditación por Email y Bolsillo de Créditos (PR #51 y #52)

**Resumen:**
Se incorporó el plan maestro integral en `.opencode/plans/plan-pagos-admin-magic-link.md` (PR #51) y se completó la Etapa 1 de la arquitectura (PR #52) reemplazando la dependencia de contraseñas por autenticación OTP/Magic Link, creando el bolsillo de créditos de invitado en `unclaimed_email_credits` y asegurando la auto-acreditación inmediata al iniciar sesión.

**Acciones Tomadas:**
- **Plan Maestro (PR #51)**: Documentación de los 6 ejes canónicos: coherencia de precios PayPal/Mercado Pago, auto-acreditación por email, autenticación passwordless (Magic Link / OTP 6 dígitos), alertas WhatsApp (+5493878342772), auditoría nativa de errores y panel admin 360°.
- **Autenticación Passwordless (PR #52)**:
  - `src/shared/core/auth/authService.ts`: implementación de `requestOtp(email)` y `verifyOtp(email, token)` sobre Supabase Auth; función `claimCreditsOnAuth(user)` no bloqueante e idempotente.
  - `src/shared/core/auth/AuthContext.tsx`: expone `requestOtp` y `verifyOtp` actualizando reactivamente la sesión y el perfil.
  - `src/shared/core/storage/dataAccessLayer.ts`: nuevo método `dal.createUnpaidToken()` con fallback seguro a RPC para checkout sin sesión previa.
  - Checkout de invitados en `PdfCheckoutModal.tsx` y `PricingModal.tsx` actualizado para usar la RPC de invitado.
- **Base de Datos (`supabase/migrations/20261030_email_credit_claim_and_admin_error_logs.sql`)**:
  - Tabla `unclaimed_email_credits` con índice único sobre `payment_id` (`<proveedor>:<external_id>`) y RLS estricto.
  - Función transaccional y `SECURITY DEFINER` `claim_credits_on_auth()` que traspasa los créditos al balance real en el primer login.
  - RPC `create_guest_export_token()` para emitir tokens pagables de invitado sin comprometer la tabla `pdf_export_tokens`.
  - Tabla `admin_error_logs` con RLS para registro nativo de excepciones de frontend, webhooks y APIs.
  - Políticas de RLS corregidas en `pdf_export_tokens` para permitir que el usuario consulte sus propios tokens válidos.

**Validación y publicación:**
- `npm run check-all`: 258 pruebas unitarias aprobadas, typecheck en verde, 0 violaciones de gobernanza, prerenderizado de 25 rutas completado.
- PR [#52](https://github.com/kalpa-droid/LEECV/pull/52) aprobada y fusionada con squash a `main`. Commit de merge: `8681abdcf7dda6b1c87ff105447618e78e1651b0`.

## [2026-10-29] - Corrección de hallazgos de auditoría frontend-visual A–F (UI-001 a UI-016)

**Resumen:**
Se implementaron las correcciones de la auditoría UI en modo local (servidor preview sobre `dist`, 3 temas nativos `day`, `night`, `teal_ocean` y simulación móvil 360/390/412 px). Se corrigieron problemas de capas (z-index), contraste WCAG, consistencia de planes de pago, prerenderizado y robustecimiento de scripts de gobernanza.

**Acciones Tomadas:**
- **P1 (Bloqueos de compra y consistencia):**
  - **UI-001** `Modal.tsx`: actualizado a `zIndex.modal` (9999) para evitar que el dock cubra los footers en pantallas de 360 px.
  - **UI-002** `CreditsModal.tsx`: migración de variables inexistentes `--color-accent-blue-*` a tokens semánticos oficiales; el bloque de IA ahora es visible en tema default.
  - **UI-003** `useExportEntitlement.ts`: chequeo de `plan_vence` antes de otorgar exportación ilimitada a planes vencidos.
  - **UI-004** `scripts/prerender.mjs`: canonical tag individualizado por ruta (ya no todas apuntan al home).
  - **UI-005** `scripts/prerenderMeta.mjs`: landing (`/`) incluida en prerenderizado estático con metadatos completos.
  - **UI-006** `CreditsModal.tsx` y `PdfCheckoutModal.tsx`: aplicación de `button.base` (padding, radio y tipografía del sistema de diseño).
  - **UI-007** `PersonalInfoFields.tsx` y `VectorDocViewer.tsx`: contraste corregido a ratios superiores a 4.5:1.
- **P2 (SEO e integridad de textos):**
  - **UI-008** `public/sitemap.xml`: agregados los 21 artículos del blog al sitemap canónico.
  - **UI-009** `index.html`: remoción de `maximum-scale=1.0` (WCAG 1.4.4) y placeholder de verificación de Google; prevención de H1 duplicado en páginas legales.
  - **UI-013** `pricing.ts`: corrección de paréntesis huérfano y traducción de términos técnicos a lenguaje sencillo.
- **P3 (Reglas de prevención y scripts):**
  - **UI-014**: Corrección de 8 interpolaciones rotas de `${elevationSystem.*}` con comillas simples a template literals reales.
  - **UI-015**: Endurecimiento de `audit-ui-tokens.js` (ejecuta `RAW_HEX_REGEX`), `check-token-usage.js` y `check-contrast.js` (detecta variables CSS indefinidas).
  - Creación de allowlist y baselines documentados (`scripts/ui-tokens-allowlist.json` y `scripts/contrast-baseline.json`).

**Validación y publicación:**
- `npm run check-all`: 0 errores en todas las suites.
- PR [#49](https://github.com/kalpa-droid/LEECV/pull/49) fusionada con squash a `main`. Commit de merge: `ad3b2c40531acc1fc5af8b73c9226d8c91101ee1`.

## [2026-10-29] - Suite de auditoría multiagente, SEO y fiscalización de núcleos

**Resumen:**
Se configuró el entorno OpenCode multiagente con delimitación estricta y checklists especializadas para LEECV (PR #46, #47, #48), estableciendo a `@gestor` como orquestador y asignando mandatos profundos de contraste, motores anti-parche, SEO técnico/semántico y pruebas de navegador.

**Acciones Tomadas:**
- Creación de `opencode.json` y `.opencode/agents/` (`gestor`, `arquitecto`, `desarrollo-rapido`, `frontend-visual`, `testing-qa`).
- Integración del comando `/auditar` y checklists en `.opencode/audits/` con registro en `docs/auditoria/registro.md`.
- Mandato a `@frontend-visual` para contraste en 3 temas, gradientes y SEO semántico / Google Search Console.
- Mandato a `@desarrollo-rapido` para fiscalización de motores oficiales según Regla 1 de `AGENTS.md` (DAL, apiClient, navegación, withErrorHandling, validaciones).
- Mandato a `@testing-qa` para auditoría no cosmética (validación de consecuencias de pagos en Supabase), DOM real y SEO técnico (prerender de 24 rutas, sitemap, robots).
- PR [#48](https://github.com/kalpa-droid/LEECV/pull/48) fusionada con squash a `main`. Commit de merge: `5bc7a14ec12b59628aa4ffeb627bc80fb48c48a7`.

## [2026-10-25] - Control manual de exportación PDF, bandeja de pagos retenidos y acreditación idempotente

**Resumen:**
Se incorporó un interruptor administrativo de tres estados para la exportación PDF (`automatic` / `enabled` / `disabled`, es decir automático / permitido manual / bloqueado manual), con auditoría obligatoria y motivo, más una bandeja de pagos retenidos para los cobros que Mercado Pago y PayPal informan como pendientes o en revisión.

**Acciones Tomadas:**
- **Migración `20261014_admin_pdf_export_access.sql`**: agrega `profiles.pdf_export_access_mode`, columnas de resolución en `pending_grants`, índice de retenidos sin resolver y la RPC `check_and_consume_export_entitlement` (permitido manual devuelve `true` sin consumir créditos; bloqueado devuelve `false`; automático respeta plan pro y tokens pagos).
- **Migración `20261025_pdf_export_access_hardening.sql`**: cierra un hueco crítico — `pdf_export_access_mode` no estaba protegido por `protect_privileged_columns`, por lo que cualquier usuario podía auto-habilitarse. Se agrega el trigger, las RPC `admin_set_pdf_export_access` y `admin_export_token_balances`, la vista de auditoría `pdf_status_logs` sobre `admin_audit_logs`, `hold_reason`/`export_token` en `pending_grants` y los checks de estado.
- **Pagos retenidos**: `applyPayment` ahora retiene los pagos con `providerStatus === 'pending'` (motivo `provider_pending`) sin acreditar nada, y guarda `export_token` para poder resolver ventas individuales. Se suman los motivos `amount_mismatch` y `missing_profile`. Mercado Pago interpreta `pending`/`in_process`/`authorized`/`in_mediation`; PayPal interpreta `PAYMENT.CAPTURE.PENDING`.
- **Acreditación idempotente**: el webhook de aprobación acredita el pago y luego resuelve automáticamente la retención previa (`resolveIfPending`), sin reabrir pagos ya completados. La limpieza fallida no tumba el webhook: se registra en Sentry y la fila queda resoluble a mano.
- **Panel admin**: selector de modo con motivo obligatorio (5–500 caracteres), badge de modo, saldo real de exportaciones vía `admin_export_token_balances`, historial de acreditación y bandeja de retenidos (`PaymentsAdminTab`, `PendingGrantsTab`) con resolución manual de packs y de ventas `single_pdf`.
- **Cliente**: `useExportEntitlement` lee el modo y llama a la RPC de consumo; `PdfCheckoutModal` decide el botón con `canExport` en lugar de `credits > 0` y muestra un mensaje específico cuando el acceso está bloqueado.
- **Pruebas**: retención de pagos pendientes, no reapertura de un pago completado, extracción de estados pendientes de ambos proveedores y un test de integración local de los tres estados (incluido el bloqueo de auto-escalada y el registro de auditoría).

**Validación y publicación:**
- `npm run check-all`: aprobado en local y en el hook de pre-push; 258 pruebas OK, 2 omitidas por requerir Supabase local; typecheck, lint, gobernanza, build y SEO en verde.
- `git diff --check`: sin errores de espacios.
- Rama `feat/admin-credit-account-controls`, PR [#44](https://github.com/kalpa-droid/LEECV/pull/44) abierta contra `main`. `check-all` en GitHub Actions ✅.
- PR #44 fusionada con squash el 2026-10-26. Commit de merge en `main`: `fd94f3b117e768cff70604628aaf7ce24b97c194`.

**Despliegue de base de datos:**
- Ambas migraciones quedaron aplicadas en el proyecto `gzsdmsiefswgnyycrmsk` (verificado con `supabase migration list`: `20261014` y `20261025` figuran en remoto).
- Hallazgo durante la aplicación: la base no tenía `public.admin_audit_logs` porque `20260820_protect_plan_columns_and_claims.sql` nunca se aplicó completa (sólo existía `payment_claims`). La `20261025` ahora crea la tabla de forma idempotente con su RLS y política de lectura para admin, así que la vista `pdf_status_logs` y el RPC funcionan sin depender de esa migración vieja.
- Prueba de humo ejecutada en una transacción revertida: `admin_set_pdf_export_access` devolvió `automatic -> enabled`, la vista registró el motivo y `admin_export_token_balances` respondió vacío. No quedaron cambios de datos.
- Durante la verificación se corrigió el consumidor que ya existía roto: `dal.adminAuditLogs` (`src/shared/core/storage/dataAccessLayer.ts`) escribía y buscaba `performed_by`/`action`, pero el esquema canónico usa `admin_id`/`action_type`. Ahora inserta y lista con las columnas correctas; la búsqueda por admin compara `admin_id` por igualdad y solo con un uuid completo (la columna es uuid, no admite ILIKE).
- Además, `admin_audit_logs` no tenía política de INSERT, así que el panel no podía registrar acciones aunque las columnas fueran correctas. Se agregó la política `admin inserta logs` para `authenticated` con `is_admin(auth.uid())` y `admin_id = auth.uid()`, y ya está aplicada en la base.

## [2026-10-10] - Integración del flujo de postulaciones, cartas e importación revisable

**Resumen:**
Se integró la preparación de postulaciones al editor de CV, manteniendo intacto el CV maestro y vinculando cada copia a su vacante y carta de presentación.

**Acciones Tomadas:**
- Se agregó la creación de una copia independiente para cada postulación, con captura compartida de información de la vacante.
- Se integró una pestaña de carta editable al CV, con borrador de IA revisable, visor y exportación separada. La carta reutiliza colores y tipografía de la versión del CV.
- Se centralizó la importación de copia de LinkedIn, archivos PDF/foto y texto pegado. Los datos extraídos pasan por una revisión explícita antes de combinarse; los datos existentes se conservan por defecto y las listas se revisan por registro.
- Se añadieron propuestas asistidas por IA para adaptar el objetivo, el resumen y las competencias con base en la información disponible, sin aplicarlas automáticamente.
- Se ajustaron estilos y se ejecutó la auditoría de contraste en los temas soportados.

**Validación y publicación:**
- `npm run check-all`: aprobado; 33 archivos de prueba y 236 pruebas pasaron.
- La PR [#32](https://github.com/kalpa-droid/LEECV/pull/32) se fusionó el 2026-10-10. Commit de merge: `4f2852686417b002bceba11219cd75d5abd6747e`.
- Verificación manual de navegación en escritorio y móvil, creación de postulación, vista de carta y apertura de la exportación separada.
- Durante la prueba local, Supabase respondió 404 para `template_presets`; se registró como incidencia ajena a la integración y pendiente de revisión del backend.

## [2026-09-27] - Remoción de Lógica Stateful de Pagos y Publicación Web

**Resumen:**
Migración a una arquitectura de facturación stateless ("guest-first") donde el estado del checkout depende únicamente de un `exportToken` emitido por Lemon Squeezy en lugar de una sesión de usuario.

**Acciones Tomadas:**
- **Eliminación de features deprecadas**: Se removieron por completo `AuthProvider`, `CloudStatusModal`, `AccountMenuButton`, e integraciones con `seoIndexingEngine` relacionadas con publicación web.
- **Refactorización de `applyPayment`**: Se actualizó `src/shared/core/payments/applyPayment.ts` para soportar pago sin autenticación, usando el `exportToken` (pasado en custom_data de Lemon Squeezy o webhook metadata) para activar el documento en la tabla `pdf_export_tokens`.
- **Mocking en Tests**: Se actualizaron las baterías de tests (`tests/applyPayment.test.ts` y `tests/paymentProviders/paymentWebhookIntegration.test.ts`) pasando un `fakeAdminClient` explícito para testear las llamadas de Supabase Admin (utilizando `from().update().eq()`).
- **Unificación de Componentes**:
  - `PdfCheckoutModal.tsx` fue actualizado para manejar el flujo sin Auth y despachar el `exportToken`.
  - Se creó/actualizó `usePageAwareCreditGate` y se incorporó exitosamente en el Navbar del CV, en el `TemplateMenu.tsx` y en el export de `App.tsx` para interceptar descargas de forma unificada en todo el proyecto.
- **Auditorías**: Se removieron chequeos de `canPublish` de `verify-document-engine-contract.cjs` ya que la función ya no existe.

**Estado Actual:**
- La base de código compila satisfactoriamente.
- `npm run check-all` debe pasar exitosamente.

---

## [2026-11-01] — Registro Regla 6 paso 7 (Post-merge feat/estrategia-ats-cro)
- **Merge confirmado**: `feat/estrategia-ats-cro` → `main` (hash `71c4f91`, mensaje: `Feat/estrategia ats cro (#64)`).
- **Estado**: `main` = `71c4f91`; `origin/main` sincronizado. Working tree limpio.
- **Verificación**: `npm run typecheck` = 0 errores; `npm test` = 284 passed / 2 skipped; `npm run build` = OK; `verify:seo` = 40/40.
- **Acción**: Registro completado en `.opencode/CONTEXT.md` y `SESSION_LOG.md`. No requiere más acciones de merge.

## [2026-11-13] â€” Registro Regla 6 paso 7 (Post-merge PR #79 â€” V2.8.6)
- **Merge confirmado**: PR #79 (`feat/gemini-multimodal-resilience`) â†’ `main` vÃ­a squash. Hash: `1729cc28ccff4872569cbec5d2669928012615b8`. Mensaje: `feat(ai): pipeline OCR completo Groq Vision, multi-key rotation, presupuesto 50s, guardado progresivo (V2.8.6) (#79)`.
- **VerificaciÃ³n post-merge**: `git fetch origin` â†’ `origin/main` = `1729cc2` (coincide con `mergeCommit.oid` devuelto por la API y con `mergedAt: 2026-11-13T01:35:08Z`).
- **Contexto del merge**: la web de GitHub bloqueaba el merge con "Merge already in progress" y luego "The server is currently unable to perform this operation", sin incidente activo en githubstatus.com y con `mergeStateStatus: CLEAN`. `gh pr merge` (GraphQL) fallÃ³ con error 5xx genÃ©rico. Se completÃ³ vÃ­a REST `PUT /repos/kalpa-droid/LEECV/pulls/79/merge` con `merge_method=squash` (autenticado como kalpa-droid).
- **Nota de protocolo**: la PR toca `src/shared/core/` y `api/`; el merge se hizo por orden directa de Kalpa en esta sesiÃ³n, **sin aprobaciÃ³n CODEOWNER registrada** en la PR (`reviewDecision` vacÃ­o).
- **Estado del cÃ³digo**: `npm run check-all` en verde antes del push (tests 300 passed / 2 skipped, SEO 40/40, prerender 80 rutas). Checks de GitHub Actions y Vercel en verde sobre la PR.
- **Working tree**: `SESSION_LOG.md` con cambios previos de Kalpa (V2.8.4) + esta entrada, sin commitear. `mejoraocr.docx` sigue sin trackear. Rama local `feat/gemini-multimodal-resilience` conservada en `68648a7`.

## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PR #81 — V2.8.7)
- **Merge confirmado**: PR #81 (`fix/groq-live-models-retry`) → `main` vía squash. Hash: `6e7d8fea1e3f1b3026265de74dc9733361c7669a`. Mensaje: `fix: Groq con modelos vigentes (GPT-OSS 120B / Qwen 3.8 Vision), telemetria con modelo real, reintento selectivo persistente (V2.8.7) (#81)`.
- **Contexto**: remediación de hallazgos post-V2.8.6 — las 3 referencias de modelo Groq estaban deprecadas para el tier free/developer (`llama-3.3-70b-versatile` shutdown 2026-08-16 → `openai/gpt-oss-120b`; `llama-3.2-11b-vision-preview` shutdown 2025-04-14 → `qwen/qwen3.8-27b`; fallback `llama-4-scout` shutdown 2026-07-17). Incluye: reintento selectivo conserva páginas que vuelven a fallar; rotación multi-key (8 claves/proveedor, salto con 429) en `extract-page` y `ai-generate`; telemetría con el modelo efectivo (`AiCompletionResponse.modelUsed`); `consolidate-ats` ahora loguea uso.
- **Verificación post-merge**: `git fetch` + `git pull --ff-only` → `main` = `6e7d8fe` (idéntico a `mergeCommit.oid`); `mergedAt: 2026-11-13T02:25:29Z`; checks verdes (check-all 50s, Vercel).
- **Working tree**: limpio tras el merge. `mejoraocr.docx` eliminado (a Papelera) por orden de Kalpa.
- **Nota de protocolo**: merge por orden directa de Kalpa (la web de GitHub fallaba; merge vía REST squash). Sin aprobación CODEOWNER registrada en la PR.

## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PRs #82 y #83 — V2.9.0)
- **Merge #82**: PR #82 (`docs/session-log-v2.8.7`) → `main` vía squash. Hash: `5705f8bf22bc73680108999332e7f8e2bba4aeca`. Registra el merge de #81 en `SESSION_LOG.md` (paso 7 de #81).
- **Merge #83**: PR #83 (`feat/shared-key-cooldown`) → `main` vía squash. Hash: `d676f49d5716d96ef68eefc32fb9907ce31ab766`. Mensaje: `feat: cooldown compartido de API keys de IA en Supabase + cron de ping (V2.9.0) (#83)`. `mergedAt: 2026-11-13T03:56:48Z`.
- **Contexto**: cooldowns de API keys de IA compartidos entre lambdas vía tabla `public.ai_key_cooldowns` (migración aplicada por Kalpa en el SQL Editor de Supabase antes del merge; CLI con token 401). RLS ON sin policies (solo service_role); se guarda únicamente SHA-256 de la key. `keyRotation.ts` híbrido async (timeout 1500 ms → fallback fail-safe a memoria local). Cron `api/cron-ai-keys-ping` diario `0 6 * * *` (plan Hobby de Vercel: máx. 1 cron/día; el schedule inicial de 6h hacía fallar el deploy) pinguea Gemini/Groq y reporta degradación a Sentry. Call sites con `await`; `scripts/verify-ai-engine.ts` adaptado a async. `version.ts` → V2.9.0.
- **Verificación post-merge**: `git fetch` + `git pull --ff-only` → `main` = `d676f49` (idéntico a `mergeCommit.oid`). Checks verdes tras `gh pr update-branch` (check-all 1m18s; Vercel pass). Deploy de producción disparado por Vercel: `dpl_HQ8PWtUfoQSUhaXRkwzm19d14hJW` (BUILDING al momento del registro).
- **Verificación extra post-deploy pendiente de Kalpa**: `curl -H "Authorization: Bearer $CRON_SECRET" https://leecv.app/api/cron-ai-keys-ping` → debe responder `200` con `success: true` y estado `active` de groq/gemini.
- **Nota de protocolo**: merges por orden directa de Kalpa (web de GitHub fallaba; squash vía REST). Sin aprobación CODEOWNER registrada.
## [2026-11-13] — Optimización integral OCR: conversión local + lectura estructural (V2.10.0)
- **Merge #85**: PR #85 (`ci/ping-ai-keys-cron`) → `main` vía squash. Hash: `010e982dd7eabaa8535e0eb3e18842a1b8461855`. Workflow `ping-ai-keys.yml`: ping a `/api/cron-ai-keys-ping` cada 6h vía GitHub Actions. **Incidente**: run de prueba manual falló (`env: CRON_SECRET:` vacío) — `gh secret list`/`gh variable list` del repo salen vacíos; Kalpa confirmó haberlo cargado pero GitHub no lo ve (posible Environment/Dependabot/Codespaces, u otro repo). Pendiente de Kalpa: cargar `CRON_SECRET` en Settings > Secrets and variables > Actions (pestaña Secrets) y re-probar con Run workflow.
- **Implementación V2.10.0** (rama `feat/ocr-local-y-contexto-estructural`, pendiente de PR y de orden de merge de Kalpa):
  - Nuevo `src/shared/core/cv-import/pdfPageLayout.ts`: ordenamiento espacial de TextItem por (x,y), renglones con tolerancia por altura de fuente, detección de gutter vertical persistente (2 columnas) y decisión de 3 modos por página (`text` / `hybrid` / `image`).
  - `pageImageEncoder.ts`: MAX_IMAGE_DIMENSION 1600→1920; fondo blanco opaco obligatorio; `computeRenderScale` (1.5–2.6, objetivo 1920px); escalera JPEG [0.88,0.78,0.65,0.48]; páginas digitales intentan WebP q0.9 ≤1.2MB → PNG ≤1.2MB → JPEG; `applySoftContrast` (estiramiento 2%–98% luminancia, nunca binariza) y EXIF `imageOrientation: 'from-image'` para fotos; devuelve `{ base64, mimeType }`.
  - Nuevo `src/shared/core/cv-import/cvContextSummary.ts`: resumen rodante (~150 tokens: nombre, idioma, última sección, último registro) que el modal envía como `contextSummary` a la página i+1.
  - Nuevo `api/_lib/cvImportGate.ts` (GEMELO backend de la misma heurística, el frontend no puede exportar a api/): `isFragmentEffectivelyEmpty` para el Completeness Gate.
  - `ImportCvAiModal.tsx`: usa `analyzePdfPage` (3 modos), render con fondo blanco a 1920px, MIME real en el payload, contexto rodante entre páginas (también en reintento selectivo), `encodeImageFileWithinBudget` con EXIF+contraste suave.
  - `api/_lib/aiProviders/types.ts`: mimeType ampliado a webp + `mediaResolution` opcional. `gemini.ts`: `MEDIA_RESOLUTION_HIGH` automática con imágenes + fallback seguro (reintento sin el campo si el modelo devuelve 400 mediaResolution). `groq.ts`: temperatura 0.1 por defecto cuando hay responseSchema.
  - `api/cv-import-api.ts`: prompt con protocolo estructural (segmentación, regla de columnas, regla híbrida, reglas de elementos gráficos y certificados, tipos estrictos para Groq), MIME desde el body, `contextSummary` etiquetado, Completeness Gate con un reintento de verificación automático cuando la página tenía contenido y la IA devuelve vacío.
  - Regla 4: borrado `src/shared/core/cv-import/mergePageFragments.ts` (duplicado muerto; el canónico es `mergeFragments.ts`).
  - Versión: V2.10.0 (MINOR). Tests nuevos: pdfPageLayout (7), cvContextSummary (4), cvImportGate (5), aiProviderMediaResolution (6); cvImportEncoder actualizado a la nueva firma.
## [2026-11-13] — Registro Regla 6 paso 7 (Post-merge PR #86 — V2.10.0)
- **Merge #86**: PR #86 (`feat/ocr-local-y-contexto-estructural`) → `main` vía squash. Hash: `3a6ac44c44f3ca1a5b84375a5eb7b5937a0653d3`. Mensaje: `feat: pipeline OCR integral - conversion local optima y lectura estructural en la nube (V2.10.0) (#86)`. `check-all` ✅ (1m2s) y Vercel Preview ✅ pre-merge; `npm run check-all` local exit 0 (344 tests passed / 2 skipped).
- **Merge #85** (misma ronda, orden de Kalpa): `010e982dd7eabaa8535e0eb3e18842a1b8461855`. Workflow `ping-ai-keys.yml` 6h vía GitHub Actions. Verificación pública post-merge: sitio HTTP 200; `/api/cron-ai-keys-ping` responde **401 sin Bearer** (bien).
- **Incidente CRON_SECRET para GitHub Actions**: Kalpa cargó `CRON_SECRET` en **Vercel production** — correcto para el cron diario Hobby (`0 6 * * *`), pero GitHub Actions NO ve variables de Vercel (repo secrets/variables vacíos por `gh secret list`/`gh variable list`; los 6 Environments del repo tampoco exponen secrets por API). El run manual del 2026-11-13 16:54Z falló por el guard del workflow (`CRON_SECRET` vacío). **Fix (Kalpa)**: duplicarlo como repo secret — GitHub → repo → Settings → Secrets and variables → Actions → pestaña Secrets → New repository secret → `CRON_SECRET` → mismo valor que Vercel production → luego Actions → "Ping AI keys" → Run workflow (esperado: 200, `degradedProviders=0`).
- **V2.10.0 en `main`**: pipeline OCR integral (motor espacial `pdfPageLayout.ts` con 3 modos text/hybrid/image, render 1920px fondo blanco, WebP/PNG/JPEG presupuestado, contraste suave EXIF para fotos, contexto rodante entre páginas, protocolo estructural en prompt + `MEDIA_RESOLUTION_HIGH` en Gemini + temperatura 0.1 Groq con responseSchema, MIME real en payload, Completeness Gate). Duplicado `mergePageFragments.ts` borrado (Regla 4). Versión `version.ts` → V2.10.0.
- **Limitación de verificación**: el MCP de Vercel no respondió en la sesión (namespace vacío); la verificación pública fue sitio HTTP 200 y endpoint 401 sin auth. El deploy de producción se dispara desde `main` como en merges anteriores.
## [2026-11-13] — Incidente CRON_SECRET RESUELTO (ping 6h verde)
- **Cierre del incidente abierto en PR #87 / sesiones previas**: Kalpa duplicó el `CRON_SECRET` (mismo valor que Vercel production) como **repo secret** de GitHub Actions (Settings → Secrets and variables → Actions → pestaña Secrets → `CRON_SECRET`).
- **Verificación**: run `43475363785` (2026-11-13T17:41:59Z, `workflow_dispatch` sobre `main`) → **completed success**: el endpoint respondió HTTP 200 y `degradedProviders=0` (el script del workflow sale en error ante no-200 o proveedores degradados; run anterior `43474392415` 17:36Z falló por el secret antes de la duplicación).
- **Lección asentada**: GitHub Actions NO puede leer variables de entorno de Vercel. Todo secret que un workflow de GitHub necesite debe existir en el scope de GitHub (repo secret o Environment, atando el job con `environment: <nombre>`).
- El cron diario de Vercel (`0 6 * * *`, plan Hobby) sigue activo en paralelo como red de seguridad.

## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #93 - V2.11.0)
- **Merge confirmado**: PR #93 (`feat/modelo-plantillas-secciones-ia`) → `main` vía squash. Hash: `cf573e97ea97ee918729b2e9785c7620fa606f5c`. Mensaje: `feat(sections): plantilla respeta columnas manuales, IA por seccion y candados visibles (V2.11.0)`. `mergedAt: 2026-11-14T16:32:47Z`; checks verdes en GitHub (check-all 1m19s; Vercel Preview + Deployment pass).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1` = `cf573e97...` (idéntico a `mergeCommit.oid` y a `main` local); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorización CODEOWNER**: Kalpa dio permiso explícito en sesión ("te doy el permiso para CODEOWNER para el merge"); la PR toca `src/shared/core/` y `api/_lib/` (núcleos compartidos: templateApplicationEngine, presetHierarchyEngine, aiClient, catálogo de tareas IA).
- **Contenido**: Fases A–F del plan aprobado — full-template conserva columna manual elegida por el usuario; banner en Datos Personales cuando el formato oculta datos cargados; nivel preset ya no enciende slots `personalizada-1..5` vacíos; scroll al PDF + toast al reordenar; candado visible en certificados/firma; IA por sección (`suggest_achievement_acr`, `suggest_records` por kind, `explain_ats` conectado al modal ATS, prompt `ats_analysis` endurecido); versión V2.11.0.
- **Validación**: `npm run check-all` local EXITCODE=0 (372 tests); `templateSemantics` 14/14; typecheck limpio; baseline de contraste actualizado por corrimiento de líneas (mismas 8 entradas, 0 violaciones nuevas).

## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #95 - V2.11.1)
- **Merge confirmado**: PR #95 (`fix/v2-11-section-ai-audit`) a `main` via squash. Hash: `5039028c304766691b6a25032e2ab45afdef492e`. Mensaje: `fix(audit): candado vivo, scroll forzado post-render y contratos IA para Gemini (V2.11.1) (#95)`. Checks verdes en GitHub: `check-all` 1m18s; Vercel Preview + Deployment pass.
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1` = `5039028` (identico a `mergeCommit.oid` y a `main` local); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio permiso explicito en sesion ("te doy el permiso para CODEOWNER para el merge"). La PR tocaba `src/shared/core/` y `api/_lib/` (nucleos compartidos: templateApplicationEngine, presetHierarchyEngine, VectorDocViewer, SectionPositionControl, RecordFormSection, PersonalInfoFields, aiTasks/catalog).
- **Contenido** (Plan de Correcciones aprobado sobre la auditoria de `0616d7e`, 2 bugs criticos + Fases A-F):
  - Candado vivo: `SectionManualAdjustment` ya no esconde el control de ubicacion/orden en secciones no asignables a columna (`certificados`/`firma` siempre muestran candado con razon).
  - Scroll sincronizado: `pdf-anchor-scroll` con `forcePostRender`; `VectorDocViewer` saltea el restore de ratio y fuerza `scrollToPdfAnchor`.
  - IA/Gemini (bug critico): `responseSchema` OpenAPI 3.0 validos en `api/_lib/aiTasks/catalog.ts` (sin `type` array, sin `additionalProperties`); `suggest_records` con properties explícitas por ids reales de `FIELD_CATALOG`; schema nuevo en `explain_ats` y `ats_analysis`; kindLabels +portfolio/+custom.
  - Normalizacion de registros IA: `normalizeAiDraftRecord` (exportada) traduce alias canonicos, descarta claves desconocidas, ids unicos; portfolio/custom en `RecordFormSection`; aliases+id en `HabilidadesSection`; selector "Experiencia destino" + "Aplicar a esta experiencia" (ACR) en `ExperienciaSection`; `AtsAiAnalysisModal` con reset total al reabrir/cambiar texto, "Volver a analizar" y reintento de error.
  - Plantillas/presets: `applyTemplateMode` preserva columna manual en los 3 modos y persiste `columnAssignments`; `certificados` fuera de la distribucion por columnas (resuelve `layoutResolutionEngine` por rol canonico); nivel preset no enciende opcionales no universales vacias (`logros`/`publicaciones`/`referencias`/`idiomas`/`redes`); `activeFormatId` conservado si el preset es compatible.
  - Datos Personales: `contacto`/`datos-personales` con visibilidad independiente; formato ATS ya no apaga todo ni esconde Nombre/Contacto; banners de politica de formato y de preferencia manual.
- **Tests**: 3 archivos nuevos (`aiTasksCatalog`, `aiDraftNormalize`, `sectionManualAdjustment`); actualizados por diseño `templateApplicationEngine`, `templateSemantics`, `snapshots_baseline`, `presetComposition`. `npm run check-all` local EXITCODE=0 + pre-push completo OK. `scripts/contrast-baseline.json` actualizado SOLO por corrimiento de lineas (153 a 162, 87 a 81; mismas 20 entradas, 0 violaciones nuevas).
- **Nota de version**: el commit de codigo olvido el bump de `version.ts` (Regla de Versionado); el PATCH a V2.11.1 se asienta en esta PR docs junto al stage actualizado.
- **Pendiente historico (no bloqueante)**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.
## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #97 - V2.12.0)
- **Merge confirmado**: PR #97 (`feat/dock-personalizada-ai`) a `main` via squash. Hash: `3b648afde3a6cd3fe54c4aa2deb5e96bf6b294af`. Mensaje: `feat(ia+dock): reescritura de registros con IA (rewrite_record) y dock Opcion 2 (V2.12.0) (#97)`. `mergedAt: 2026-11-14T23:31:45Z`; checks verdes en GitHub (`check-all` 1m4s; Vercel Preview + Deployment pass).
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `3b648af` (identico a `mergeCommit.oid`); working tree limpio; rama feature borrada en remote (`--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio permiso explicito en sesion ("te autorizo para que lo hagas por mi"). La PR tocaba `src/shared/core/` y `api/_lib/` (nucleos compartidos: motor de secciones/dock en activeSectionsDockEngine, catalogo de tareas IA, RecordFormSection, PresetSectionPicker nuevo).
- **Contenido** (Bloques 2+3 del plan aprobado sobre 0c58fb4; Bloque 1 tipografia va en PR B):
  - Nueva tarea `rewrite_record` (`api/_lib/aiTasks/catalog.ts`): OpenAPI 3.0 desde el dia 1 (`required: ["improvedFields"]`, properties explicitas, `missingDataNote` nullable); focos claridad (default) / ats / breve; reglas duras anti-invencion.
  - Contexto de candidato con ALLOWLIST (`candidateContext.ts`): solo trayectoria util (personalInfo redactada, jobTarget, secciones de registros), salida de 1 linea, nada de metadata de UI/presentacion. PII intacta (dni/cuit/phone/email/address/photoUrl) + redaccion de emails/telefonos en texto libre.
  - Guia compacta de esquema para Groq (`schemaGuide.ts`, NUEVO): Groq fuerza json_object pero no valida; se inyecta guia inline en systemPrompt marcando requeridas. Gemini sigue validando con responseSchema.
  - UI (`RecordFormSection.tsx`): boton "Mejorar texto" por campo textarea libre (`isAiRewritableField`, normaliza NFD) y "Mejorar registro con IA" por tarjeta con chips de foco; panel de revision "Vista previa de la IA" con Reemplazar / Agregar debajo / Descartar (campo) y Aplicar cambios / Descartar (registro); NUNCA se auto-aplica ni auto-anexa. CV `jobTarget` (jobTitle+companyName+jobDescription) como vacante de enfoque.
  - Dock Opcion 2 (`activeSectionsDockEngine.ts`): slots `personalizada-N` vacios ocultos aunque un formato los encienda (excepto las secciones canonicas vacias, que siguen visibles: decision documentada del motor); `findFreeCustomSlot` ignora visibilidad (alta por "+"); `PresetSectionPicker.tsx` (NUEVO) grilla compartida de Secciones Predisenadas + tarjeta punteada "Seccion a Medida" entre alta (nueva_seccion) y panel de slot (personalizada-N, colapsable con defaultOpen cuando vacio).
- **Tests**: 3 nuevos (`candidateContext`, `schemaGuide`, `customSlotsDock`) + 2 extendidos (`aiTasksCatalog` contrato rewrite_record, `aiDraftNormalize` isAiRewritableField NFD). `npm run check-all` local EXITCODE=0 (415 tests passed / 2 skipped); pre-push repite typecheck+lint+gobernanza+build OK.
- **Version**: V2.11.1 -> V2.12.0 (MINOR, nueva funcionalidad; bump asentado ANTES del merge dentro de la misma PR -- leccion #95 aplicada).
- **Nota**: el pre-push timeout local a los 300s en el primer intento; el push posterior completo (con la suite completa como gate) confirmo el push; la segunda llamada de push fue rechazada por "reference already exists" porque el primer push ya habia subido la rama. Sin impacto: la rama remota quedo con b705aff (commit correcto).
- **Pendiente para proxima sesion (PR B - Bloque 1)**: unificar `recordScaleRatios` como ratios reales en AMBOS productores (`presetCompositionInstances.ts` guarda pt disfrazados de ratios; `typographyHarmonyEngine.ts` genera ratios); clamp body 10.0->8.0; `quote-text`->rol `body`; test de invariante `extra <= meta <= body <= subtitle <= itemTitle <= sectionHeading <= title`; `typographyOverrides` greenfield en `resolveActivePreset`+`presetSchema.ts`; `densityMode` en 1 helper central; lenguaje sencillo.
- **Pendiente historico (no bloqueante)**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.
## [2026-11-14] - Registro Regla 6 paso 7 (Post-merge PR #99 - V2.13.0)
- **Merge confirmado**: PR #99 (`feat/typography-hierarchy-density`) a `main` via squash. Hash: `7f4a72b2759eb27662afb2adf09f9e5f5306b5d6`. Mensaje: `feat(typography): jerarquia tipografica y densidad (Bloque 1, V2.13.0) (#99)`. Checks verdes en GitHub (`check-all` 1m10s; Vercel Preview + Deployment pass).
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `7f4a72b` (identico a `mergeCommit.oid` y al squash en `main` local, fast-forward d8c46ea..7f4a72b); working tree limpio; rama feature borrada en remoto y en local (`-D` seguro: squash, trabajo ya en `main`).
- **Autorizacion CODEOWNER / flujo**: Kalpa aprobo el plan ("confirmo", 2026-11-14) con el flujo completo de Regla 6 incluido (rama -> push -> PR -> CI verde -> merge). La PR tocaba `src/shared/core/`; GitHub no exhibio `reviewDecision` bloqueante al momento del merge (`mergeStateStatus: CLEAN`, `reviewDecision: ""`, 0 reviews).
- **Bloque 1 (jerarquia tipografica y densidad) implementado** (PR B del plan de 3 bloques):
  - **Causa raiz**: `recordScaleRatios` se guardaba/generaba como puntos (9, 8, 8...) y `deriveRecordScale` lo multiplicaba contra `body` (ratios ~10x -> clamp -> jerarquia aplastada); piso de body 10.0 pt; `quote-text` resolvia rol `subtitle`.
  - **Capa A (motor)**: `deriveRecordScale` con ratios reales + blindaje de valores > 2.0 (pt confundidos -> neutralizados), piso body 8.0 pt y cadena estricta por tarjeta `title > subtitle > body >= meta >= extra` (ajuste suave conservador si se invierte). `presetCompositionInstances.ts`: ratios reales por plantilla (editorial 1.08/0.89/0.84; moderna 1.06/0.88/0.86; clasica 1.05/0.90/0.88; condensada 1.04/0.92/0.90). `typographyHarmonyEngine.ts`: emite ratios reales (÷ body). `cvRecordRenderers.tsx`: `quote-text` pasa a rol `body` con `summaryScaleFactor`.
  - **Capa B (densidad)**: nuevo `densityEngine.ts` con `resolveDensityFactors(compact|normal|relaxed)` (compact 0.5/0.625/0.55/0.95; relaxed 1.35/1.25/1.3/1.05) y `applyTypographyOverrides(bodyPt, contrastScheme, sectionHeadingScale, summaryScaleFactor)`. `SectionBannerCard` escala margenes del banner por densidad (firma intacta en TemplateRenderer); `recordSpatialLayoutEngine.resolveRecordLayout(template, densityMode)` escala padding/marginBottom; `pageOverflowEngine.estimateRecordHeightPt(..., densityMode)` usa el padding real del layout espacial.
  - **Capa C (UI Diseno, opcional y granular)**: panel "Ajustar tamanos y espacio en la hoja" en `DisenoSection.tsx`: 5 grupos (Tamano de lectura 8.5/9.5/10.5; Diferencia titulos/texto Suave 1.12/Equilibrada 1.20/Marcada 1.28; Tamano de titulos de seccion Chico 0.85x/Normal/Destacado 1.15x; Tamano del Extracto/Resumen Compacto/Igual al texto/Destacado; Espacio entre bloques Compact/Normal/Relaxed) + boton "Volver al ajuste de la plantilla". Persiste en `cvData.typographyOverrides`; `resolveActivePreset` lo aplica SOBRE el preset resuelto y propaga `densityMode` sin tocar paleta ni layout. Contraste/overrides en variables CSS (sin colores dinamicos en className).
  - **Preset schema**: `DensityMode`, `TypographyOverrides`, `summaryScaleFactor` en TypographyScale, `densityMode?` y `typographyOverrides?` en Preset.
- **Tests**: nuevo `tests/typographyHierarchy.test.ts` (9 tests: invariante de jerarquia en 4 plantillas, piso 8.0 pt, blindaje ratios > 2, overrides bodyPt/densityMode en `resolveActivePreset`). Suite completa: 424 passed / 2 skipped. `npm run check-all` local EXITCODE=0 (lint, tokens, contraste, pdf-contrast 1236, cv-harmony 60/60, build + prerender). Pre-push (husky, suite completa) OK.
- **Version**: V2.12.0 -> V2.13.0 (MINOR, bump asentado ANTES del merge dentro de la misma PR).
- **Nota de proceso (2 lecciones)**: (1) el primer `gh pr merge 99 --squash` timeouteo el pty a los 120s PERO el merge YA estaba ejecutado en GitHub; el reintento reporto "already merged" (exit 0) - confirmar siempre con `gh pr view --json state,mergeCommit` antes de reintentar una operacion de escritura. (2) `git push --delete` tambien dispara el pre-push (suite completa); el primer borrado timeouteo el pty a 120s pero el remoto YA estaba borrado; verificar con `git ls-remote --heads origin <rama>` antes de asumir fallo.
- **Ajuste conocido no aplicado (si Kalpa lo pide)**: `contrastScheme` hoy escala title/sectionHeading/itemTitle como `body x factor x 2.2/1.3/1.1` (implementacion absoluta; si los titulos quedan grandes en bodyPt alto, afinar a ratio relativo).
- **Pendiente historico no bloqueante**: Kalpa - probar Editor - Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] — Registro Regla 6 paso 7 (Post-merge PR #101 — V2.14.0)
- **Merge confirmado**: PR #101 (`feat/typography-sliders-ai-retry-defaults`) → `main` vía squash. Hash: `f081fe565a716917f7cbbe51699e9c70e749ce0c`. Mensaje: `feat: tiradores continuos, reintentos IA silenciosos, mojibake y defaults de CV nuevo (V2.14.0) (#101)`. `main` local fast-forward `2f33b90..f081fe5` tras `git fetch`. Checks verdes: `check-all` local EXITCODE=0 (incl. 4 archivos de tests nuevos), pre-push completo OK, CI GitHub Actions `check-all` success (~77 s; 12 annotations = warnings no bloqueantes), Vercel Preview + Deployment pass.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `f081fe565a716917f7cbbe51699e9c70e749ce0c` (idéntico al squash devuelto por la API de merge); trabajar en `main` limpio tras fast-forward. Rama feature borrada en remoto (`git push origin --delete` timeouteó el pty a 120 s pero el remoto ya estaba sin la rama, confirmado con `git ls-remote --heads origin <rama>` → 0 líneas; exit=0) y en local (`-D` seguro: squash, trabajo ya en `main`).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Sí, mergeá después de tu re-check") tras mi re-check previo (PR abierta, 22 archivos, CI `check-all` verde, `mergeStateStatus: CLEAN`, Vercel success). La PR toca `src/shared/core/` y `api/_lib/`.
- **Bloque 1 (tiradores continuos + preview reactivo — causa raíz)**: el bug "los tiradores del panel no respondían en la vista previa" era que `CVPreview.tsx` tenía el `useMemo` del preset activo **sin** `typographyOverrides` ni `theme?.primaryColor` en las deps → el preview nunca re-resolvía el preset. `densityEngine.ts` reescrito: motor **continuo 0.50–1.35** interpolando linealmente entre las anclas compact 0.50 / normal 1.0 / relaxed 1.35 (válido para `densityMode`, `recordCardPaddingFactor`, `quoteTextPaddingFactor`, `lineHeightFactor`, `sectionBannerMarginFactor`); acepta enum legado o número (retrocompatibilidad total con borradores). Exports nuevos: `CONTRAST_FACTORS`, `SECTION_HEADING_FACTORS`, `SUMMARY_FACTORS`, `DENSITY_FACTORS`. `applyTypographyOverrides`: escala `lineHeightBody` por el factor de densidad y redondea pt a 0.5 (`Math.round(x*2)/2`); factores numéricos acotados a rangos seguros; enums históricos con los mismos valores de siempre. `cvRecordRenderers.tsx`: quote-text ahora consume `quoteTextPaddingFactor` (paddingVertical/marginBottom/marginTop) y `lineHeightFactor` (antes eran código muerto). `DisenoSection.tsx`: componente a nivel módulo `TypographySlider` (mismo look que "Ancho Sidebar") con badge de valor + Reset por control y reset global "Volver al ajuste de la plantilla"; 5 tiradores (Tamaño de lectura 8.0–11.5/0.5 pt; Diferencia títulos/texto 1.08–1.32; Tamaño de títulos de sección 0.75–1.20; Tamaño del Extracto 0.80–1.20; Espacio entre bloques 0.50–1.35). Fix adicional latente: `rounded-[${radius.control}]` (Tailwind no genera la clase dinámica, Regla 2) → `rounded-[10px]` en 2 sitios.
- **Bloque 2 (IA silenciosa)**: servidor `api/ai-generate.ts`: si la tarea espera JSON (`responseSchema`), valida/sanea en el servidor **antes** de responder 200 — `api/_lib/aiProviders/jsonRecovery.ts` (NUEVO): quita fences ```json, recorta del primer `{`/`[` al último `}`/`]`, devuelve `{ok, cleanText, value}`. JSON vacío/roto/truncado = **fallo recuperable** → `continue` a la siguiente clave del mismo proveedor → si se agotan, el siguiente proveedor (groq→gemini). NO usa `markKeyRateLimited`. Cliente `aiClient.ts`: `executeAiTask` reintenta hasta **3 intentos** con backoff 500/1200 ms, solo ante transitorios (status 0 red / 408 / 429 / 5xx o JSON inválido); 4xx no transitorio aborta de inmediato; reintentos **silenciosos** (el botón no cambia); `onRetry?` opcional; cartel de error solo si se agotan los 3. `tryParseAiJson` con fence-stripping.
- **Bloque 3 (mojibake UTF-8)**: 18 líneas con doble codificación en `presetCompositionInstances.ts` corregidas (NÚCLEO, Composición, Armónicas, Carmesí, Clásico Ejecutivo, Borgoña Noble, JÓVENES, Coral Neón, Cyber Índigo, Ámbar Solar, Navy Cónsul, Marrón Tabaco, Hielo Nórdico, Terracota Cálido, Carbón Monocromo, Jerarquías Tipográficas, Clásica Tradicional, Columna Única Completa, Disposición). Escaneo repo-wide (src/ api/ public/ tests/ scripts/) = 0 restos. Nuevo `tests/noMojibake.test.ts` (regresión).
- **Bloque 4 (defaults de CV nuevo)**: pestaña inicial de docType `cv` = **`importar_datos`** (3 puntos en `App.tsx`: useState inicializador, efecto de cambio de documento, `handleNewCV`). `createBlankCVTemplate`: defaults solo para docType `cv` inferido (`colorPresetId: 'hielo-nordico'` + `typographyOverrides` con enums ancla: `bodyPt 8.5, contrastScheme 'equilibrada', sectionHeadingScale 'chico', summaryScale 'compacto', densityMode 'compact'`); los overrides del caller siempre ganan; tarjetas/cartas/libros sin cambios. **Fix crítico descubierto en la implementación**: `sanitizeCvData` descartaba `typographyOverrides` en cada carga (mismo bug class que el histórico de `theme`, ya mitigado una vez en ese archivo) → ahora los preserva; sin esto el Bloque 4 era no-op y cualquier ajuste del usuario se perdía al recargar.
- **Tests**: 4 archivos nuevos (densityEngineContinuous 13, aiClientRetry 9, jsonRecovery 7, noMojibake 1). 46 tests focalizados verdes + suite completa vía `check-all` verde.
- **Versión**: V2.13.0 → V2.14.0 (MINOR; bump asentado dentro de la PR de código).
- **Protocolo merge (lección #101)**: `gh` y `git push --delete` timeoutean el pty a 120 s pero las escrituras SÍ se ejecutan; confirmar siempre con `gh pr list --head` / `git ls-remote --heads origin <rama>` (o la API vía MCP de GitHub) antes de reintentar. En esta PR, `gh pr create` timeouteó el pty pero el PR #101 ya estaba creado.
- **Ajuste conocido no aplicado (si Kalpa lo pide)**: `contrastScheme` escala niveles de forma absoluta (`body × factor × 2.2/1.3/1.1`); afinar a ratio relativo si los títulos quedan grandes en bodyPt alto. Opcional: limpieza de ramas locales viejas.
- **Pendiente histórico no bloqueante**: Kalpa — probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #103 - V2.14.1)
- **Merge confirmado**: PR #103 (`fix/ats-rule-target-tabs-blog-prose`) a `main` via squash. Hash: `92f9e574ec4af5facd8b03141910923762e284a6`. Mensaje: `fix(ats+blog): botones ATS con destino canónico y blog legible en los 4 temas (V2.14.1) (#103)`. Checks verdes en GitHub: `check-all` success (1 check-run en el commit squash).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1` = `92f9e57` (idêntico al squash de la API de merge); `main` local fast-forward limpio en ese hash antes de continuar con PR B; rama feature borrada (remoto y local).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión tras CI verde. La PR tocaba `src/shared/core/` (`recruiter-rules/ruleTargetTabs.ts`, núcleo compartido).
- **Contenido** (Partes 2+4 del plan integral aprobado sobre la auditoría de botones ATS y contraste del blog):
  - `src/shared/core/recruiter-rules/ruleTargetTabs.ts` (NUEVO): mapa canónico `resolveRuleTargetTab` (regla ATS → pestaña del panel editor) + `isValidPanelTab` + `FALLBACK_TAB`. Los modales ATS ("Ir a corregir" en pre-exportación y en el diagnóstico, y la "Guía ACR" apuntando a experiencia) ya no saltan a pestañas inexistentes (`experience`, `frase`) que dejaban el panel en blanco.
  - Rama `edit_section` del modal de pre-exportación conectada al mapa canónico (antes era un no-op/salto roto).
  - Blog: prosa vinculada a los tokens de tema vía `.prose-leecv` (en vez de `dark:prose-invert`, que obedece al SO y no al tema elegido); blog legible en los 4 temas; hover AA en títulos de artículos; ThemeToggleButton en el header del blog (V2.14.1).
- **Tests**: `tests/ruleTargetTabs.test.ts` (16 casos) + `tests/blogProseTheme.test.ts` (4 casos) verdes; suite completa `npm run check-all` EXIT=0.
- **Versión**: V2.14.0 → V2.14.1 (PATCH; bump asentado dentro de la PR de código).
- **Nota de proceso**: el registro docs de esta PR (paso 7 de la Regla 6) quedó pendiente por orden de ejecución (PR B #104 se abrió antes); se asienta ahora junto con el registro de #104 en esta misma PR docs.
- **Pendiente histórico no bloqueante**: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #104 - V2.15.0)
- **Merge confirmado**: PR #104 (`feat/applications-variant-flow`) a `main` via squash. Hash: `c21820e04dcaccab58f504c503b20973d30a93b8`. Mensaje: `feat(postulaciones): postulación independiente desde el CV base — motor único (V2.15.0) (#104)`.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `c21820e04dcaccab58f504c503b20973d30a93b8` (idéntico al squash devuelto por la API de merge); `main` local fast-forward `92f9e57..c21820e`; rama `feat/applications-variant-flow` borrada en local (`-D` seguro: squash) y en remoto (`git push origin --delete` timeouteó el pty a 120 s pero la escritura SÍ se ejecutó; confirmado con `git ls-remote --heads origin feat/applications-variant-flow` → 0 líneas, exit=0). Checks verdes: `check-all` success (commit squash), Vercel Preview + Deployment pass (observado en la PR).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Sí, mergeá PR B") tras CI verde y re-check previo (PR abierta, mergeStateStatus CLEAN). La PR tocaba `src/shared/core/documents/` (núcleo compartido).
- **Contenido** (Parte 1 del plan integral aprobado; V2.15.0 MINOR):
  - `src/shared/core/documents/applicationVariant.ts` (NUEVO, fuente única de verdad para clonar el CV como postulación): `buildApplicationVersionLabel` (`Puesto · Empresa` / provisional `Nueva postulación`), `isProvisionalApplicationLabel`, `isApplicationVariant`, `resolveBaseSourceTabId` (**`sourceCvTabId` siempre apunta al CV base original — nunca encadena A→B→C**), `buildApplicationVariantData` (reset de cuerpo de carta con `keptJobTarget`/`versionLabel` explícitas o reset), `computeApplicationRename` (auto-rename del label SOLO si es provisional), `createApplicationVariant` (orquestador: `saveAs` + `ensureDocumentTab` SIEMPRE; si falla storage no crea pestañas fantasma).
  - Flujo único `createApplicationVariantFor` en `App.tsx` (decisión aprobada: "Guardar copia" unificada con "Crear postulación" en la misma función, copia fiel: conserva carta y vacante, `goTo: 'keep'`). Los 6 puntos de entrada usan el mismo motor: Vacante (mini-formulario Puesto/Empresa + "Se llamará: …"), Carta bloqueada en CV base ("Crear postulación y escribir la carta"), banner de postulación en Diseño, menú "+" → Nueva postulación, botón "Carta" en Guardados (conserva `jobTarget` del CV elegido), "Guardar copia".
  - EditorPanel: tira de identidad `CV Base` / `💼 Postulación · <label>` con botón **Volver al CV Base**; pasa `onEditVacante` a la carta. JobTargetSection: banner de variante con Volver al CV Base; auto-rename en vivo del label provisional (`updateTabTitle` + `computeAutoDocumentTitle`); fix Regla 2 (`rounded-[${radius.control}]` → literal). ApplicationCoverLetterSection: botón **Editar vacante**. SavedCVsModal: chips `📄 CV Base` / `💼 Postulación: <label>` (solo contexto CV).
  - Aterrizaje inteligente: en **Vacante** si la copia no trae datos de oferta; en **Carta** si ya los trae. La pestaña de la copia se registra siempre (antes quedaba la barra apuntando al documento anterior).
- **Tests**: `tests/applicationVariant.test.ts` NUEVO (22 casos: labels, provisional, no-encadenamiento, construcción de datos, `computeApplicationRename`, orquestador con deps inyectadas). 42 tests focalizados verdes (22 + 16 ruleTargetTabs + 4 blogProseTheme). `npm run check-all` EXIT=0 local; CI `check-all` verde.
- **Versión**: V2.14.1 → V2.15.0 (MINOR; bump dentro de la PR de código).
- **Archivos afectados**: 8 (+612/−111): `applicationVariant.ts` (nuevo), `tests/applicationVariant.test.ts` (nuevo), `App.tsx`, `EditorPanel.tsx`, `JobTargetSection.tsx`, `ApplicationCoverLetterSection.tsx`, `SavedCVsModal.tsx`, `version.ts`.
- **Pendiente (Plan integral, Parte 3)**: PR C (V2.16.0) — Asistente Flotante + prompt IA (`app_guide_assistant`); incluir bloque de conocimiento sobre mover secciones entre columna principal ↔ barra lateral y cuáles convienen en la principal. Pendiente histórico no bloqueante: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-15] - Registro Regla 6 paso 7 (Post-merge PR #106 - V2.16.0)
- **Merge confirmado**: PR #106 (`feat/assistant-flotante-lidio`) a `main` via squash. Hash: `9013dfcd763e91e2f21b2e5eaf7d1ab1bad9f736`. Mensaje: `feat: asistente flotante Lidio en el editor (V2.16.0) (#106)`. Checks verdes: `check-all` local EXIT=0 (incluye 24 tests nuevos), CI GitHub `check-all` success (1m22s), Vercel Preview + Deployment pass.
- **Verificacion post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `9013dfc...` (identico al squash devuelto por la API de merge); `main` local fast-forward `6178aaa..9013dfc`; rama `feat/assistant-flotante-lidio` borrada en local (`-d` seguro: squash, trabajo ya en `main`) y en remoto (`git push origin --delete` timeouteo el pty a 180 s pero la escritura SI se ejecuto; confirmado con `git ls-remote --heads origin feat/assistant-flotante-lidio` = 0 lineas).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("Aprobado (recomendado)") tras CI verde. La PR tocaba `src/shared/core/` (assistant, ai, icons, iconCatalog, version) y `api/_lib/` (catalog.ts).
- **Contenido** (Parte 3 del plan integral, V2.16.0 MINOR): asistente flotante **Lidio** en el editor (zona app; nunca landing/blog). FAB esquina inferior derecha; panel con tabs Tips/Preguntar.
  - Tips 100% LOCALES (cero IA): por pestaña + transversales, inactividad ~20 s primer tip / ~90 s siguientes, max 3 por sesion (sessionStorage), silenciable con checkbox, estado en localStorage `leecv.assistant`. Incluye el bloque de conocimiento de columnas aprobado: Columna Principal (derecha, lectura prioritaria) vs Barra Lateral (izquierda, escaneo rapido); Experiencia/Resumen/Objetivo SIEMPRE en la principal; Habilidades/Idiomas/Informatica/Cursos/Redes en la sidebar; candado en Certificados y Firma (van al final por formato).
  - Chat IA solo ante pregunta explicita: tarea `app_guide_assistant` (OpenAPI 3.0, `required:['answer']`, suggestedActions sin nullable — patron Gemini); respuesta `{answer, suggestedActions?}`; acciones filtradas con `filterSuggestedActions` (descarta targetTabs inventados, conserva label, max 2) y CTAs validadas con `isValidPanelTab` que navegan via `changeActiveTab`. Sin `cvData` en el payload (no se envia PII). Footer estandar "Respuestas generadas por IA...". `prefers-reduced-motion` respetado; `print:hidden`.
  - Motores canonicos: `isValidPanelTab` (ruleTargetTabs.ts), iconCatalog/ICON_REGISTRY (icono `assistant`, unicidad verificada), tokens CSS `var(--*)`, Regla 2 sin colores dinamicos, lenguaje sencillo zona app.
- **Fix de contraste aplicado**: avatar en `accent-muted`/`accent-text` (antes `accent-base` emparejaba el tagline contra #FF2E63 en el bgStack del auditor); `check-contrast` = 0 violaciones nuevas.
- **Version**: V2.15.0 -> V2.16.0 (MINOR; bump dentro de la PR de codigo).
- **Archivos afectados**: 10 (+968/-5): `assistantTips.ts` (NUEVO), `FloatingAssistant.tsx` (NUEVO), `tests/assistantTips.test.ts` (NUEVO), `catalog.ts`, `aiClient.ts`, `iconRegistry.ts`, `iconCatalog.ts`, `EditorPanel.tsx`, `index.css`, `version.ts`.
- **Pendiente historico no bloqueante**: Kalpa — probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fase 0 PR #108)
- **Merge confirmado**: PR #108 (`fix/book-covers-negras`) a `main` via squash. Hash: `f028cab679641fd79b8580e0272ea04221eec4ec`. Mensaje: `fix: tapas y contratapas negras en canvas + miniatura a 320px (Fase 0 motor editorial) (#108)`. Checks verdes en GitHub: `check-all` success (run 43757896513, 1m17s), Vercel pass.
- **Contenido (Fase 0 Motor Editorial)**: `canvasColors.ts` (NUEVO): paleta canónica de colores de canvas para las tapas; `impositionEngine.ts` la consume; `BookCoverStep.tsx`, `BookBackCoverStep.tsx` y `CoverPreviewThumbnail.tsx` alineados (miniatura a 320px); `ui-tokens-allowlist.json` +4 tokens; `tests/book-engine/canvasColors.test.ts` NUEVO. Difencial: 7 archivos (+330/−76).
- **Verificación post-merge**: hash visto en `git log origin/main` (`f028cab`); rama de trabajo `feat/book-asset-memory` partió de este punto.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fases 1-2 PRs #111 y #110)
- **Merge #111 confirmado** (`feat/book-asset-memory`, Fase 1): `main` ← hash `2caa8d2c973001ae75958f699a5719a3e1720bd9`. Mensaje: `feat: memoria local del PDF y biblioteca de imagenes en IndexedDB (Fase 1)`. CI `check-all` success (run 43772475492, 1m18s), Vercel Preview + Deployment pass.
- **Merge #110 confirmado** (`perf/book-render-3-niveles`, Fase 2): `main` ← hash `f34dde1b5b3b39fb94c899359204dff9ad56a6b8`. Mensaje: `perf: rendimiento de la grilla de miniaturas y lightbox (Fase 2)`. CI `check-all` success (run 43808938339, 1m4s), `mergeStateStatus: CLEAN`, Vercel pass (invocación a los ~8 min del push del commit vacío de disparo).
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` igualó la API en ambos casos (`2caa8d2`, luego `f34dde1`).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("mergea todo") tras CI verde en cada PR. #111 tocaba `src/shared/core/` (librería de assets en IndexedDB) → aprobación de CODEOWNER requerida y otorgada.
- **Nota de proceso (PRs apiladas)**: la cadena era #111 → #110 → #112 con bases apuntando la una a la otra. Al mergearse #111, las bases de #110 y #112 se re-apuntaron a `main` (`gh pr edit --base main`); como `.github/workflows/check-all.yml` solo corre con `pull_request: branches: [main]`, se pushearon commits vacíos ("chore: disparar check-all...") para forzar el evento `synchronize`. NUNCA se usó `--delete-branch` en merges de PRs apiladas. Un cambio de base por sí solo NO relanza el workflow (el evento `edited` no está en el set por defecto).

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Fases 3-4 PR #112 — V2.17.0)
- **Merge #112 confirmado** (`feat/book-imposition-math`): `main` ← hash `e54a1a84c30d350e7c44e371be72b1dad7078983`. Mensaje: `feat: matematica de impresion editorial (Fase 3+4)`. CI `check-all` success (run 43813771767, 54s), `mergeStateStatus: CLEAN`, Vercel pass.
- **Verificación post-merge**: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `e54a1a84c30d350e7c44e371be72b1dad7078983` (idéntico al squash devuelto por la API de merge).
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("sigue y mergea todo hasta el fin, adelante avanza") tras CI verde. La PR tocaba `src/shared/core/book-engine/` (núcleo compartido) → aprobación de CODEOWNER requerida y otorgada.
- **Contenido (Fases 3+4, Motor Editorial InDesign del Book Studio)**:
  - Fase 3 parte 1 (`430d0c0`): `impositionPlanner.ts` (NUEVO, +353) — `getSignatureSheetPairs(len, offset, readingDirection)` (pareo espejado LTR/RTL), `planBookletSignatures` (cuadernillos de 4/8/16 hojas, armado cortar-y-apilar), `calculateSpineWidth`, `calculateCreepOffset`, `checkHomePrinterMargins`.
  - Fase 3 parte 2 (`6ad1014`): UI paso «Armado y Guías» (cubierta, lomo, creep y estilo de exportación) en `BookImpositionStep.tsx`.
  - Fase 3 parte 3 (`c8fd134`, `e4bf0c2`, `776c1cb`, `db46971`): `impositionEngine.ts` (+501) — camino vectorial en `processBookImposition` (`copyPages` sin rasterizar para modo normal sin rotaciones ni cortes), integración de opciones (lomo, creep, destino, estilo), guías de armado dibujadas en la hoja (línea de doblez, margen de seguridad, líneas guía para recortar (marcas de corte)), destinos B (cubierta aparte) y C, ZIP por cuadernillo. Tests de integración headless `tests/book-engine/processBookImposition.test.ts`.
  - Fase 4 (`abe6abc`): perfil de impresora casera con `unprintableMarginMm` (0 = imprimir hasta el borde; escala el contenido con `effectiveMarginPt`), `readingDirection` RTL/LTR (invierte el pareo de dos en dos por `getSignatureSheetPairs(..., 'rtl')` + contenedores `dir="rtl"` en pasos 6 y 7), resumen pre-impresión ampliado, Botón 2 «Descargar el PDF original (tal cual lo subiste)» visible solo en modo normal y sin consumir crédito, prop `setOptions` en `BookPreviewExportStep` cableada en `BookStudioContent.tsx`. Tests: +3 casos RTL en `impositionPlanner.test.ts` (58/58 book-engine verdes).
- **Lección de proceso (stacked PR + squash en serie)**: al mergear #110 por squash, #112 quedó marcada `CONFLICTING` (`mergeStateStatus: DIRTY`) porque su historia incluía los commits originales de #110, ahora duplicados en `main` con hash distinto. Se resolvió con `git rebase origin/main` (Git descartó automáticamente los duplicados: "skipped previously applied commit 550a1b2") sin conflictos de contenido, y `git push --force-with-lease`. Resultado: la rama quedó con solo sus 13 commits propios (diferencial definitivo +1587/−79 en 11 archivos) y CI verde en 54s.
- **Versión**: V2.16.0 → V2.17.0 (MINOR; los 4 merges del motor editorial omitieron el bump — precedente PR #96: se asienta en esta PR docs, en el mismo PR que registra los merges).
- **Plan integral Motor Editorial InDesign (Fases 0-4): COMPLETO y en producción.** `main` final = `e54a1a84c30d350e7c44e371be72b1dad7078983`. Fases 1 (#111), 2 (#110), 3+4 (#112) mergeadas el 2026-11-16 con CI verde en cada una; Fase 0 (#108) el 2026-11-15.
- **Pendiente histórico no bloqueante**: Kalpa - probar Editor → Importar CV con IA con PDF de 2 columnas y escaneado. Pendiente NUEVO (post-sesión): probar el Book Studio completo en producción (armar un libro de 16-32 páginas con tapa envolvente, JPG por cuadernillo y ZIP).

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge Lidio macOS-style PR #114 - V2.18.0)
- **Merge #114 confirmado** (`feat/lidio-macos-notifications`): `main` → hash `182a1af91088a9fe37dbd18a489d8124bec2982d`. Mensaje (squash): `feat(lidio): notificacion toast macOS y rediseño minimal del asistente (#114)`. CI `check-all` success (run 43894628802, 1m10s), Vercel pass. Verificado post-merge: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `182a1af91088a9fe37dbd18a489d8124bec2982d` (idéntico al squash devuelto por la API de merge).
- **Incidente GitHub en la ventana del merge**: desde las 11:59 UTC hay un incidente activo ("Incident with Pull Requests", githubstatus.com - timeouts elevados de merge ~4.75% vs 0.2% baseline; Actions también degradado). El primer `gh pr merge --squash` devolvió 502 y luego 405 `Merge already in progress`; los reintentos manuales por API seguían devolviendo 502. El merge se completó al reintentar tras la ventana de incidente (`PUT /repos/kalpa-droid/LEECV/pulls/114/merge` → `merged:true`, sha `182a1af9…`). Cero cambios de código.
- **Autorización CODEOWNER**: Kalpa dio OK explícito en sesión ("Aprobá y mergeá (squash)") tras CI verde. La PR tocaba `src/shared/core/` (assistantTips.ts, iconRegistry.ts, iconCatalog.ts) y `api/_lib/` (catalog.ts) → aprobación requerida y otorgada.
- **Contenido** (V2.18.0, MINOR): NUEVO `AssistantNotificationToast.tsx` (ritmo macOS: ~9s auto-descarte, pausa en hover/focus, cola sutil apuntando al FAB, backdrop-blur, acciones solo-ícono Ir(ArrowUpRight)/Silenciar(BellOff)/Cerrar(X), `role="status"`, `print:hidden`, `.ui-assistant-notif-enter/exit` con `cubic-bezier(0.22,1,0.36,1)`); `FloatingAssistant.tsx` rediseñado (SIN tagline en UI; header limpio con mute Bell/BellOff `aria-pressed`; tabs solo-ícono Lightbulb/MessageCircleQuestion; toggle List con badge `{vistos}/{total}`; 3 chips rápidos en chat; puntos "escribiendo" `.ui-assistant-typing-dot`); `app_guide_assistant` enriquecida (conocimiento V2.17.0: portada, 6 formatos regionales, tiradores/cascada de diseño, secciones a medida, importar CV, privacidad por campo, candados, flujo CV → Vacante → Postulación → Carta, ATS en vivo; `<editorState>` estructural SIN PII — isBaseCV, activeFormatId, visibleSections, hasVacante, atsScore; `<history>` últimos 4 turnos escapados como datos; regla anti-inyección; responseSchema OpenAPI 3.0 SIN cambios); `assistantTips.ts` (`buildAssistantEditorSnapshot(cvData, activeTab, atsScore?)` sin PII vía `isApplicationVariant`/`resolveActiveFormatId`/`layout.sectionOrders`/`sectionVisibility`; set de tips enriquecido); `index.css` (`.ui-assistant-pop`, notif enter/exit, typing dots; todos deshabilitados bajo `prefers-reduced-motion`); `iconRegistry.ts` +10 íconos de acción con trazados únicos (list, book, bell, bellOff, messageCircle, send, rotateCcw, arrowUpRight, x, lightbulb — messageCircle reescrito para no duplicar `assistant`); `UI_ICON_IDS` registra los 10 y restaura `assistant`; `EditorPanel`/`App.tsx` reenvían `atsLiveScore` hasta Lidio.
- **Tests**: 575 passed (asistente 34/34: motor de tips + contrato OpenAPI de `app_guide_assistant` + unicidad de íconos); `npm run check-all` EXIT=0 local; CI GitHub `check-all` success en PR #114 (1m10s).
- **Versión**: V2.17.0 → V2.18.0 (MINOR; el bump se asienta en esta PR docs, precedente V2.17.0).
- **Diferencial PR #114**: 9 archivos, +582/-269. `tsconfig.tsbuildinfo` e `install-windows.ps1` excluidos (artefactos; nunca commitear).
- **Pendiente NUEVO**: Kalpa — probar Lidio en producción (toast de inactividad, chat, acciones sugeridas, silenciado y badge). Pendiente histórico no bloqueante: Editor → Importar CV con IA con PDF escaneado / 2 columnas. Pendiente del Book Studio: armar un libro de 16-32 páginas.

## [2026-11-16] - Registro Regla 6 paso 7 (Post-merge pulido visual Lidio PR #116 - V2.18.1)
- **Merge #116 confirmado** (`feat/lidio-panel-polish`): `main` -> hash `027d7be50b8cbfcf19963ec7aa674af660f0dd09`. Mensaje (squash): `fix(lidio): compactar banda de tabs y enriquecer estado vacio de tips (#116)`. CI `check-all` success (run 43906745681, 54s), Vercel pass. Verificado post-merge: `git log origin/main -1 --format="%H %s"` = `027d7be50b8cbfcf19963ec7aa674af660f0dd09` (identico al squash de la API).
- **Autorizacion**: Kalpa dio OK explicito en sesion ("Mergea vos (squash)") tras CI verde. La PR solo tocaba `src/modules/cv-builder/components/FloatingAssistant.tsx` (sin `src/shared/core/` ni `api/_lib/` -> no requeria CODEOWNER formal).
- **Contenido (pulido visual post V2.18.0)**: banda de tabs icon-only compacta (`py-2` -> `h-9` fija, 36px - dejaba de verse como losa oscura); estado vacio de Tips convertido en mini-tarjeta con acciones visibles ("Ver todos los tips" / "Preguntarle a Lidio"); stack del contenido mas denso (`space-y-2.5`). Sin cambios de logica, motor de tips ni IA. Diferencial: 1 archivo (+11/-6).
- **Version**: V2.18.0 -> V2.18.1 (PATCH; ajuste UI minimo - asentada en esta PR docs, precedente V2.17.0).
- **Pendiente NUEVO**: Kalpa - probar el panel pulido en produccion (tabs compactos, estado vacio accionable). Pendientes previos sin cambios.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fases 1+2 Book Studio PR #118)
- **Merge #118 confirmado** (`fix/book-studio-lidio-integration`, head `634845c`): `main` -> hash `c310c2e6b689d549af84d4e5229ea468de50b09f`. Squash msg: `fix(book-studio): origen PDF hibrido con fallback + instancia unica de pdf.js (F1+F2) (#118)`. CI `check-all` success (run 43940040133, 49s), Vercel pass. Verificado post-merge: `git fetch origin` + `git log origin/main -1 --format="%H %s"` = `c310c2e6...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("ok sigue") tras CI verde. La PR tocaba `src/shared/core/` (capabilityRegistry.ts, bookAssetManager.ts, impositionEngine.ts) -> aprobacion de CODEOWNER requerida y otorgada.
- **Contenido (F1+F2)**: `capabilityRegistry.ts` presets `libro-*`/`book` -> 'book' (App.tsx guarda `lastCreatedTabIdRef`); `bookAssetManager.ts` `canUseNativeFilePicker()` + `pickSourcePdf()` tipado `picked|cancelled|fallback-required`; `BookSourceTypeStep.tsx` `triggerPick` unico + input off-screen siempre montado + tarjeta clickeable; `BookStudioContent.tsx` `loadSourcePdf()` instancia unica pdf.js + `persistBookState(file, opts, pageCount)` (eliminado `handleFileSelect`); `PdfPreviewStrip.tsx` error visible + "Probar con otro PDF" + thumbs por `assetId`; `impositionEngine.ts` cMapUrl `/cmaps/` local -> CDN -> sin cMaps (3 retries con `pdfBytes.slice()`); `scripts/copy-pdfjs-cmaps.mjs` + `prebuild`; `public/cmaps/` gitignored. Tests: `tests/capabilities/capabilityRegistry.test.ts` (nuevo), `bookAssetManager.test.ts` actualizado.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fase 3 paridad tapa/contratapa PR #119)
- **Merge #119 confirmado** (`fix/book-tapa-contratapa-parity`, head `d8971a5` rebaseado sobre main post-#118): `main` -> hash `2e22ece79ff02653466eab842776fa1e5d393081`. Squash msg: `fix(book-studio): paridad tapa/contratapa y fin de la hoja en blanco fantasma (#119)`. CI `check-all` success (run 43955639355, 1m20s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `2e22ece...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("ok sigue") tras CI verde. La PR tocaba `src/shared/core/book-engine/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 3)**: fix retiro fantasma (`blankInFrontBackCover` solo si `backCoverCanvas` existe); `bookPageCount.ts` reescrito (`FinalBookPageCountInput`, `hasCustomCoverConfig()`, `effectiveSourcePageCount()`, `calculateFinalBookPageCount()` con sobrecarga legada conservada y replicacion exacta del armado del motor, verificado numericamente en 9 escenarios); callers `BookOrganizeStep`/`BookPreviewExportStep` pasan input object completo; UI paridad (`BookCoverStep` 4 tarjetas + "Sin Tapa"; `BookBackCoverStep` presets COVER_PRESETS + publisher + imageFit + aspect 1/1.41); tests `bookPageCount.test.ts` (nuevo, 22 asserts) + 2 casos headless en `processBookImposition.test.ts`. Suite book-engine 54/54 verde.
- **Leccion de proceso (base avanzada entre PRs apiladas)**: al mergear #118 primero, #119 quedo `BEHIND`; se rebaseo `fix/book-tapa-contratapa-parity` sobre `origin/main` (sin conflictos, regiones disjuntas en impositionEngine.ts) + `push --force-with-lease` antes del merge. Stash intermedio del handoff de CONTEXT.md para permitir el rebase; pop posterior limpio.

## [2026-11-16] - Regla 6 paso 7 (Post-merge Fase 4 PR #120)
- **Merge #120 confirmado** (`feat/book-studio-fase-4`, head `23ae9d9` ya en remote): `main` -> hash `38dd91fcd45a8ead5c22aabb960cb6f5e4ae9b02`. Squash msg: `fix(book-studio): flujo pasos 1-7 coherente y catalogo i18n alineado (Fase 4) (#120)`. CI `check-all` success (run 43963418594, 1m15s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `38dd91f...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR toca `src/shared/i18n/` y `src/modules/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 4)**: `src/shared/i18n/catalog/bookStudio.ts` reescrito alineado 1:1 con `BOOK_STEP_SEQUENCE` (1 Origen … 7 Exportar; seccion `paperStep` huerfana eliminada; `nextStep*` corregidos: paso 5 apuntaba a "6. Exportar", ahora "Siguiente: 6. Armado y Guías"); migracion mecanica de labels hardcodeados a `t.bookStudio.*` en los 7 steps (BookImpositionStep 28, BookFoliadoStep 8, BookCoverStep 3, BookBackCoverStep 3, BookOrganizeStep 2, BookPreviewExportStep 1, BookSourceTypeStep 1; BookImpositionStep y BookFoliadoStep ahora usan `useText`); cero labels de navegacion hardcodeados restantes; `tests/i18n/bookStudio.test.ts` nuevo (5 casos). Copy de campos de cuerpo deja hardcodeado a proposito (deuda anotada en handoff).
- **Siguiente paso recomendado**: Fase 5 (Lidio en Book Studio): rama nueva desde `main` (`38dd91f`); extender `assistantTips.ts` (`AssistantDocType`, keys de storage por docType, `BOOK_TAB_TIPS`/`BOOK_ALWAYS_TIPS` con destinos `book_*`, `validateAssistantTargetTab` 3er parametro opcional `docType`, `buildAssistantEditorSnapshot` soporte book sin PII); `FloatingAssistant.tsx` (prop `docType`, QUICK_QUESTIONS por docType, snapshot por docType); montar en `BookStudioContent.tsx`; extender `app_guide_assistant` en `api/_lib/aiTasks/catalog.ts:489-583` con bloque Book Studio (responseSchema OpenAPI 3.0 sin cambios, cero PII) + chips Lidio book; tests de tips/destinos `book_*`.
- **COMPLETADO**: ver entrada post-merge Fase 5 PR #121 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Fase 5 PR #121)
- **Merge #121 confirmado** (`feat/lidio-book-studio-fase-5`, head `e8d9a80f0e806350e00f4e684b3fc565e41240cf` — commits `56e93c8` + `e8d9a80`): `main` -> hash `3bc95793bb4026adec508d62bb4bd13d3036f008`. Squash msg: `feat(book-studio): Lidio en Book Studio (Fase 5) (#121)`. CI `check-all` success (run 43997760657, 56s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `3bc95793...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR toca `src/shared/core/` y `api/_lib/` -> aprobacion requerida y otorgada.
- **Contenido (Fase 5)**: `assistantTips.ts` (AssistantDocType 'cv'|'book'; storage keys por docType `leecv.assistant.book` / `leecv.assistant.session.book`; `BOOK_TAB_TIPS`/`BOOK_ALWAYS_TIPS`/`ALL_BOOK_TIPS` con destinos `book_*` reales de BOOK_STEP_SEQUENCE; `buildAssistantBookSnapshot` estructural sin PII; `validateAssistantTargetTab` 3er param docType validando contra la secuencia real; `getTipsForTab`/`pickNextTip`/`filterSuggestedActions` con docType); `FloatingAssistant.tsx` (prop `docType` default 'cv' + `bookOptions`; `QUICK_QUESTIONS_BY_DOC`; storage/loadState por docType; `editorState` book; header y copy de bienvenida del chat por docType); `BookStudioContent.tsx` monta `<FloatingAssistant docType="book" activeTab={activeStepTab} onNavigate={setActiveStepTab} bookOptions={options} />`; `catalog.ts` `app_guide_assistant` con pasos `book_*` + "FLUJO TIPICO BOOK STUDIO" + editorState book documentado + hint en `buildUserPrompt` (responseSchema OpenAPI 3.0 INTACTO; cero PII); `tests/assistantTipsBook.test.ts` NUEVO (12 casos). Verificacion local: `tsc` 0 errores, `vitest` 41/41, `check-all` EXIT=0.
- **Siguiente paso recomendado**: Docs PR final con bump V2.19.0 (MINOR) en `src/shared/core/version.ts` (plan de 5 fases COMPLETO: Fases 1-4 en #118/#119/#120, Fase 5 en #121).
- **COMPLETADO en rama `docs/release-v2.19.0`**: ver entrada Docs PR V2.19.0 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Docs PR V2.19.0 — cierre del plan Book Studio/Lidio)
- **Version**: V2.18.1 -> V2.19.0 (MINOR; 5 fases del plan Book Studio/Lidio entregadas: #118 Fases 1+2, #119 Fase 3, #120 Fase 4, #121 Fase 5). Bump en `src/shared/core/version.ts` (minor 19, label V2.19.0, lastUpdated 2026-11-17, stage con resumen de las 5 fases). Rama `docs/release-v2.19.0` desde `main` `3bc95793`. Incluye asiento post-merge de #121 en SESSION_LOG.md y en `.opencode/CONTEXT.md`.
- **Verificacion**: `npm run check-all` EXIT=0 (corrida local en esta sesion); cambios sin comportamiento nuevo (docs/versionado).
- **Siguiente paso recomendado**: CI verde en la PR -> OK CODEOWNER de Kalpa (toca `src/shared/core/version.ts`) -> squash-merge sin `--delete-branch` -> verificar hash post-merge -> registrar aqui.
- **COMPLETADO**: ver entrada post-merge Docs PR #122 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Docs PR #122 - V2.19.0 en produccion)
- **Merge #122 confirmado** (`docs/release-v2.19.0`, head `fd2335f` ya en remote): `main` -> hash `dec82a03fa021f183dc95459decee218e76eca9c`. Squash msg: `docs(release): V2.19.0 — cierre del plan Book Studio/Lidio (#122)`. CI `check-all` success (run 44009832828, 1m29s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `dec82a03...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion (pregunta en chat tras CI verde). La PR tocaba `src/shared/core/version.ts` -> aprobacion requerida y otorgada.
- **Contenido**: bump MINOR V2.18.1 -> V2.19.0 en `src/shared/core/version.ts` (stage resume las 5 fases: PR 118/119/120/121); asientos en `SESSION_LOG.md` + `.opencode/CONTEXT.md`. Plan Book Studio/Lidio de 5 fases COMPLETO y en produccion.
- **COMPLETADO**: ver entrada post-merge Docs PR #123 al final de este archivo.

## [2026-11-17] - Regla 6 paso 7 (Post-merge Docs PR #123 — asiento final del ciclo V2.19.0)
- **Merge #123 confirmado** (`docs/handoff-v219-post-merge`, head `9cfb8a7` ya en remote): `main` -> hash `e5b4561c4532c559da00a60dc842ea9e1b6d027e`. Squash msg: `docs(handoff): post-merge V2.19.0 (PR #122) en SESSION_LOG y CONTEXT (#123)`. CI `check-all` success (run 44011586324, 1m22s), Vercel pass. Verificado post-merge: `git log origin/main -1` = `e5b4561c...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`).
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion. La PR era docs-only (no tocaba nucleos) -> aprobacion otorgada igual por consistencia de proceso.
- **Contenido**: asiento de post-merge de #122; `SESSION_LOG.md` y `.opencode/CONTEXT.md` quedan con el ciclo completo cerrado.
- **Ciclo cerrado**: plan Book Studio/Lidio 5 fases (#118, #119, #120, #121) + release V2.19.0 (#122) + asientos de handoff (#123). `version.ts` = V2.19.0; `main` = `e5b4561c`.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #125 - deuda de copy i18n del Book Studio)
- **Merge #125 confirmado** (`feat/book-studio-i18n-body-copy`, head `968cac060fcccd4e93b21cb36cee7010a6ebac5c`): `main` -> hash `434ebd272548eebf82f384976143103102dd143f`. Squash msg: `feat(book-studio): migra campos de cuerpo hardcodeados al catalogo i18n (#125)`. CI `check-all` success (run 44022173471, 1m19s), Vercel pass, Vercel Preview Comments pass. Verificado post-merge: `gh pr view 125 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` = `434ebd27...` (identico al mergeCommit de la API). Rama NO borrada (sin `--delete-branch`). PR: https://github.com/kalpa-droid/LEECV/pull/125. `main` local fast-forward `c62d308..434ebd2`.
- **Autorizacion CODEOWNER**: Kalpa dio OK explicito en sesion ("si") tras CI verde. La PR no tocaba nucleos (`src/modules/book-studio/` + `src/shared/i18n/`) -> no requerida formalmente, aprobada igual.
- **Contenido**: cierre de la deuda de copy de la Fase 4 - ~100 strings visibles de steps y componentes internos del Book Studio migradas al catalogo i18n `t.bookStudio.*` (`src/shared/i18n/catalog/bookStudio.ts`, tipado por `typeof`: falta de clave = error de TS). 12 archivos (+387/-178): `BookCoverStep`, `BookBackCoverStep`, `BookFoliadoStep`, `BookOrganizeStep`, `BookPreviewExportStep`, `BookSourceTypeStep`, `BookStudioContent`, `components/PdfPreviewStrip`, `LightboxModal`, `ThumbnailCard`, `CoverPreviewThumbnail` + catalogo. Copy verbatim (incluido tuteo preexistente) salvo 3 cambios de fondo documentados en la PR: `emptyDescription` `"1. Cargar PDF"` -> `"1. Origen"` (referencia obsoleta), `metricSheets` `'Pliegos'` -> `'Hojas'` (exigido por el escaner de lenguaje sencillo), `generatingPdf` alineada a `'Generando PDF de Imprenta...'`. Tokens `{name}|{count}|{pdf}|{book}|{active}|{deleted}|{side}|{mm}|{sheets}|{page}|{max}` via `.replace()` encadenados. Sin cambios de logica, `BOOK_STEP_SEQUENCE` ni `responseSchema` OpenAPI. Bug propio detectado y corregido en revision de diff: `title="{t.x}"` (string literal con llaves) -> `title={t.x}` en `ThumbnailCard.tsx` (8 casos).
- **Version**: sin bump (migracion mecanica; `version.ts` sigue V2.19.0). Tests: 611 passed; `check-all` EXIT=0 local y en pre-push; lenguaje sencillo 0 violaciones.
- **Corte de la recursion de PRs docs**: las sesiones previas encadenaban una docs PR por cada asiento (#123 asentaba #122, #124 asentaba #123...). Esta sesion asienta #124 y #125 solo en `SESSION_LOG.md` + `.opencode/CONTEXT.md` **sin abrir PR de asiento**; los cambios quedan en el working tree para que la proxima PR de trabajo real los lleve.
- **Deuda fuera de scope (documentada en la PR)**: default prop `documentTabs` de `BookStudio.tsx` (`'Libro Principal'`) sigue hardcodeado - no era un step ni estaba en el plan aprobado.
- **Pendiente NUEVO**: Kalpa - probar el Book Studio en produccion (todos los steps con copy desde el catalogo; verificar en ingles/locales si aplica). Pendientes previos sin cambios: Lidio en Book Studio en produccion; Importar CV con IA con PDF escaneado/2 columnas.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #126 - firma vacia + hojas fantasma del CV)
- **Merge #126 confirmado** (`fix/firma-vacia-y-pagina-fantasma`, head `fc602d9`): `main` -> hash `3c22fa65272dd943450f3cdcf63b611b2b8f92ec`. Squash msg: `fix(cv): firma digital visible con datos personales + cero hojas fantasma en blanco (#126)`. CI `check-all` success (run 44029212655, 1m12s), Vercel pass. Verificado post-merge: `gh pr view 126 --json mergeCommit` + `git fetch origin && git log origin/main -1` = `3c22fa65...` (identico). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/126.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("ok") tras CI verde.
- **Contenido**: 2 bugs reproducidos con render real + PDF.js ground truth. (1) Firma vacia: el guard de `cvDataAdapter.ts` exigia `signature.dataUrl || signature.signerName`, pero el sanitizador solo hidrataba ese nombre desde `personalInfo.fullName` (legacy) -> con esquema moderno (givenNames/surname) la firma JAMAS aparecia. Fix: firma emitida con nombre real resuelto EN VIVO (nunca 'Postulante'), `signature?.dataUrl` (TypeError con signature undefined), `cvDataSchema.ts` intacto (el nombre nunca se congela). (2) Hoja fantasma: el marginBottom terminal del ultimo registro de cada sector arrastraba una caja casi vacia a una pagina nueva (0 textos, solo fondos con minHeight 100%). Fix: flag `isTrailingRecord` (ultima seccion x ultimo registro por sector) anulando el margen final en CardObjectRenderer, quote-text, course, social-link, skill, languages, contact-item y qr + keys deterministas (sin Math.random()).
- **Validacion**: `tests/cvDataAdapterFirma.test.ts` (NUEVO, 10 casos) + `scripts/verify-firma-and-blank-pages.tsx` (NUEVO, wireado a `check-all` como `verify:firma-and-blank-pages`: 16 verificaciones - 9 firma + 7 renders headless con 0 paginas sin texto; antes el baseline reproducia 1 hoja fantasma). 9 archivos, +406/-31. Sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE.
- **Comportamiento nuevo intencional**: todo CV con nombre y firma visible muestra el bloque de firma (con o sin imagen dibujada).
- **Deuda documentada fuera de alcance**: registro individual mas alto que una pagina queda recortado (`wrap={false}` atomico en TemplateRenderer) - candidato a PR siguiente.
- **Pendiente NUEVO**: Kalpa - verificar en produccion: firma visible con datos personales (sin dibujar firma) y CV denso sin hoja en blanco al final.

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #127 - Lidio siempre con tip + PDFs problematicos)
- **Merge #127 confirmado** (`feat/lidio-siempre-con-tip-y-pdf-problematicos`, head `795596d`): `main` -> hash `b0e212b0793f5a90daf8a7cdcd29b0f6cd58eea8`. Squash msg: `feat(lidio+book): Lidio siempre con tip + PDFs problematicos con aviso, contraseña y rescate a imagenes (#127)`. CI `check-all` success (run 44034697699, 1m30s), Vercel pass. Verificado post-merge: `gh pr view 127 --json mergeCommit` + `git fetch origin && git log origin/main -1` = `b0e212b...` (identico). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/127.
- **Autorizacion**: Kalpa dio OK explicito x2 en sesion tras CI verde ("ok" / "ok").
- **Contenido**: (1) Lidio SIEMPRE CON TIP: `pickAlwaysTip` (nunca null: pestaña -> transversales -> repaso rotativo con afterTipId) y `pickNextTipCycled` (avance manual circular). FloatingAssistant: tip resuelto AL INSTANTE al abrir el panel o entrar a la vista Tips (antes esperaba 20s y podia quedar vacio); boton "Otro tip"; "Entendido" precarga el siguiente en el panel; cerrar el panel libera el tip (el flujo automatico sigue con tope 3/sesion); el repaso rota desde el ultimo tip mostrado. 3 tips nuevos (creep, doble cara/borde corto, guias de armado/marcas de corte). (2) PDFs problematicos: nuevo modulo puro `pdfSourceClassifier.ts` (PdfSourceError con codigos estables empty-file/password/corrupt/missing/empty-pdf/unknown, clasificados por err.name y file.size===0); `loadSourcePdf` valida 0 bytes y numPages===0 y no marca selectedFile hasta el exito; contraseña de apertura con cuadro INLINE (sin window.prompt) retenida SOLO en memoria de sesion y pasada como parametro explicito al motor (JAMAS en options persistidas); proteccion contra edicion detectada con pdf-lib (ignoreEncryption) en la carga -> conmutacion AUTOMATICA a exportMode 'raster' + avisos en pasos 1, 6 (selector bloqueado) y 7; red de seguridad en el camino vectorial (mensaje de rescate). Avisos en lenguaje sencillo por codigo.
- **Validacion**: tests extendidos (+14 en assistantTips/assistantTipsBook), `tests/pdfSourceClassifier.test.ts` NUEVO (10 casos), `scripts/verify-lidio-and-pdf-errors.tsx` NUEVO wireado a check-all (`verify:lidio-and-pdf-errors`, 28 verificaciones). 16 archivos, +937/-29. Sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE. Incluyo los asientos de handoff de #126.
- **Pendiente NUEVO**: Kalpa - probar en produccion: abrir Lidio con tips agotados (debe mostrar tip igual), boton "Otro tip", y Book Studio con un PDF protegido con contraseña + uno protegido contra edicion. Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja en blanco al final; Book Studio en produccion (steps con copy desde el catalogo; verificar en ingles/locales si aplica); Importar CV con IA con PDF escaneado/2 columnas.
- **Siguiente paso (PR 2b, aprobada en el plan)**: rediseño visual del paso 6 BookImpositionStep (botones rapidos casa/imprenta, destinos A/B/C con mini-diagramas SVG, grosor en tarjetas + pill de lomo en vivo, switches, botones segmentados calidad/lectura, QUITAR `dir={rtl}` del formulario, coverStyle `<input type="text">` crudo por selector de presets, preview de imposicion lineal vs pares "Pares de hoja doblada").

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #128 - rediseño visual paso 6 + preview doblada)
- **Merge #128 confirmado** (`feat/book-step6-visual-redesign`, head `30a754c`): `main` -> hash `dff87ac8261005f65d2cb3d552f5e205a7922f73`. Squash msg: `feat(book): rediseño visual del paso 6 + preview de imposicion doblada (#128)`. CI `check-all` success (run 44042897212, 1m31s), Vercel pass + Preview Comments pass. Verificado post-merge: `gh pr view 128 --json mergeCommit` + `git fetch origin && git log origin/main -1` + `git ls-remote origin main` = `dff87ac...` (identicos, triple fuente). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/128.
- **Autorizacion**: Kalpa dio OK explicito en sesion tras CI verde ("si").
- **Contenido (corte 2b del plan aprobado)**: (1) Botones rapidos "¿En mi casa?" / "¿En imprenta?" (margen/grosor/destino en un clic + aviso de doble cara). (2) Destino A/B/C en tarjetas con mini-diagrama SVG inline + subtitulo de una linea. (3) Grosor en 4 tarjetas (0 / 0.10 comun / 0.12 ahuesado / Otro -> input) + pill "Lomo estimado: X.X mm" EN VIVO. (4) Switches en tarjetas para creep / guias / ZIP por cuadernillo. (5) Botones segmentados calidad (bloqueado en automatico si sourceProtected) y sentido lectura (se va el `<select>`). (6) Se quita `dir={rtl}` del formulario (BookImpositionStep y BookPreviewExportStep). (7) coverStyle: selector de presets (reusa COVER_PRESETS del Paso 3) en lugar del input de texto crudo. (8) Visor: toggle "Orden lineal" vs "Pares de hoja doblada" (`getSignatureSheetPairs`; misma estrategia multi-balanced que el motor cuando aplica ZIP por cuadernillo).
- **Nuevo helper puro**: `computeBookFinalPageCount(options, pdfPageCount)` en `bookPageCount.ts` (fuente de verdad del conteo final; lo usan Paso 6 pill, Paso 7 resumen y el preview doblado). `renderPdfPreviewStrip`/`BookImpositionStep` recibe `pdfPageCount` prop desde `BookStudioContent`.
- **Validacion**: `tsc --noEmit` 0 errores; `check-all` EXIT=0 local + CI; gobernanza OK; verify-lidio-and-pdf-errors 28/28; sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE; sin bump de version (V2.19.0). 8 archivos, +537/-152. Detalle completo en la PR #128.
- **Con esto el corte 2b queda en produccion; el Plan Integral Mejorado (PRs 1, 2a, 2b) queda COMPLETO**.
- **Pendiente NUEVO**: Kalpa - probar en produccion el paso 6 rediseñado (botones casa/imprenta, tarjetas de grosor + pill de lomo, switches, segmentados, presets de cubierta) y el toggle "Orden lineal"/"Pares de hoja doblada" en el visor. Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja fantasma; Lidio con tips agotados + boton "Otro tip"; Book Studio con PDF protegido con contraseña y contra edicion; Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #129 - 3 huecos del plan original)
- **Merge #129 confirmado** (`fix/book-three-gaps`, head `d483981`): `main` -> hash `50a4a145b63ed37787c4f0113a2006b364ed2b31`. Squash msg: `fix(book): 3 gaps del plan original - IndexedDB handle, retiros sin tapa, Lidio casa/imprenta (#129)`. CI `check-all` success (run 44049754108, 1m19s), Vercel pass + Preview Comments pass. Verificado post-merge: `gh pr view 129 --json mergeCommit` + `git fetch origin && git log origin/main -1` + `git ls-remote origin main` = `50a4a14...` (identicos, triple fuente). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/129.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("dale merge te autorizo") tras abrir la PR.
- **Contenido (reconciliacion del plan original pegado por Kalpa; Bloques A-D ya cerrados por #118-121/#126/#127/#128, estos eran los 3 gaps reales)**: (1) `pickSourcePdf` guarda el FileSystemFileHandle en IndexedDB en try/catch INDEPENDIENTE: si el guardado falla (incognito/cuota) el archivo ya elegido NO se descarta; se retorna `{status:'picked', file}` (comentario del resultado tipado actualizado). (2) Retiros en blanco (`blankBehindCover`/`blankInFrontBackCover`) solo visibles cuando hay tapa/contratapa (`hasCover||customCover`, `hasBackCover||customBackCover`) en BookCoverStep/BookBackCoverStep; motor (`impositionEngine.ts:708,806,698,1131,1151`), conteo (`bookPageCount.ts:162-186`) y badges (`PdfPreviewStrip.tsx:436,502`) ya filtraban - solo la UI quedaba desincronizada. (3) Lidio: nuevo "BLOQUE DE CONOCIMIENTO - IMPRIMIR EN CASA VS LLEVAR A LA IMPRENTA" en `app_guide_assistant` (`api/_lib/aiTasks/catalog.ts`): borde blanco impresora doméstica, destino A vs C, lomo en vivo, margen para el corte (sangrado) y líneas guía (marcas de corte), cuadernillos/ZIP, compensación de creep, regla simple de recomendación + consejo de consultar requisitos a la imprenta. `responseSchema` OpenAPI 3.0 intacto.
- **Validacion**: `tsc --noEmit` EXIT=0; `check-plain-language` OK (455 archivos, 0 jerga); `check-all` EXIT=0 local + CI; gobernanza OK; 6 archivos, +54/-4. Sin bump de version (V2.19.0).
- **Con esto el plan original pegado por Kalpa queda 100% reconciliado: cero items pendientes de implementacion** (deuda documentada fuera de scope sin cambios).
- **Pendiente NUEVO**: Kalpa - probar en produccion: elegir PDF en incognito/cuota (ya no se descarta), "Sin tapa"/"Sin contratapa" (retiros ocultos) y preguntarle a Lidio "¿imprimo en casa o imprenta?" en un libro. Pendientes previos sin cambio: firma visible con datos personales, CV denso sin hoja fantasma; Lidio con tips agotados + boton "Otro tip"; PDF protegido con contraseña y contra edicion; Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #130 - carga de PDF sincrona, buffer intacto y cMaps compartidos)
- **Merge #130 confirmado** (`fix/book-pdf-load-gesture`, head `f864e5b`): `main` -> hash `5c6cc7c431207769079d659c87a1d7ad3f513129`. Squash msg: `fix(book): carga de PDF sincrona, buffer intacto y cMaps compartidos (#130)`. CI `check-all` success (run 44134556313, 1m27s), Vercel pass + Preview Comments pass. Verificado post-merge: `gh pr view 130 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `5c6cc7c...` (identicos, triple fuente). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/130.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("ok") tras CI verde.
- **Contenido (PR-A del bug report nuevo: "Al cargar un PDF nuevo en /crear-libro")**: 4 causas auditadas y cerradas: (1) gestos rotos: `handleTriggerFileInput` sin `setTimeout(..., 100)` (picker nativo dentro del mismo gesto; tick 0 ms solo si el paso 1 no monto) y `triggerPick` de `BookSourceTypeStep` con fallback `input.click()` SINCRONO (sin `await pickSourcePdf()` antes del click que cortaba el gesto en politicas estrictas/iframes). (2) Doble disparo por burbujeo: `onClick={(e) => e.stopPropagation()}` en el `<input type="file">` anidado. (3) ArrayBuffer transferido + clasificacion erronea de "protegido": pdf.js abre via helper con copia fresca por intento; probe de pdf-lib con `arrayBuffer.slice(0)`. (4) cMaps en todos los call sites: nuevo helper canonico `loadPdfDocumentWithCmaps(data, password?)` en `pdfjsWorkerSetup.ts` (cMaps locales -> CDN -> sin cmaps) usado por BookStudioContent, PdfPreviewStrip e impositionEngine (se elimina la duplicacion del bloque de 3 intentos del motor; `pdfjsLib` sin uso sacado). `password` viaja solo en memoria, igual que antes.
- **Auditoria textual actualizada**: `scripts/verify-lidio-and-pdf-errors.tsx` ajustado a los patrones nuevos (`PDFDocument.load(arrayBuffer.slice(0), ...)`; engine -> helper; loader con copia fresca + clave en memoria) - misma intencion de verificacion, texto actualizado por refactor legimito (nunca se saltea el chequeo). 29/29 en verde.
- **Validacion**: `tsc --noEmit` EXIT=0; `check-all` EXIT=0 local + CI + pre-push; gobernanza OK; sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE; sin bump (V2.19.0, bugfix). 8 archivos, +101/-43 (incluye asientos post-merge de #128 y #129 que viajan en este commit).
- **Corte**: este commit es la PR-A del bug report nuevo; la PR-B ("Al cargar libros ya guardados": `/crear-libro` con `<AppModals/>` + `activeDocType 'book'` + hidratacion `loadBookById` + handle por `bookId`) queda en la rama `feat/book-saved-hydrate`.
- **Pendiente no bloqueante**: Kalpa probar en produccion: cargar PDF nuevo en /crear-libro (gesto, sin doble dialogo), PDF CJK con cMaps, miniaturas, imposicion con PDF normal (ya no falso "protegido"). Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #131 - /crear-libro abre modales y carga libros guardados)
- **Merge #131 confirmado** (`feat/book-saved-hydrate`, head `f3a373c`): `main` -> hash `914fe13dac706dc9fb1d0d04c02ccd225d65de8c`. Squash msg: `fix(book): /crear-libro abre modales y carga libros guardados completos (#131)`. CI `check-all` success (run 44147533180, 1m34s), Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh pr view 131 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `914fe13...` (identicos). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward `5c6cc7c..914fe13`. PR: https://github.com/kalpa-droid/LEECV/pull/131.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("ok") tras CI verde.
- **Contenido (PR-B del bug report nuevo: "Al cargar libros ya guardados")**: (1) `/crear-libro` nunca rendia los modales (early return devolvia `<BookStudio/>` sin `<AppModals/>`): el arbol de modales se extrajo a `const appModals` (mismo arbol en vista principal y early return; `modalsSlot={appModals}`) -> "Mis Libros Guardados", "Guardar como", JSON y Compartir funcionan en el estudio de libros. (2) `activeDocType` resuelve 'book' para ruta `/crear-libro`, preset `libro-*` o `docType === 'book'`: `SavedCVsModal` (que ya soportaba `docType="book"`: lista `getSavedBooksList()` y `loadDocumentById(id, 'book')`) ahora lista y carga LIBROS, no CVs; `onSelectCV` registra/activa la pestaña via `ensureDocumentTab`. (3) Hidratacion de libros guardados en `BookStudioContent` al cambiar `activeTabId`: `loadBookById` -> opciones guardadas ganan (`{...DEFAULT_BOOK_IMPOSITION_OPTIONS, ...loaded.options}`), `pdfPageCount` exacto, titulo via `savedBookName`; reapertura del PDF sin duplicarlo via `restoreSourcePdf(bookId)` (handle indexado por `bookId`); sin handle o sin permiso -> aviso "Recordamos donde esta tu PDF"/"No encontramos tu PDF" con el proyecto abierto con sus opciones. (4) `bookAssetManager`: clave scoped `source-pdf-handle:<bookId>` con fallback a la clave global legada (compat hacia atras) en `pickSourcePdf/restoreSourcePdf/requestSourcePdfPermission` (todos aceptan `bookId?`). (5) Pestaña activa del early return prefiere la que coincide con `cvData.id` (no la primera libro de la lista). (6) `BookSourceTypeStep` recibe `bookId` y lo pasa a `pickSourcePdf`.
- **Validacion**: `tsc --noEmit` EXIT=0; `check-all` EXIT=0 local + CI + pre-push; gobernanza OK; sin cambios de OpenAPI ni BOOK_STEP_SEQUENCE; sin bump (V2.19.0, bugfix). 6 archivos, +159/-82 (incluye asientos post-merge de #130).
- **Con esto el bug report nuevo de Kalpa queda COMPLETO**: PR-A #130 (carga de PDF: gestos, buffer, cMaps) + PR-B #131 (/crear-libro modales + libros guardados).
- **Pendiente no bloqueante**: Kalpa probar en produccion: "Mis Libros Guardados" en /crear-libro (listar, abrir, conmutar), "Guardar como"/JSON/Compartir en el estudio, reapertura del PDF del libro tras recargar (mismo navegador, sin duplicar archivo), y libro guardado cuyo PDF fue movido (aviso + reusar handle). Pendientes previos sin cambios: firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas.
- **Deuda fuera de scope** (sin cambios): registro gigante recortado (`wrap={false}` atomico); default prop `documentTabs` hardcodeado; `getQuarterSheet`/`getOctavoSheet`/`cutAndStackPlan` (codigo muerto).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #132 - Release V2.19.1 + versionado obligatorio en cada PR)
- **Merge #132 confirmado** (`chore/release-v2.19.1`, head `4a51179`): `main` -> hash `6b52fbf100b2a986deb993d3c734b4268c679f59`. Squash msg: `chore(release): V2.19.1 fix carga PDF/libros guardados + versionado obligatorio en cada PR (#132)`. CI `check-all` success (run 44156088870, 1m11s, checkout con fetch-depth: 0), Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh pr view 132 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `6b52fbf...` (identicos). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/132.
- **Autorizacion**: Kalpa dio OK explicito en sesion ANTES de la PR ("apruebo, hacelo"); tocaba `version.ts` (core) -> aprobacion CODEOWNER otorgada por Kalpa explicitamente.
- **Contenido**: (1) `version.ts` V2.19.0 -> **V2.19.1** (PATCH; cierra retroactivo el release de #130/#131 que se mergearon sin bump, violando el encabezado del archivo). (2) `scripts/check-version-bump.js` NUEVO: toda PR con codigo de producto (`src/` o `api/`, salvo el propio version.ts) sin `version.ts` en el diff de la rama (merge-base vs base: origin/main / VERSION_CHECK_BASE / GITHUB_BASE_REF) ∪ staged -> FALLA. CI sin base resolvible FALLA cerrada; local omite con aviso. Ambos caminos verificados en worktree aislado contra origin/main (exit 1 fail / exit 0 pass). (3) `package.json`: `check-version-bump` cableado dentro de `check-all` (antes de check-file-size); heredado por pre-push y por el workflow. (4) `.github/workflows/check-all.yml`: `fetch-depth: 0`. (5) `AGENTS.md` Regla 6: bloque "Versionado obligatorio en cada cambio" (desde 2026-11-17 / V2.19.1): PATCH fix / MINOR funcionalidad / MAJOR arquitectura EN EL MISMO COMMIT; PRs solo docs/CI/scripts no requieren bump; lo hace cumplir `check-version-bump` en check-all y CI. (6) Asientos post-merge #130 y #131 viajan en este commit.
- **Estado del codigo**: `version.ts` = **V2.19.1**; `main` = `6b52fbf1`; `check-all` EXIT=0 local + CI (con fetch-depth 0).
- **Asiento SIN PR recursiva (convencion #124-#131)**: este asiento (#132) vive SOLO en `SESSION_LOG.md` + `.opencode/CONTEXT.md` en el working tree; viaja en el PRIMER commit de la proxima PR de trabajo real.
- **Instruccion para el siguiente agente**: (1) Regla vigente desde V2.19.1: toda PR de trabajo lleva el bump de `version.ts` EN EL MISMO COMMIT que aplica el cambio; sin bump, `check-all` falla y la PR no se mergea. (2) `main` = `6b52fbf1`; cualquier rama nueva parte de ahi. (3) Asiento #132 pendiente de commitear: viaja en la proxima PR de trabajo real (no abrir PR docs). (4) Pendientes de produccion de Kalpa (sin cambios): firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas. (5) Artefactos (`tsconfig.tsbuildinfo`, `install-windows.ps1`) NUNCA commitear; `public/cmaps/` gitignored; `check-all` tarda >4-5 min (timeout 0); push re-corre check-all (~6-8 min, usar background).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #133 - Fiabilidad del picker de PDF del Book Studio)
- **Merge #133 confirmado** (`fix/book-pdf-picker-native`, head `97c3d08`): `main` -> hash `4358c7b3701ee700d54ed33a55f55ddd43017e1e`. Squash msg: `fix(book): picker de PDF fiable - input persistente, label nativo y avisos siempre visibles (#133)`. CI `check-all` success (run 44193740027, 1m17s, fetch-depth: 0), Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh pr view 133 --json mergeCommit` + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `4358c7b...` (identicos). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/133.
- **Autorizacion**: Kalpa dio OK explicito en sesion ANTES del merge ("dale hacelo acepto" / "apruebo, hacelo" con el plan aprobado en detalle). Tocaba `version.ts` (core) -> aprobacion CODEOWNER otorgada explicitamente.
- **Diagnostico de Kalpa verificado contra el codigo** (3ra ronda del bug report Book Studio, tras #130/#131): el picker no abria / no tomaba el PDF y no decia nada. Causas reales: (1) `triggerPick` intentaba `fileInputRef.current?.click()` DESPUES de un `await` fallido del selector nativo -> el navegador lo ignora en silencio; (2) `handleTriggerFileInput` tenia `setTimeout(pick, 0)` y dependencia de refs montadas solo en el paso 1; (3) tarjeta atada a `.click()` por JS en vez de `<label>` nativo; (4) huecos de feedback (panel cerrado + error invisible, "Reabrir mi PDF" sin aviso si requestSourcePdfPermission devuelve null, useEffect pickerRef sin bookId en deps, filtro por extension rechazando application/pdf, reintentos inutiles ante PasswordException).
- **Contenido**: (1) `BookStudioContent.tsx`: `<input id="book-source-pdf-input">` PERSISTENTE (siempre montado); `handleTriggerFileInput` SIN setTimeout: `setFilePickError(null) + setActiveStepTab('book_source_type') + setIsPanelOpen(true)` y click sincrono dentro del gesto (pickerRef o input persistente); `handlePersistentFileChosen` (valida isPdfLikeFile; invalido -> `t.bookStudio.sourceStep.errorInvalidFile` con role="alert"); aviso role="alert" en el panel principal cuando no hay PDF cargado (filePickError || PDF_LOAD_ERROR_TEXT[pdfLoadErrorCode]); "Reabrir mi PDF" con permiso null ahora avisa (role="alert") + <label> "Elegir el PDF de nuevo" (reopenFailed, claves i18n reopenFailedNotice/reopenFallbackButton nuevas); loadSourcePdf limpia filePickError/reopenFailed al iniciar. (2) `BookSourceTypeStep.tsx`: tarjeta pasa a `<label htmlFor="book-source-pdf-input">` cuando el selector nativo no se puede usar o FALLO en la sesion (bandera `nativePickerFailedThisSession` en memoria en `bookAssetManager`: `markNativePickerFailedSession`/`isNativePickerFailedSession`/`resetNativePickerFailedSession`; `pickSourcePdf` la marca SOLO en fallback-required, NUNCA en cancelled); showOpenFilePicker sigue siendo camino principal (FileSystemFileHandle para "Reabrir mi PDF"); pickerRef con deps [pickerRef, bookId, nativePickerFailed]; acepta application/pdf sin .pdf (isPdfLikeFile); el <input> oculto del paso se elimina; el prop fileInputRef se elimino. (3) `pdfSourceClassifier.ts` (puro): `isPdfLikeFile({name?,type?})` (type==='application/pdf' || name.toLowerCase().endsWith('.pdf')) e `isFatalPdfLoadError` (PasswordException/InvalidPDFException). (4) `pdfjsWorkerSetup.ts`: corte fatal en `loadPdfDocumentWithCmaps` (0 reintentos de cMaps ante errores fatales). (5) `public/sw.js`: CACHE_NAME leecv-pwa-v3 -> **leecv-pwa-v4**. (6) `version.ts`: V2.19.1 -> **V2.19.2** (PATCH) EN EL MISMO COMMIT (regla V2.19.1). (7) `tests/book-engine/pdfPickingFlow.test.ts` NUEVO: 10 tests. (8) `verify-lidio-and-pdf-errors`: 35/35 verificaciones (antes 29). (9) Asiento #132 viajo en el primer commit de la PR.
- **Estado del codigo**: `version.ts` = **V2.19.2**; `main` = `4358c7b3`; `check-all` EXIT=0 local + CI (1m17s); `vitest tests/book-engine` 84/84; typecheck OK.
- **Asiento SIN PR recursiva (convencion #124-#132)**: este asiento (#133) vive SOLO en `SESSION_LOG.md` + `.opencode/CONTEXT.md` en el working tree; viaja en el PRIMER commit de la proxima PR de trabajo real.
- **Instruccion para el siguiente agente**: (1) `main` = `4358c7b3`; cualquier rama nueva parte de ahi. (2) La rama `fix/book-pdf-picker-native` conserva el commit de la PR (sin borrar). (3) Asiento #133 pendiente de commitear: viaja en la proxima PR (no abrir PR docs). (4) Pendientes de produccion de Kalpa (sin cambios): firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas. (5) Artefactos (`tsconfig.tsbuildinfo`, `install-windows.ps1`) NUNCA commitear; `public/cmaps/` gitignored; `check-all` tarda >4-5 min (timeout 0); push re-corre check-all (~6-8 min, usar background).

## [2026-11-17] - Regla 6 paso 7 (Post-merge PR #134 - Blindaje de pagos automaticos MP/PayPal, Fase 1, V2.20.0)
- **Merge #134 confirmado** (`fix/payments-auto-credit-shield`, head `3f39243`): `main` -> hash `8b20313d413532cacb1c9d9aa41bde52e6b63765`. Squash msg: `fix(payments): blindaje automatico de pagos MP/PayPal - acreditacion en captura y cierre de unclaimed (#134)`. CI `check-all` success (run 44222346144, 1m9s, fetch-depth: 0), Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh api repos/kalpa-droid/LEECV/pulls/134` (merge_commit_sha) + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `8b20313...` (identicos). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward. PR: https://github.com/kalpa-droid/LEECV/pull/134.
- **Autorizacion**: Kalpa dio OK explicito en sesion ANTES del merge ("ok si toy el ok para merger tambien"). Tocaba `api/_lib/` y `src/shared/core/version.ts` -> CODEOWNER (Kalpa). Auditoria cruzada de seguridad (Etapa 4, Regla 9) por subagente reviewer ANTES del push: **0 criticos**; medios/menores corregidos en la misma rama.
- **Diagnostico de Kalpa verificado 100% contra el codigo** antes de implementar (Regla 7; plan aprobado "PR-A: Fase 1 pagos"): (1) `applyPayment` cortaba el camino unclaimed con return temprano sin cerrar processed_payments ni recibo; el try/catch asumia que Supabase JS v2 lanza (devuelve { error }); `pro` sin perfil insertaria 'unlimited' en columna integer. (2) `paypal-order` capture sin applyPayment ni rate-limit: todo colgaba del webhook. (3) `custom_id` JSON rozando los 127 chars de PayPal. (4) `PdfCheckoutModal` creaba el token sin `user_id` (invisible para `.eq('user_id', ...)`). (5) `App.tsx` leia user del closure nulo del primer render. (6) MP webhook ignoraba IPN legacy y no sanitizaba el payment id.
- **Contenido** (16 archivos, +695/-74): (1) `applyPayment.ts`: unclaimed cierra `entitlement_status='completed'` con `details:{unclaimed:true}` (reintentos caen en already_processed: sin duplicados de avisos/WA, historial no queda Pendiente para siempre); insert verificado con `{ error }` (23505 idempotente, otro error throw -> webhook 500 -> pasarela reintenta); guard `credits` number; recibo con nota de reclamo automatico (5to param `extraNote` en `sendPurchaseReceipt`, retrocompatible); `PLAN_LABELS` a nivel modulo. (2) `paypal-order.ts`: capture con rate-limit propio (`guest:<ip>:paypal-capture`) + `acreditarCapturaPayPal()` inmediata con `externalId = capture.id` (MISMA clave `(provider, external_id)` del webhook: idempotente, cero duplicacion si llegan juntos; el usuario vuelve con creditos aunque el webhook tarde o no llegue); helper reutilizado en `ORDER_ALREADY_CAPTURED` (GET de la orden, sin re-acreditar, cubre muerte entre captura y applyPayment); alerta WhatsApp si la acreditacion falla tras captura. (3) `planReference.ts`: `formatPlanReference` compacto `plan|token|uid` (<127 chars) + parse retrocompatible JSON legacy (default historico single_pdf; fail-closed, nunca pro por defecto); rawStr truncado a 24 chars en logs/Sentry. (4) `checkoutInitiators.ts`: compacto en external_reference (MP) y custom_id (PayPal). (5) `mercadopago.ts`: `encodeURIComponent` del payment id + IPN legacy `topic=payment&id` con manifest HMAC correcto. (6) Retencion visible en MP/PayPal: pago sin referencia/email utilizable retorna `providerStatus:'pending'` con plan 'unknown' -> `pending_grants` (hold `provider_pending`) + notificacion + WA (antes descarte silencioso con 200 OK sin reintento); `applyPayment` retorna held_for_review antes de tocar el catalogo (verificado). (7) `serverDal.ts`: `updateEntitlementStatus` 4to param opcional `details` (retrocompatible). (8) `PdfCheckoutModal.tsx`: `createUnpaidToken` con `user_id`. (9) `App.tsx`: espera hidratacion de sesion (techo 4.5s) + polling 3x2s de claim/refresh con `userRef` fresco + flag `cancelled` en cleanup. (10) `version.ts`: V2.19.2 -> **V2.20.0** (MINOR) EN EL MISMO COMMIT (regla V2.19.1). (11) Tests nuevos `tests/paymentProviders/`: planReference (8), applyPaymentUnclaimed (6), paypalOrderCapture (4) = 18 nuevos, suite 29/29.
- **Estado del codigo**: `version.ts` = **V2.20.0**; `main` = `8b20313d`; `check-all` EXIT=0 local + CI (1m9s) + pre-push; `vitest tests/paymentProviders` 29/29; typecheck + typecheck:api 0 errores.
- **Asiento SIN PR recursiva (convencion #124-#133)**: este asiento (#134) vive SOLO en `SESSION_LOG.md` + `.opencode/CONTEXT.md` en el working tree; viaja en el PRIMER commit de la proxima PR de trabajo real.
- **Instruccion para el siguiente agente**: (1) `main` = `8b20313d`; cualquier rama nueva parte de ahi. (2) La rama `fix/payments-auto-credit-shield` conserva el commit de la PR (sin borrar). (3) Asiento #134 pendiente de commitear: viaja en la proxima PR (no abrir PR docs). (4) Fase 2 aprobada en el plan: PR-B reestructuracion del Panel Admin (rescatar bloque muerto `adminTab` con notificaciones/comprobantes/diagnostico en pestaña "Resumen y Operaciones", montar `AuditAndErrorsTab` (+admin_audit_logs) y `TemplateManagementTab`, diagnostico real de IA server-side) — presentar plan y pedir OK (Regla 7). Luego PR-C perf/metricas/DSN, PR-D server actions + unclaimed + reconciliador, PR-E metricas/moderacion/salud IA. (5) Backlog PR-D (nota anti-fraude del auditor, preexistente): `create-checkout.ts` confia en userId/email del body. (6) Pendientes de produccion de Kalpa (sin cambios): firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas. (7) Artefactos (`tsconfig.tsbuildinfo`, `install-windows.ps1`) NUNCA commitear; `public/cmaps/` gitignored; `check-all` tarda >4-5 min (timeout 0); push re-corre check-all (~6-8 min, usar background).

## [2026-11-18] - Regla 6 paso 7 (Post-merge PR #135 - Fase 2 Panel Admin, V2.21.0)
- **Merge #135 confirmado** (`feat/admin-overview-tabs`, head `938a1c9`): `main` -> hash `379eff3a54199d1b2c72fa323c80a6524a388afc`. Squash msg: `feat(admin): fase 2 panel admin - resumen y operaciones, auditoria extendida y plantillas (#135)`. CI `check-all` success (run 44233932070, 1m22s, fetch-depth: 0), Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh pr view 135` (mergeCommit) + `git fetch origin && git log origin/main -1 --format="%H %s"` + `git ls-remote origin main` = `379eff3...` (identicos). Rama NO borrada (sin `--delete-branch`). `main` local fast-forward `8b20313..379eff3`. PR: https://github.com/kalpa-droid/LEECV/pull/135. Asiento #134 viajo en el primer commit de esta PR.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("te doy el ok ahora") tras CI verde; tocaba `api/_lib/` y `version.ts` (nucleos) -> aprobacion CODEOWNER otorgada por Kalpa explicitamente. Auditoria cruzada de seguridad (Etapa 4, Regla 9) por subagente reviewer ANTES del push: **APROBADO CON CAMBIOS, 0 criticos**; los medios (MED1 inline radius via style, MED2 cache server-side 5 min + forcePing, MED3 DAL para admin_error_logs) y el hallazgo de contraste del ternario (aliases sin hex -> primitivas `--ui-text-secondary`/`--ui-text-primary`; baseline regenerada 32->12) se corrigieron en la misma rama antes del push/commit.
- **Contenido (Fase 2 del plan de pagos/admin, 15 archivos, +1259/-295)**: (1) `AdminOverviewTab.tsx` NUEVO (pestana "Resumen y Operaciones", PRIMERA del panel): notificaciones (filtro no leidas/todas + "Marcar todas" + badge), comprobantes manuales (`payment_claims`; link a `proof_url` http/https con `rel="noopener noreferrer"`; "Rechazar" con contraste tokenizado), diagnostico en vivo de pasarelas MP/PayPal (server-side, cache 5 min existente) + diagnostico de motores IA REAL server-side + resumen de pausas de claves (`ai_key_cooldowns`) + boton limpiar pausas expiradas. (2) `admin-api.ts`: nuevo GET `ai-providers-status` (requireAdmin + rate limit; ping real a AI_PROVIDERS Groq/Gemini + `getAiKeyCooldownSummary`; cache server-side 5 min estilo integrations-status; `?forcePing=true` desde el boton "Re-chequear") y POST `clear-ai-cooldowns` (solo filas ya expiradas via `clearExpiredCooldowns`; una pausa activa NO se cancela; 503 si la DB no responde). Antes el panel leia `VITE_GROQ_API_KEY` en el navegador (nunca existe) -> falso `missing_vars`. (3) `keyRotation.ts`: export `getAiKeyCooldownSummary(providerId)` (SOLO conteos: `configuredKeys`/`pausedKeys`/`source`; union DB+memoria; fail-safe con timeout; nunca expone material de claves; testeado). (4) `AuditAndErrorsTab.tsx` montado y extendido: filtros nivel/fuente, "Marcar resuelto" via DAL (`.is('resolved_at', null)`, anti doble resolucion), visor de contexto JSON expandible, columna `fingerprint`, sub-vista "Acciones admin" (`admin_audit_logs`). (5) `TemplateManagementTab.tsx` montado (sin cambios de codigo). (6) DAL: nueva seccion `adminErrorLogs` (`list({ level, source })` limite 100, `markResolved(id, resolvedBy)`) + `adminNotifications.markAllRead`. (7) Nuevo token `--color-status-danger-on-base: #000000` (4.88:1 sobre danger-base #D14D4D). (8) `AdminDashboard.tsx`: import muerto `listUsers` fuera; re-check con `forcePing=true`; pestana `overview` por defecto. (9) `vercel.json`: 2 rewrites nuevos. (10) `version.ts` V2.20.0 -> **V2.21.0** (MINOR, mismo commit; regla V2.19.1). (11) `tests/admin/`: 13 tests nuevos (`adminAiProvidersStatus` usa `forcePing=true` para no depender de la cache entre runs; `keyRotationCooldownSummary` cubre el resumen fail-safe); suite completa **687 passed | 2 skipped**. (12) `AdminOverviewTab`: ternario de la tarjeta de notificaciones ya no usa aliases sin hex; `scripts/contrast-baseline.json` regenerado desde el codigo real (12 entradas vigentes: AtsAiAnalysisModal + SectionManualAdjustment; eliminadas rancias AdminDashboard.tsx:401 y CreditsModal.tsx:46).
- **Estado del codigo**: `version.ts` = **V2.21.0**; `main` = `379eff3a`; `check-all` EXIT=0 local (2x) + CI (1m22s) + pre-push; typecheck + typecheck:api 0; lint EXIT=0 (solo warnings preexistentes); check-ui-tokens 0 fugas; check-contrast 0 nuevas; build OK; verify:seo 40/40.
- **Asiento SIN PR recursiva (convencion #124-#134)**: este asiento (#135) vive SOLO en `SESSION_LOG.md` + `.opencode/CONTEXT.md` en el working tree; viaja en el PRIMER commit de la proxima PR de trabajo real.
- **Instruccion para el siguiente agente**: (1) `main` = `379eff3a`; rama nueva desde ahi. (2) Bump de `version.ts` EN EL MISMO COMMIT (regla V2.19.1; la exige `check-version-bump` local/CI). (3) Asiento #135 pendiente de commitear: viaja en la proxima PR (no abrir PR docs). (4) **Fase 2 COMPLETA**. Quedan: PR-C (perf panel: debounce 350 ms, closures viejos de checkSession/setInterval, metricas reales vs "500 MB", DSN Sentry a config), PR-D (server actions admin grant/revoke/set-plan/retencion de unclaimed + reconciliador), PR-E (metricas por producto/moderacion published_cvs/salud IA). (5) Deuda documentada (no bloqueante): `claim.proofId` (fallback camelCase fantasma) vs columnas reales `method`/`proof_id` (mismatch PaymentClaim preexistente); `markAllRead` responde exito con 0 filas cambiadas (minor). (6) Hallazgo colateral: `install-windows.ps1` (instalador ajeno "Hex"/anoma.ly) estaba en la raiz del repo; Kalpa lo marco para borrar y se elimino (nunca tracked, no recuperable desde git). `tsconfig.tsbuildinfo` sigue modificado localmente (M), sigue fuera de cualquier commit. (7) Pendientes de produccion de Kalpa: probar el panel admin nuevo (notificaciones / comprobantes / diagnostico IA con cache 5 min + forcePing), firma visible con datos personales, CV denso sin hoja fantasma, Lidio tips agotados/"Otro tip", PDF protegido con contrasena/contra edicion, Importar CV con IA con PDF escaneado/2 columnas.

## [2026-11-18] - Fix pantalla en blanco en /admin + PRESET_LIST (rama fix/admin-white-screen, V2.21.1)
- **Accion realizada**: Diagnostico verificado en vivo (HTTP 200 de todos los chunks /admin en produccion) y en codigo sobre `main` = `379eff3a`. Plan aprobado por Kalpa (Regla 7, "Avanzar con el plan completo") y OK explicito para el flujo completo ("te doy el ok ahora"). Rama `fix/admin-white-screen` desde `main`.
  - `authService.ts`: `getCurrentProfile()` envuelta en try/catch total (getUser / claimCreditsOnAuth / query profiles) -> resuelve `null` ante sesion invalida, red o lock abortado (navigator.locks). **Nunca rechaza**.
  - `AdminDashboard.tsx`: `checkSession()` con `withTimeout(..., 15000)` + pantalla de error recuperable con boton **Reintentar** (role="alert") — `profile` nunca queda en `undefined` para siempre; nueva pantalla visible "Verificando sesion de administrador..." (era `return null`); verificacion de sesion una sola vez al montar; carga paginada de clientes SEPARADA ([profile?.role, page, searchQuery]); pantalla sin-permisos con tokens `--ui-bg-panel`/`--ui-text-primary`.
  - `main.tsx`: Suspense fallback `bg-[var(--ui-preview-bg)] text-white`.
  - `presetRegistry.ts`: Proxy `PRESET_LIST` corregido — `Symbol.iterator` exacto y bound sobre snapshot; indices numericos ANTES del chequeo de simbolos. Bug: `Symbol.iterator in Object("0")` === true (String lo implementa) -> `PRESET_LIST[0]` devolvia `Array.prototype.values` -> `TemplateManagementTab` ejecutaba esa funcion como lazy initializer de useState -> TypeError -> ErrorBoundary en la pestana "Plantillas de CV".
  - `TemplateManagementTab.tsx`: snapshots (Array.from), guard de lista vacia (early return tras hooks); pastillas de sub-pestanas a `--ui-preview-bg` (mismo bug de contraste latente).
  - `AppShell.tsx`: mismo fix de contraste latente (texto blanco sobre `--color-neutral-text-primary` #F8FAFC en tema oscuro).
  - Tests nuevos: `tests/admin/presetRegistry.test.ts` (4), `tests/admin/authService.test.ts` (3), `tests/admin/adminDashboardSession.test.tsx` (5) — **12 verdes**. Suite completa: **699 passed | 2 skipped**.
  - Bump `version.ts` V2.21.0 -> **V2.21.1** (PATCH, mismo commit).
  - Asientos #134/#135 viajan en este commit (convencion "viaja en la proxima PR").
- **Estado del codigo**: `check-all` local EXIT=0 (tests 699/699, typecheck 0, lint solo warnings preexistentes, contraste 0 nuevas, build OK, SEO 40/40). Toca `src/shared/core/` -> requiere aprobacion CODEOWNER (Kalpa) antes del merge.
- **Instruccion para el siguiente agente**: (1) Esperar CI check-all verde en la PR; merge squash (SIN --delete-branch); verificar hash TRIPLE FUENTE (`gh pr view` + git log + git ls-remote); asentar el merge en el proximo PR de docs. (2) Riesgo residual documentado (no corregido, fuera del alcance aprobado): cache PWA (`public/sw.js` conserva `leecv-pwa-v4`) — si una pestana cacheada pide un chunk inexistente, vercel.json reescribe a index.html (text/html) y el modulo falla antes de montar; mitigar con bump del nombre de cache si reaparece "pantalla en blanco post-deploy". (3) Backlog panel admin sigue: PR-C (perf/metricas/DSN), PR-D (server actions + unclaimed + reconciliador), PR-E (metricas/moderacion/salud IA).

## [2026-11-18] - Regla 6 paso 7 (Post-merge PR #136 - fix pantalla en blanco /admin, V2.21.1)
- **Merge #136 confirmado** (`fix/admin-white-screen`, head `3ce79a9`): `main` -> hash `da9eb60ae0bb0bb3727adbe697eecbd16e918b59`. Squash msg: `fix(admin): pantalla en blanco en /admin + PRESET_LIST + contraste (V2.21.1) (#136)`. CI `check-all` success (run 44241765158, 1m43s) + Vercel pass + Preview Comments pass. Verificado post-merge TRIPLE FUENTE: `gh pr view 136` (mergeCommit/state) + `git fetch origin && git log origin/main -1` + `git ls-remote origin main` = `da9eb60...` (identicos). Rama NO borrada (sin --delete-branch). PR: https://github.com/kalpa-droid/LEECV/pull/136.
- **Autorizacion**: Kalpa dio OK explicito en sesion ("te doy el ok ahora"). Tocaba `src/shared/core/` -> CODEOWNER obligatorio; OK de CODEOWNER otorgado por Kalpa en sesion explicitamente.
- **Contenido (13 archivos, +409/-75)**: fix getCurrentProfile() nunca rechaza; checkSession() con timeout 15s + Reintentar; pantalla "Verificando sesion..." (era return null); sesion una vez al montar; carga paginada separada; contraste Suspense/permisos/AppShell/pastillas; Proxy PRESET_LIST corregido; guard lista vacia TemplateManagementTab; 12 tests nuevos (suite 699 passed | 2 skipped); bump V2.21.1. Asientos #134/#135 viajaron en este commit.
- **Estado del codigo**: `version.ts` = **V2.21.1**; `main` = `da9eb60a`.
- **Asiento SIN PR recursiva (convencion #124-#135)**: este asiento vive SOLO en `SESSION_LOG.md` + `.opencode/CONTEXT.md` en el working tree; viaja en el PRIMER commit del proximo PR de trabajo real.
- **Instruccion para el siguiente agente**: (1) `main` = `da9eb60a`; rama nueva desde ahi. (2) Bump de `version.ts` EN EL MISMO COMMIT de toda PR de trabajo (regla V2.19.1). (3) Riesgo residual documentado: cache PWA (`public/sw.js` `leecv-pwa-v4`); si reaparece "pantalla en blanco post-deploy", bump del nombre de cache. (4) Backlog panel admin: PR-C (perf/metricas/DSN), PR-D (server actions + unclaimed + reconciliador), PR-E (metricas/moderacion/salud IA). (5) Pendientes de produccion de Kalpa: probar /admin (notificaciones, comprobantes, diagnostico IA, Reintentar ante fallo de sesion) y que la pestana Plantillas de CV ya no crashea.

## [2026-11-18] - PR-C: Panel Admin performance/métricas/DSN (rama fix/admin-perf-metrics, V2.21.2)
- **Acción realizada**: Rama `fix/admin-perf-metrics` desde `main` (`da9eb60a`, incluye merge #136). Plan presentado y aprobado por Kalpa (Regla 7, gate explícito). Scope decidido por Kalpa en sesión: el card "CVs Publicados" (`published_cvs`) reemplaza al hardcode "500 MB Capacidad Base DB Supabase".
  - **Debounce 350ms** en búsqueda de clientes (`AdminDashboard.tsx`): `debouncedSearchQuery` (useEffect+setTimeout inline); el input pinta inmediato pero `listCustomers` y el effect de carga usan el valor debounced. Eliminado el round-trip por tecla.
  - **Closure viejo del polling de 45s**: `loadEverythingRef` actualizado en cada render + deps `[profile?.role]`. Antes recargaba siempre con `page=0` y búsqueda vacía (pisandole la navegación al admin).
  - **Métrica real**: card "CVs Publicados" vía `dal.publishedCvs.countAll()` (nuevo, head:true exact count, try/catch → 0, nunca rechaza) — espejo de `cvs.countAll()`. `adminService.getPublishedCvsCount`. Cargada en el mismo `Promise.all` de `loadEverything`.
  - **DSN Sentry a config**: `SentryReportsTab` ahora lee `env.SENTRY_DSN` (única fuente de verdad); literal duplicado eliminado; `SENTRY_DASHBOARD_URL` como const de módulo. Default de `env.ts` intacto (DSN browser es público por diseño; quitarlo rompería prod si `VITE_SENTRY_DSN` no está en Vercel).
  - Bump `version.ts` V2.21.1 → **V2.21.2** (mismo commit, regla V2.19.1).
  - Asientos #134/#135/#136 (pendientes en working tree) viajan en este mismo commit.
- **Estado del código**: typecheck 0; vitest admin 25/25 verdes; `check-all` local COMPLETO EXIT=0 (build OK, tests 699 passed | 2 skipped, typecheck 0, contraste 0 nuevas, SEO 40/40). Toca `src/shared/core/` (version.ts + dataAccessLayer.ts) → requiere aprobación CODEOWNER (Kalpa) antes del merge.
- **Incidente CI (resuelto)**: CI `check-all` de la PR #137 falló en 46s aunque los tests pasaron: `vite.config.js` NO expone `globals:true` → RTL NO desmonta solo → el `setTimeout` del debounce (350ms) disparaba `dispatchSetState` post-teardown → `ReferenceError: window is not defined` (unhandled → exit 1). Fix en `750156a` (solo `tests/`, sin bump): mock `getPublishedCvsCount` en adminService mock + `afterEach(cleanup)` explícito. 3/3 corridas locales verdes antes del push.
- **Instrucción para el siguiente agente**: (1) Esperar CI check-all verde en la PR; merge squash (SIN --delete-branch); verificación TRIPLE FUENTE (`gh pr view` + `git log origin/main -1` + `git ls-remote origin main`); asentar merge en el próximo PR. (2) Bump de `version.ts` EN EL MISMO COMMIT en toda PR de trabajo. (3) PR-D y PR-E siguen en backlog: PR-D (server actions admin grant/revoke/set-plan/retención unclaimed + reconciliador), PR-E (métricas por producto/moderación published_cvs/salud IA). (4) Nota anti-fraude preexistente para PR-D: `create-checkout.ts` confía en userId/email del body.

## [2026-11-18] - Merge PR #137 (PR-C Panel Admin, V2.21.2)
- **Merge #137 confirmado TRIPLE FUENTE**: `main` = `b8cb8a6f6dbc0315ccf8f40f92b19da31fc86ebb` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44246805998, 1m17s); Vercel pass. Merge squash (SIN --delete-branch; la rama `fix/admin-perf-metrics` no se borró para preservar el reflog/PR). OK CODEOWNER de Kalpa otorgado en sesión; aprobación por CODEOWNERS requerida por tocar `src/shared/core/`.
- **Nota post-merge**: CI del commit `0d5ed90` falló en 46s (`window is not defined`, tests/ adminDashboardSession sin cleanup RTL); fix `750156a` (solo tests/, sin bump) → CI verde. Pre-push re-corrió `check-all` completo OK (guard esperado: 4 archivos de producto + bump).
- **Despliegue**: el push a `main` dispara deploy automático a producción (V2.21.2). Verificar en prod tras deploy: card "CVs Publicados" (count real, puede mostrar 0), debounce 350ms en búsqueda de clientes, auto-refresh 45s sin pisar navegación, tab de Plantillas Sentry estable.
- **Estado del código**: `version.ts` = **V2.21.2** en `main` @ `b8cb8a6`. Working tree contiene asientos post-merge pendientes (viajan en el próximo PR de trabajo).
- **Instrucción para el siguiente agente**: (1) PR-D: server actions admin (grant/revoke/set-plan/retención unclaimed + reconciliador); revisar nota anti-fraude `create-checkout.ts`. (2) PR-E: métricas por producto/moderación published_cvs/salud IA. (3) Bump de `version.ts` en el mismo commit en toda PR de trabajo. (4) Recordar: RTL sin `globals:true` → todo setTimeout en componentes montados en tests necesita cleanup explícito (`afterEach(cleanup)`).

## [2026-11-18] - Merge PR #138 (PR-D Server actions admin + anti-fraude checkout, V2.22.0)
- **Merge #138 confirmado TRIPLE FUENTE**: `main` = `071fe098eea94f3064e69e59f61dc35c0ce679e5` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44257432397, 1m25s); Vercel preview pass. Merge squash (SIN --delete-branch; la rama `fix/admin-server-actions` no se borró). OK Kalpa otorgado en sesión ("te digo ok" tras ver checks en verde); aprobación CODEOWNER requerida por tocar `src/shared/core/version.ts`.
- **Contenido**: set-plan y grant-export-tokens como server actions (`requireAdmin` + rate-limit 20/60 + validateBody + validación estricta + `admin_audit_logs`); create-checkout blindado (userId del body ignorado; identidad por Bearer JWT o por token pdf_export_tokens pre-checkout; 401/403/400/500-genérico); `adminService.setUserPlan` migrado; botones +1/+5/+10 de UsersTab **rotos en prod** (RPC con EXECUTE revocado para authenticated) ahora funcionan; 15 tests nuevos (admin 54/54).
- **Despliegue**: el push a `main` dispara deploy automático a producción (V2.22.0). Verificar en prod tras deploy: grant de créditos +1/+5/+10 en /admin → Usuarios; cambio de plan PRO/FREE y "Revocar PRO".
- **Estado del código**: `version.ts` = **V2.22.0** en `main` @ `071fe098`. Working tree contiene asientos post-merge pendientes (viajan en el próximo PR de trabajo).
- **Instrucción para el siguiente agente**: (1) PR-D2: reconciliador pagos↔entitlements (`cron-reconcile-payments`, CRON_SECRET) + retención `unclaimed_email_credits` — Kalpa decide A (soft: reporte/aviso, sin DB) o B (strict: migración TTL 90 días + purga, toca DB de producción y requiere su aprobación explícita para aplicar la migración). (2) Mismo flaw anti-fraude en `paypal-order.ts` (create, confía userId/email del body) → incluir en PR-D2 o backlog. (3) PR-E: métricas por producto/moderación published_cvs/salud IA. (4) Bump de `version.ts` en el mismo commit en toda PR de trabajo.

## [2026-11-18] - Merge PR #139 (PR-D2 Reconciliador de pagos + retención unclaimed, V2.23.0)
- **Merge #139 confirmado TRIPLE FUENTE**: `main` = `7fd8224f5da005036ab3db88314bf576fbf1b7d6` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44358383806, 1m35s); Vercel pass. Merge squash (SIN --delete-branch; la rama `feat/payments-reconciler-unclaimed-retention` no se borró). OK Kalpa otorgado en sesión tras CI verde; aprobación CODEOWNER requerida por tocar `src/shared/core/version.ts`. `main` local alineado (ff-only `071fe098..7fd8224`).
- **Contenido**: `api/_lib/paymentReconciler.ts` (fuentes: `processed_payments` pendientes + `pending_grants` `provider_pending`; ventana mín. 15 min; batch 20 oldest-first; MP `GET /v1/payments/{id}` + PayPal OAuth + `GET /v2/payments/captures/{id}`; approved → `applyPayment` idempotente + `resolveIfPending('reconciler_confirmed')`; rejected → `failed` + `provider_rejected` + aviso admin; >7 días o aprobado sin referencia utilizable → revisión manual, NUNCA acredita en la duda; UNA notificación agregada por corrida si hay escalados); retención `unclaimed_email_credits` **Opción B** (recordatorio único ~día 7 con `reminder_sent_at` + claim atómico y revert si falla el envío; expiración ~día 365 con `expired_at` + email anonimizado, importes/payment_id conservados para contabilidad; notificación agregada `unclaimed_credits_expired`); anti-fraude también en `paypal-order.ts` create vía `checkoutIdentity.ts` compartido (mismo criterio que create-checkout); `cron-downgrade.ts` ejecuta el mantenimiento como **PASO C** aislado en try/catch (una falla nunca aborta el downgrade); panel: botón "Reintentar reconciliación" en Pagos retenidos + tab **Créditos sin reclamar** (listado + reenvío de aviso); 3 server actions admin (`reconcile-payments`, `list-unclaimed-credits`, `resend-unclaimed-reminder`) con rate-limit + `admin_audit_logs`; 42 tests nuevos (reconciliador 10, retención 6, anti-fraude paypal-order 11, +15 en adminServerActions).
- **⚠️ PENDIENTE de Kalpa (bloqueante para la expiración real)**: aplicar `supabase/migrations/20261118_unclaimed_credits_retention.sql` en PRODUCCIÓN con backup previo (idempotente: columnas `reminder_sent_at`/`expired_at` + índices parciales + reemplazo de `claim_credits_on_auth()` que ignora expiradas + extensión del CHECK `admin_notifications.type` con `unclaimed_credits_expired`). Sin la migración, el claim NO ignora filas expiradas y el cron PASO C fallará silenciosamente (queda logueado + capturado por Sentry, sin abortar el downgrade).
- **Estado del código**: `version.ts` = **V2.23.0** en `main` @ `7fd8224f`. Deploy automático tras el push. Asientos post-merge pendientes en working tree (viajan en el próximo PR de trabajo).
- **Verificación en prod sugerida** (Kalpa): compra mínima en PayPal sandbox → volver del checkout → créditos inmediatos; webhook posterior cae en `already_processed`; botón "Reintentar reconciliación" en /admin → Pagos retenidos; reenvío de aviso en tab Créditos sin reclamar.
- **Instrucción para el siguiente agente**: (1) PR-E: métricas por producto/moderación published_cvs/salud IA. (2) Bump de `version.ts` en el mismo commit en toda PR de trabajo. (3) Recordatorio: `vite.config.js` sin `globals:true` → RTL sin cleanup automático (`afterEach(cleanup)`).

## [2026-11-18] - Merge PR #140 (PR-E Métricas por producto + moderación CVs publicados + salud IA, V2.24.0)
- **Merge #140 confirmado TRIPLE FUENTE**: `main` = `444274b4bbdc836412851deba7a09558869a7fb1` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44368332562, 1m32s); Vercel pass. Merge squash (SIN --delete-branch; la rama `feat/admin-metrics-moderation-ai-health` conservada). OK Kalpa otorgado en sesión tras CI verde ("si"); aprobación CODEOWNER requerida por tocar `src/shared/core/version.ts`. `main` local alineado (ff-only `7fd8224..444274b`). PR: https://github.com/kalpa-droid/LEECV/pull/140.
- **Contenido**: `metrics-by-product` (GET 30/60): documentos por `doc_type_id` (head-counts exactos sin traer filas, bucket `otro`/`null`), exportaciones pagas por `doc_type` (`pdf_export_tokens.paid=true`), ingresos confirmados por **plan+moneda** (`processed_payments` `entitlement_status='completed'`; sin `doc_type` en pagos → sin migración, decisión de alcance de Kalpa). `list-published-cvs` (GET 30/60, `limit ≤ 50`, búsqueda por slug `ilike` o por email con join server-side `profiles!inner` cuando el término contiene `@`) y `set-published-cv-active` (POST 10/60, UUID + `isActive` booleano estrictos, `reason` opcional ≤500, auditoría `set_published_cv_active` con `user_id` del dueño; **moderación = is_active, nunca borra CV ni archivo de Drive**; reversible). `list-ai-cooldowns` (GET 30/60): solo `provider` + prefijo de 8 chars del hash SHA-256, nunca la key. UI: tarjetas "Métricas por Producto" en Resumen del panel; nueva tab **CVs Publicados** (tabla + buscador + link `/c/:slug` + toggle activar/desactivar); AiTelemetryTab con desglose por proveedor y endpoint (muestra de las últimas 100 llamadas cargadas, etiquetado; SIN tasa de error/fallback porque `ai_usage_telemetry` no la registra) + bloque "Claves en pausa ahora". serverDal: `cvs.countByDocType`, `exportTokens.countPaidByDocType`, `processedPayments.revenueByPlanCurrency`, `publishedCvs.listForModeration`/`setActive`, `aiKeyCooldowns.listActive`. 18 tests nuevos (`tests/admin/adminMetricsModeration.test.ts`; suite 782 passed | 2 skipped). Incluye asientos #137/#138/#139 (viajaron en el commit).
- **Incidente typecheck (resuelto local)**: primer `check-all` falló en `AdminDashboard.tsx` (union de tabs no ampliada a `'publishedCvs'`); fix agregando el literal, segundo `check-all` EXIT=0; push pasó pre-push re-corriendo check-all.
- **Estado del código**: `version.ts` = **V2.24.0** en `main` @ `444274b4`. Deploy automático tras el push. Asientos post-merge pendientes en working tree (viajan en el próximo PR de trabajo).
- **Backlog admin CERRADO (PR-C + PR-D + PR-D2 + PR-E)**: performance/métricas/DSN Sentry, server actions con anti-fraude, reconciliador pagos↔entitlements, retención unclaimed, métricas por producto, moderación de publicaciones, salud IA.
- **Pendientes de Kalpa en producción**: (1) aplicar `supabase/migrations/20261118_unclaimed_credits_retention.sql` (query de verificación en PR #139/#140) — sin ella el PASO C del cron loguea y el claim no ignora expiradas. (2) Verificación en prod: tarjetas "Métricas por Producto" en Resumen, tab "CVs Publicados" (desactivar/activar de prueba), desglose IA y claves en pausa en AiTelemetryTab.
- **Instrucción para el siguiente agente**: (1) El backlog admin de la sesión queda cerrado; próximos ejes a definir con Kalpa (p.ej. instrumentar tasa de error/fallback IA, o doc_type en processed_payments si algún día se quiere revenue por producto de documento — requiere migración). (2) Bump de `version.ts` en el mismo commit en toda PR de trabajo.

## [2026-11-19] - Merge PR #141 (PR-F1/F2 Fix pipeline de pagos, V2.24.1)
- **Merge #141 confirmado TRIPLE FUENTE**: `main` = `0639f3e2db582a3586ebdb8f3464d03b0fa0578b` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44454620819, 58s); Vercel pass. Merge squash (SIN --delete-branch; rama `feat/fix-payment-pipeline-F1-F2` conservada). OK Kalpa en sesión ("te doy la aprobacion ahora") antes del merge; CODEOWNER por `src/shared/core/version.ts`. `main` local alineado (ff-only `444274b..0639f3e`). PR: https://github.com/kalpa-droid/LEECV/pull/141.
- **Contenido (directiva `.opencode/plans/directiva-opencode-fix-pagos-F1-F2.md`)**: F1 — `useExportEntitlement` cuenta tokens pagos no consumidos por `user_id` directo **o** por email cuando `user_id` es null (`or(user_id.eq.<id>,and(user_id.is.null,email.eq.<email>))`), cubriendo pagos de invitado si `claimCreditsOnAuth` falló/demoró. F3 — `navigation.cleanQueryParams()` eliminado de las 3 salidas de `procesarRetornoPago()` (éxito PayPal, catch PayPal, Mercado Pago) y movido al final del polling de 3 intentos (`claimCreditsOnAuth` + `refreshEntitlements`) en `App.tsx`; recargar durante el polling ya no pierde el retorno. F2 — nueva migración idempotente `supabase/migrations/20261119_fix_admin_notification_types.sql` (DROP IF EXISTS + ADD) que agrega `manual_payment_claim` al CHECK de `admin_notifications` junto a todos los types ya usados. Tests: `tests/payments/exportEntitlementFallback.test.ts` (2) + mock de `.or()` actualizado en `useExportEntitlement.test.ts` (7/7).
- **⚠️ PENDIENTE de Kalpa (F2)**: aplicar `20261119_fix_admin_notification_types.sql` en el SQL Editor de Supabase (idempotente). Sin ella, `enviarComprobanteManual` sigue insertando la notificación con error silencioso y el admin no se entera del comprobante.
- **Estado del código**: `version.ts` = **V2.24.1** en `main` @ `0639f3e2`. Deploy automático tras el push. Asientos post-merge pendientes en working tree (viajan en el próximo PR de trabajo).
- **Verificación en prod sugerida**: pagar como invitado → login con mismo email → créditos visibles sin recargar manualmente; recargar durante el polling de retorno → créditos aparecen; comprobante manual → notificación visible en /admin tras aplicar la migración.
- **Instrucción para el siguiente agente**: (1) Aplicar la migración F2 en prod (Kalpa). (2) Recordar la directiva F1-F2: el bump PATCH va en el mismo commit. (3) Pendiente heredado: `20261118_unclaimed_credits_retention.sql` sigue sin aplicar en prod.

## [2026-11-19] - Merge PR #142 (Fix Panel Admin Fases A/B/C, V2.24.2)
- **Merge #142 confirmado TRIPLE FUENTE**: `main` = `4cc20fcc651bb1575a72ba3604f9930a821d6a3e` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI `check-all` **success** (run 44458777896, 1m0s); Vercel pass. Merge squash (SIN --delete-branch; rama `feat/fix-admin-panel-v2.24` conservada). Aprobación de Kalpa en sesión ("aprobado") antes del merge; CODEOWNER por `src/shared/core/version.ts`. `main` local alineado (ff-only `0639f3e..4cc20fc`). PR: https://github.com/kalpa-droid/LEECV/pull/142.
- **Contenido (directiva `.opencode/plans/directiva-opencode-fix-admin-panel.md`, 8 bugs)**: Fase A — A1 header de UsersTab sin "(listCustomers)"; A2 mensaje de WhatsApp corregido (ahora LEECV escribe al cliente); A3 `loadLogs`/`loadAuditLogs` de AuditAndErrorsTab migrados a `withErrorHandling()` (Regla 1). Fase B — 80 ocurrencias de `rounded-[${radius.X}]` migradas a `style={{ borderRadius: radius.X }}` (Regla 2) en AdminLogin (6), AdminDashboard (8), ProcessedPaymentsTab (6), SentryReportsTab (7), StorageDriveTab (6), AiTelemetryTab (15) y TemplateManagementTab (32); los className sin interpolaciones pasaron a string literal. Fase C — C1 telemetría IA auto-recarga al cambiar fecha/endpoint (cooldowns solo al montar); C2 labels de IndexedDB aclarados como navegador local; C3 optional chaining en `selectedPreset?.palette?.primary`; C4 `searchQuery` en deps de ProcessedPaymentsTab con debounce 350ms (patrón AdminDashboard).
- **Estado del código**: `version.ts` = **V2.24.2** en `main` @ `4cc20fc`. Deploy automático tras el push. Sin migraciones SQL ni cambios en `api/`.
- **Verificación en prod sugerida**: abrir /admin → tabs Pagos procesados (buscar sin apretar Enter), Telemetría IA (cambiar fecha/endpoint y ver que la tabla se recargue sola), Almacenamiento (labels nuevos), Plantillas (generar armonía de color) y Usuarios (header limpio + botón WA con mensaje correcto).
- **Notas de sesión**: `AGENTS.md` y `docs/APP_BLUEPRINT.md` ya estaban staged en el working tree y se dejaron FUERA del PR #142 a propósito (trabajo en paralelo del usuario), junto con cambios en `api/_lib/aiProviders/*` y `api/cv-import-api.ts`. `tsconfig.tsbuildinfo` tampoco se commitea.
- **Instrucción para el siguiente agente**: (1) Siguen pendientes en prod las migraciones `20261118_unclaimed_credits_retention.sql` y `20261119_fix_admin_notification_types.sql` (Kalpa). (2) Regla 10 de AGENTS.md ahora tiene 7 pilares: toda asistencia IA pasa por `aiClient.executeAiTask()` / `api/_lib/aiTasks/catalog.ts` y toda app nueva entrena a Lidio en `app_guide_assistant`. (3) Bump de `version.ts` en el mismo commit en toda PR de trabajo.

## [2026-11-19] - Export PDF y créditos, Fase A (PR #144, V2.24.3)
- **Merge #144 confirmado TRIPLE FUENTE**: `origin/main` = `40bedfc5c656e733964e4280aee3e3050c126a19`. CI GitHub Actions `check-all` **success** (run 44462072717); Vercel pass. Merge squash (rama `fix/export-credits-phase-a` conservada). Aprobado por Kalpa ("si mergea todo"). PR: https://github.com/kalpa-droid/LEECV/pull/144.
- **Directiva**: `.opencode/plans/directiva-fix-export-creditos.md`, ejecutada por OpenCode en la rama `fix/export-credits-phase-a` en un worktree aislado (`LEECV.worktrees/fix-export-credits-phase-a`).
- **E1 bypass de créditos**: `src/app/AppModals.tsx` ahora pasa `onConfirm={proceedWithExport}` a `PdfCheckoutModal` (antes `triggerPdfGeneration`, que generaba el PDF sin validar ni consumir crédito). `proceedWithExport` valida/consume y recién entonces llama a `handleStartPDFGeneration`.
- **Cobro único (desvío aprobado por Kalpa)**: se quitó el `consumeCreditIfNeeded()` interno de `PdfCheckoutModal.handleConfirmExport` (hoy solo llama a `onConfirm()` con guard `isProcessing`). El llamador es el único gate: `proceedWithExport` (CV), `handleExportPdf`/`handleExportDocx` (cartas) y `CardSheetExportSelector.handleExport` (tarjetas). Antes había doble cobro latente en CV y en cartas.
- **E2 (Regla 1)**: `handleStartPDFGeneration` en `src/app/App.tsx` migrado a `withErrorHandling()` (contexto "Exportar PDF", toast de error; se mantienen `setPdfProgress`/`setIsPdfComplete`).
- **E3 (Regla 2)**: 20 ocurrencias `rounded-[${radius.X}]` migradas a `style={{ borderRadius: radius.X }}` en `PdfCheckoutModal` (9), `CoverLetterExportModal` (2) y `CardSheetExportSelector` (9); los `className` sin interpolaciones pasaron a string literal. Se usaron los valores reales del token (`modal` 16px, `card` 12px, `control` 10px).
- **E7**: comentario en `CardExportModal` que documenta que el consumo de crédito vive en `CardSheetExportSelector`.
- **Estado del código**: `version.ts` = **V2.24.3** en commit `40bedfc`.

## [2026-11-19] - OpenRouter con Modelos Libres + Regla 10 y Blueprint Nativo 7 Pilares (PR #143, V2.25.0)
- **Merge #143 confirmado TRIPLE FUENTE**: `origin/main` = `b6bd654ae3fef300c16c9a4c29a9116c793ff295` (API gh pr view mergeCommit + git log origin/main -1 + git ls-remote origin main idénticos). CI GitHub Actions `check-all` **success** (run 44464535420); Vercel preview pass. Merge squash (rama `feat/openrouter-and-native-app-blueprint` conservada). Aprobado por Kalpa ("si mergea todo"); CODEOWNER por `src/shared/core/version.ts`. `main` local alineado (`ff-only` a `b6bd654`). PR: https://github.com/kalpa-droid/LEECV/pull/143.
- **OpenRouter AI Provider (`api/_lib/aiProviders/openrouter.ts`)**:
  - Integración nativa compatible con OpenAI SDK endpoint de OpenRouter (`openrouter.ai/api/v1`).
  - Soporte explícito para modelos gratuitos (`:free`) con costo $0 en `costCalculator.ts`.
  - Soporte de visión multimodal (imágenes para OCR), JSON schema guidance y health ping.
  - Rotación y fallback de API keys (`OPENROUTER_API_KEYS` / `OPENROUTER_API_KEY`).
  - Integrado a la cascada canónica: `['groq', 'openrouter', 'gemini']` en `registry.ts` y `cv-import-api.ts`.
- **Regla 10 en `AGENTS.md` (7 Pilares Canónicos Innegociables para Apps y Subproductos Nativos)**:
  1. Identidad y Capacidades en el Registro Central (`DOCUMENT_TYPE_REGISTRY` / `CAPABILITY_REGISTRY`).
  2. Formularios y Paneles Dinámicos canónicos (`<Field />`, `<RepeatableSection />`, `resolveSectionIconId()`, sin clases interpoladas).
  3. Motor PDF Universal y Visor Centralizado (Preset + DataAdapter, controles unificados de zoom y centrado en vivo).
  4. Gating de Créditos y Pasarela Unificada (`useExportEntitlement`, `consumeCreditIfNeeded`, `PdfCheckoutModal`).
  5. Alta, Login y Reclamo de Créditos Idempotente (`claimCreditsOnAuth(user)`).
  6. Trazabilidad y Observabilidad Obligatoria (`withErrorHandling()`, log automático a `admin_error_logs`).
  7. Motor de IA Unificado y Entrenamiento Obligatorio de Lidio (`aiTasks/catalog.ts`, `app_guide_assistant`).
- **Blueprint Técnico Integral (`docs/APP_BLUEPRINT.md`)**:
  - Especificación exhaustiva de arquitectura nativa, diagramas de flujo, scaffolding paso a paso y checklist pre-merge.
- **Estado del código**: `version.ts` = **V2.25.0** en `main` @ `b6bd654`. Deploy automático en producción via Vercel tras el merge.
- **Instrucción para el siguiente agente**: (1) Siguen pendientes en prod las 2 migraciones SQL heredadas (`20261118_unclaimed_credits_retention.sql` y `20261119_fix_admin_notification_types.sql`). (2) Cualquier subproducto nuevo DEBE seguir `docs/APP_BLUEPRINT.md` y entrenar a Lidio en `app_guide_assistant`. (3) Bump de `version.ts` en el mismo commit en toda PR de trabajo.
