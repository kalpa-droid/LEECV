# LEECV — Panel de Admin + Pagos: guía de implementación

## 0. Antes que nada
Revocá el token de GitHub que compartiste en el chat (GitHub → Settings → Developer settings →
Personal access tokens) y generá uno nuevo si lo seguís necesitando.

## 1. Copiar los archivos a tu repo
- `supabase/migration.sql` → correlo en Supabase Dashboard → SQL Editor.
- `src/services/authService.js`, `adminService.js`, `paymentService.js` → a tu carpeta `src/services/`.
- `src/components/admin/AdminLogin.jsx`, `AdminDashboard.jsx` → a `src/components/admin/`.
- `api/*.js` → a una carpeta `api/` en la RAÍZ del repo (Vercel las detecta solas como funciones serverless).

## 2. Instalar dependencia que falta
```bash
npm install crypto-js
```
(en realidad `crypto` del webhook de Lemon Squeezy es built-in de Node, no hace falta instalar nada extra).

## 3. Variables de entorno en Vercel (Project Settings → Environment Variables)
| Variable | De dónde sale |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Ya las tenés (Supabase → Settings → API) |
| `SUPABASE_URL` | Misma URL, sin el prefijo `VITE_` (para las funciones server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` (secreta, NUNCA la pongas con prefijo `VITE_`) |
| `MP_ACCESS_TOKEN` | Mercado Pago → Tus integraciones → Credenciales de producción |
| `MP_PRECIO_ARS` | Ej: `4999` |
| `SITE_URL` | `https://tu-dominio.vercel.app` |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy → Settings → Webhooks (al crear el webhook) |
| `VITE_LEMONSQUEEZY_CHECKOUT_URL` | Lemon Squeezy → Products → tu producto → Share |

## 4. Habilitar login de usuarios
En Supabase → Authentication → Providers, dejá activo "Email". Para crear tu primer usuario admin:
1. Andá a tu web y usá `supabase.auth.signUp({ email, password })` una vez (podés hacerlo desde
   la consola del navegador o armando un formulario de registro simple).
2. En Supabase → SQL Editor corré:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-email@ejemplo.com';
   ```

## 5. Conectar el botón "Hacete Premium"
En tu `Navbar.jsx` o donde tengas el botón de premium, llamá a:
```js
import { iniciarPagoMercadoPago, iniciarPagoLemonSqueezy } from '../services/paymentService';
// según el país detectado o un selector, llamás a una u otra
```

## 6. Configurar el webhook en Mercado Pago
Mercado Pago → Tus integraciones → Webhooks → agregar `https://tu-dominio.vercel.app/api/mercadopago-webhook`,
evento "Pagos".

## 7. Configurar el webhook en Lemon Squeezy
Lemon Squeezy → Settings → Webhooks → agregar `https://tu-dominio.vercel.app/api/lemonsqueezy-webhook`,
eventos `order_created` y `subscription_payment_success`. Copiá el "Signing secret" a `LEMONSQUEEZY_WEBHOOK_SECRET`.

## 8. Ruta del panel de admin
Como tu app no usa react-router, la forma más simple es renderizar `<AdminDashboard />` cuando la URL
sea `/admin`. En tu `main.jsx`:
```js
const path = window.location.pathname;
const RootComponent = path === '/admin' ? AdminDashboard : App;
createRoot(document.getElementById('root')).render(<RootComponent />);
```

## Lo que queda pendiente (no crítico para arrancar)
- Gestión de plantillas/colores desde el panel (hoy vive hardcodeada en el código).
- Monitoreo de espacio consumido en Supabase/almacenamiento.
- Métricas de "CVs creados / descargas por día" — hoy eso vive solo en el localStorage de cada
  usuario, así que si lo querés agregado a nivel global hay que empezar a loguear esos eventos
  en una tabla de Supabase.
