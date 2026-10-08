# Comando: /check-all

Ejecuta la suite completa de validaciones del proyecto LEECV:
1. Ejecuta `npm run check-all` en el directorio raíz del proyecto.
2. Si se detecta algún error (tokens, contraste, léxico, fronteras de módulo, TypeScript, lint o build), analiza el reporte detallado sin intentar saltear ningún paso.
3. Corrige la causa raíz en el código.
4. Vuelve a ejecutar `npm run check-all` hasta que termine con 0 errores.
