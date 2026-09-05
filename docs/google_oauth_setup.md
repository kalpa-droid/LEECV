# Guía Paso a Paso — Configuración y Verificación de Google OAuth Consent Screen

Esta guía documenta los pasos necesarios para publicar y verificar la aplicación LEECV en Google Cloud Console para el uso del scope sensible de Google Drive API (`https://www.googleapis.com/auth/drive.file`).

---

## 1. Acceso a Google Cloud Console

1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/).
2. Selecciona el proyecto asociado a las credenciales de OAuth de LEECV (`GOOGLE_CLIENT_ID`).
3. En el menú lateral izquierdo, ve a **APIs & Services → OAuth consent screen** (Pantalla de consentimiento de OAuth).

---

## 2. Configuración de la Pantalla de Consentimiento

Completa los campos requeridos en la pestaña **App information**:

- **App name**: `LEECV — Creador & Editor de CVs`
- **User support email**: Tu correo de soporte oficial (ej. `soporte@leecv.app`).
- **App logo**: Sube el logotipo oficial de LEECV (mínimo 120x120px).
- **App domain**:
  - **Application home page**: `https://leecv.app`
  - **Application privacy policy link**: `https://leecv.app/privacidad`
  - **Application terms of service link**: `https://leecv.app/terminos`
- **Authorized domains**: Añade `leecv.app` y `vercel.app`.
- **Developer contact information**: Tu dirección de correo de contacto.

---

## 3. Declaración de Scopes

En la pestaña **Scopes**:

1. Haz clic en **Add or remove scopes**.
2. Selecciona únicamente el permiso acotado de Google Drive:
   - `https://www.googleapis.com/auth/drive.file` (*Permiso para ver y gestionar archivos creados o abiertos por esta app*).
3. **Justificación de uso**: 
   > *"LEECV utiliza el permiso drive.file exclusivamente para guardar e importar respaldos de currículums creados por el propio usuario en una carpeta dedicada. LEECV no lee ni accede a ningún otro archivo personal del Google Drive del usuario."*

---

## 4. Publicación a Estado "In Production"

> [!WARNING]
> **Expiración de Refresh Tokens a los 7 Días**: Mientras la aplicación permanezca en estado **Testing**, Google revoca automáticamente los `refresh_token` de OAuth tras 7 días de inactividad, haciendo fallar los respaldos automáticos. Pasar a **In production** elimina este límite de 7 días.

1. En la pestaña **OAuth consent screen**, localiza la sección **Publishing status**.
2. Haz clic en **Publish App**.
3. Confirma la ventana de diálogo para cambiar el estado de **Testing** a **In production**.

---

## 5. Proceso de Verificación de Google

1. Al publicar una app que solicita un scope sensible (`drive.file`), Google iniciará el proceso de revisión.
2. Sube un breve video en un enlace privado (YouTube No Listado o Google Drive público) mostrando el flujo de consentimiento:
   - El usuario haciendo clic en "Conectar Google Drive" en LEECV.
   - La pantalla de consentimiento OAuth de Google mostrando el nombre `LEECV` y los permisos.
   - El retorno exitoso a LEECV y la generación del archivo de respaldo en Drive.
3. El equipo de revisión de Google enviará actualizaciones al correo de desarrollador (suele demorar entre 3 y 7 días hábiles).
