# Instrucciones de prueba — Sesión del 19/07

Cambios de esta sesión: (1) fix de un bug de build que impedía compilar el frontend, y (2) nueva funcionalidad en la pantalla de Seguimiento de avistamiento (tracking) que muestra quién validó el avistamiento.

## 0. Prerrequisitos

- Repo en la rama `apelaciones`, con los cambios de esta sesión (backend + frontend) ya commiteados/aplicados.
- Node.js ≥ 20 instalado.
- `backend/.env` con las variables de Supabase configuradas (ya existe en el repo).

## 1. Levantar el backend localmente

El endpoint nuevo (`GET /sightings/:id`) todavía no está desplegado en producción (Render), así que hay que correr el backend local para probarlo.

```bash
cd backend
npm install   # solo si es la primera vez
npm run dev
```

Debe quedar escuchando en `http://localhost:8000` (verás en consola: `🚀 BioLife API (Node.js) iniciada en el puerto 8000`).

## 2. Levantar el frontend apuntando al backend local

```bash
cd frontend
npm install   # solo si es la primera vez
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web
```

Se abre en `http://localhost:8081` (o el puerto que indique la consola). Importante: si corrés `npx expo start --web` sin la variable `EXPO_PUBLIC_API_URL`, la app va a apuntar al backend de producción y no vas a ver los cambios nuevos.

## 3. Cuentas necesarias

Se necesitan **dos cuentas**: una **Entusiasta** (sube el avistamiento) y una **Especialista** (lo valida).

- Cuenta Especialista de prueba: revisar `TEST_SPECIALIST_EMAIL` / `TEST_SPECIALIST_PASSWORD` en `backend/.env`.
- Cuenta Entusiasta: usar una ya existente.

⚠️ **Aviso**: la pantalla de Registro (`/registro`) llama a `POST /api/v1/auth/register`, endpoint que no existe en el backend (solo existe `/auth/login`). Crear cuenta nueva desde la app da 404. Si hace falta un usuario Entusiasta nuevo, crearlo directo en el dashboard de Supabase (Authentication → Add user) + una fila en la tabla `profiles` con `role = 'Entusiasta'`.

## 4. Probar el fix de build

```bash
cd frontend
npx tsc --noEmit
```
`index.tsx` y `SightingDetailScreen.tsx` **no** deben aparecer en la lista de errores. (Van a seguir apareciendo ~20 errores de tipos en archivos viejos sin usar como `explore.tsx` o `app-tabs.tsx` — son preexistentes, no bloquean nada.)

Verificación visual:
- Abrir `http://localhost:8081/` → debe redirigir a la pantalla de Bienvenida sin pantalla en blanco ni error rojo.
- Abrir el detalle de cualquier avistamiento desde el feed → debe deslizar suavemente al entrar y al volver atrás (antes esa animación estaba desconectada y no se veía).

## 5. Probar "quién validó" (pantalla de Seguimiento)

1. Loguearse como **Entusiasta**.
2. Subir un avistamiento nuevo (botón "+" → cámara → completar formulario). Queda en estado **Pendiente**.
3. Cerrar sesión (drawer de perfil → Cerrar Sesión) → loguearse como **Especialista**.
4. Perfil → **Panel de Curaduría** → tocar el avistamiento recién creado → buscar y seleccionar la especie → **Validar**.
5. Cerrar sesión → volver a loguearse como el **Entusiasta** original.
6. Perfil → **Mis Avistamientos** → el avistamiento debe aparecer con la pill **"Validado"** y ahora sí ser tocable (antes esa fila no reaccionaba al tap).
7. Tocarlo → pantalla de **Seguimiento**: el timeline debe estar en el paso "Publicada", y dentro del panel verde debe verse una tarjeta **"Validado por @[usuario-especialista]"** con avatar y fecha.

Regresión rápida: confirmar que un avistamiento **rechazado** o **en revisión** sigue mostrando el panel de apelar igual que antes.

## 6. Cortar los servidores al terminar

```bash
lsof -ti:8000 -ti:8081 | xargs kill -9
```
