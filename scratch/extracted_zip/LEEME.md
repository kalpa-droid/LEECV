# Vista vectorial única — qué cambió y por qué

## 1. Instalar la dependencia que falta
```bash
npm install pdfjs-dist
```

## 2. Reemplazar 3 archivos
- `src/shared/core/pdf-engine/VectorDocViewer.tsx` → **nuevo**. El visor universal.
- `src/modules/cv-builder/components/CVPreview.tsx` → reemplaza el archivo completo (se sacó
  el toggle "PDF Vectorial / Vista HTML Web", `<PDFViewer>` y ~210 líneas de la vista HTML vieja
  con la paginación por conteo de caracteres).
- `src/modules/cv-builder/components/pdf/CvPdfDocument.tsx` → mismo archivo, con el fix de margen
  (el padding pasó de las columnas a la `<Page>`, para que se repita en cada hoja generada).

## 3. Por qué esto soluciona lo 3 que reportaste

**"¿Para qué dos vistas?"** — ya no hay dos. `CVPreview.tsx` ahora solo llama a `<VectorDocViewer>`,
que es el único camino. La vista HTML que estimaba alturas contando caracteres desapareció.

**"En el celular no se ve"** — `<PDFViewer>` de react-pdf usa un `<iframe>` que depende de que el
navegador tenga un plugin nativo de PDF, algo que Chrome/Safari en celular no traen (es un issue
abierto y reconocido por los mantenedores de la librería, sin arreglo previsto). `VectorDocViewer`
no usa iframe: genera el mismo PDF con `@react-pdf/renderer` y lo dibuja con `pdf.js` sobre un
`<canvas>`, página por página — eso sí anda en cualquier navegador, PC o celular, porque no depende
de ningún plugin.

**"No respeta el margen arriba en una hoja"** — el padding vivía en `leftColumn`/`rightColumn`
(dentro del contenido), y cuando react-pdf corta esas columnas en varias hojas, el padding de
arriba solo se aplicaba al primer fragmento — las hojas de continuación quedaban pegadas al borde.
Ahora el padding vertical (28pt arriba y abajo) vive en la `<Page>` misma, que sí se repite
idéntica en cada hoja que el motor genera, sin importar dónde caiga el corte.

## Nota de bundle
El worker de pdf.js pesa ~1.2MB — Vite lo separa en su propio chunk aparte (`pdf.worker.min-*.mjs`)
así que no infla el bundle principal ni bloquea la carga inicial de la página.
