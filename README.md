# LEECV — Generador de Currículum Profesional

LEECV es una plataforma web para diseñar, redactar y generar documentos profesionales (Currículum Vitae, Cartas de Presentación, Tarjetas Personales y Libros/Portafolios) con calidad de impresión y compatibilidad con sistemas ATS (Applicant Tracking Systems).

## Características Principales

* **Document Engine**: Arquitectura robusta para manejar diferentes tipos de documentos con un formato unificado.
* **Diseño para Impresión**: Motor de PDF basado en `@react-pdf/renderer` para garantizar medidas exactas (A4), marcas de corte y sangrado.
* **Sistemas ATS**: Análisis e integración nativa de inteligencia artificial (Gemini) para asegurar que los currículums pasen los filtros de selección.
* **Diseño Dinámico**: Modos claro, oscuro y de alto contraste (WCAG 2.1 AA), preajustes de color armonizados y utilidades modernas de Tailwind v4.
* **Procesamiento Local Seguro**: Funciona 100% en el navegador, preservando la privacidad del usuario sin almacenar datos no deseados en la nube.
* **PWA**: Instalable como aplicación local.

## Scripts Disponibles

* `npm run dev`: Inicia el servidor de desarrollo en el puerto 3000.
* `npm run build`: Ejecuta el chequeo de tipos de TypeScript y compila para producción.
* `npm run check-all`: Ejecuta la suite completa de tests, reglas de gobernanza, contraste, validación de PDFs y auditoría de tokens. ¡Requerido antes de hacer commit en ramas principales!

## Tecnologías Principales

* **Framework**: React 19 + Vite 6
* **Estilos**: Tailwind CSS v4
* **PDF**: `@react-pdf/renderer` y herramientas especializadas (`pdf-lib`, `jspdf`)
* **Estado y Almacenamiento**: Zustand, IndexedDB
* **Backend y Base de Datos**: Vercel Serverless Functions, Supabase
* **Inteligencia Artificial**: Google Gemini API
* **Pagos**: MercadoPago, PayPal, LemonSqueezy

## Configuración y Despliegue

Ver el archivo `README-IMPLEMENTACION.md` para instrucciones detalladas sobre:
* Variables de entorno (`.env`) requeridas.
* Configuración de servicios de terceros (Google Drive, Pagos).
* Despliegue en Vercel.
