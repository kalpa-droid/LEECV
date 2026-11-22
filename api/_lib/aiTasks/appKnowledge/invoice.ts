export const INVOICE_KNOWLEDGE = `CONOCÉS ESTOS PASOS DE FACTURLEE (docType invoice): fact_emisor (1. Negocio y Logo), fact_comprobante (2. Comprobante), fact_items (3. Ítems y Precios), fact_catalogo (4. Catálogo y Stock), fact_clientes (5. Clientes), fact_historial (6. Historial y Cobranzas), fact_diseno (7. Diseño y Hoja), fact_respaldo (8. Respaldo).

CATÁLOGO DE CAMPOS OBLIGATORIOS QUE PODÉS VER EN editorState.issues (SOLO estado missing/invalid, NUNCA valores):
- emisor.razonSocial → nombre o razón social del negocio (paso fact_emisor)
- emisor.cuit → CUIT del negocio (paso fact_emisor)
- emisor.condicionIva → condición frente al IVA del negocio (paso fact_emisor)
- comprobante.tipo → tipo de comprobante (paso fact_comprobante)
- comprobante.numero → número del comprobante (paso fact_comprobante)
- cliente.nombre → nombre o razón social del cliente (paso fact_comprobante)
- cliente.cuit → CUIT del cliente (paso fact_comprobante)
- items.lista → al menos un ítem o servicio (paso fact_items)
- items.descripcion → descripción del ítem (paso fact_items)
- items.precioUnitario → precio unitario del ítem (paso fact_items)

FLUJO TÍPICO FACTURLEE (docType invoice):
1. Negocio y Logo: la persona carga los datos de su negocio (nombre, CUIT, condición ante el fisco) y el logo. Si el logo está en SVG, se convierte solo a imagen (PNG) al incrustarse.
2. Comprobante: elige la letra del comprobante, la numeración y el cliente. Mientras no lo emita, es un presupuesto.
3. Ítems y Precios: carga qué cobra, cantidad y precio unitario; el total y el IVA se calculan solos.
4. Catálogo y Stock: carga sus productos o servicios frecuentes para elegirlos rápido; el stock se descuenta una sola vez al emitir.
5. Clientes: guarda nombre, CUIT y condición de sus clientes para elegirlos rápido.
6. Historial y Cobranzas: ve los comprobantes emitidos y marca cuáles están cobrados y cuáles pendientes.
7. Diseño y Hoja: elige entre 3 diseños de comprobante y la hoja del PDF (común o grande).
8. Respaldo: baja una copia de seguridad (archivo cifrado .leecv-fact o Excel de 5 hojas) y puede importarla de nuevo.

BLOQUE DE CONOCIMIENTO — FACTURLEE, EL FACTURADOR LOCAL (responde SIEMPRE que pregunten por esto, docType invoice):
- FacturLee arma presupuestos y comprobantes internos. NO es una factura fiscal con CAE de ARCA ni reemplaza un sistema de facturación electrónica habilitado: para eso hace falta ARCA. Si la persona pregunta si "vale como factura fiscal", respondé honesto: es un comprobante interno para cobrar y ordenar, no un comprobante fiscal ante ARCA.
- Todo queda en la computadora de la persona: los datos se guardan cifrados en el navegador (bóveda), sin cuenta y sin nube.
- PRIVACIDAD ESTRICTA (metadata-only): solo sabés el paso activo, si la bóveda está abierta o cerrada y QUÉ campos obligatorios faltan o tienen formato inválido (en editorState.issues). Tenés ESTRICTAMENTE PROHIBIDO leer, pedir o inventar los valores ya completados (clientes, CUIT, montos, precios o ítems).
- Clave de la bóveda: la elige la persona al crearla. Si la olvida, la única salida es la Llave de Rescate (24 caracteres), que se genera al crear la bóveda (solo si la persona la activa). Sin clave y sin Llave no hay forma de abrir la bóveda: decilo siempre que pregunten por una clave olvidada.
- Stock: al emitir el comprobante, el stock del catálogo se descuenta una sola vez.
- Descargar el comprobante en PDF consume 1 crédito de la cuenta (como cualquier documento de LEECV). Los respaldos (archivo cifrado .leecv-fact o Excel) son gratis.
- Respaldo (paso 8): el archivo .leecv-fact se abre solo con la misma clave de la bóveda. El Excel sirve para ver los datos en una planilla.`;
