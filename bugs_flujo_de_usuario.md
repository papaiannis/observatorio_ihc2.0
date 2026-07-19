# Bugs y brechas en el flujo de usuario — Observatorio IHC 2.0

**Fecha del análisis:** 2026-07-16
**Método:** Comparación entre la especificación de diseño del MVP (3 roles: Invitado/Entusiasta/Especialista, rutas Expo Router agrupadas, Zustand, panel de curaduría en 4 clics, etc.) y el código real del repositorio (backend Express/Supabase + frontend Expo Router).

Cada hallazgo indica severidad, evidencia (archivo:línea) e impacto en el flujo de usuario real.

---

## 1. Sin guardias de sesión ni de rol en el frontend

**Severidad:** Crítica

- `frontend/src/app` es un `<Stack>` plano — no existen los grupos de rutas `(public)/(auth)/(tabs)/(curaduria)` previstos en el diseño.
- El único `_layout.tsx` (`frontend/src/app/_layout.tsx`) no contiene ninguna lógica de redirect por sesión o rol.
- `frontend/src/app/index.tsx:5` redirige siempre a `/bienvenida`, sin comprobar si hay sesión activa.
- Cualquier usuario (sin login) puede navegar directamente a `/observatorio` u otras pantallas internas; solo las llamadas a la API fallarían por falta de token, pero la UI no lo previene ni redirige.

**Impacto:** Pantallas pensadas como "zona logueada" son accesibles sin autenticación; mala UX (pantallas rotas/vacías) y superficie de ataque innecesaria.

---

## 2. `role` del perfil es solo cosmético, nunca controla acceso

**Severidad:** Alta

- `authStore.ts`, `ProfileDrawer.tsx`, `SightingTrackingScreen.tsx:143` leen `user.role` únicamente para mostrar badges o textos condicionales ("Un especialista ha abierto una discusión...").
- No hay ningún punto del frontend donde `role !== 'Especialista'` bloquee una acción o ruta.
- El rol `'Entusiasta'` no existe como valor verificado en ningún lugar del código (ni frontend ni backend) — solo aparece como opción de formulario en `registro.tsx` (`experto` | `entusiasta`).

**Impacto:** Un "Entusiasta" podría, en teoría, llegar a cualquier pantalla o acción que debiera ser exclusiva de "Especialista", si esa pantalla existiera y no dependiera 100% de que el backend rechace la petición.

---

## 3. Panel de curaduría de especialista: no existe en el frontend

**Severidad:** Crítica (funcionalidad core ausente)

- Búsquedas exhaustivas de "curaduria", "validar", "pendiente", "estrella/rating", "buscar especie" en `frontend/src` no arrojan resultados.
- La identificación de especie en la captura de un avistamiento es un `TextInput` libre (`SightingFormScreen.tsx:319-324`, campo `preliminary_species`), no un buscador/selector contra la tabla `species`.
- La única mención de "especialista" en el frontend es texto de solo lectura mostrado al entusiasta en `SightingTrackingScreen.tsx` (líneas ~324, 330, 363) — no hay pantalla de trabajo para que el especialista valide, rechace o califique.

**Impacto:** Ningún especialista puede hacer curaduría desde la app móvil hoy, aunque el backend tiene parte de la lógica lista (ver punto 4). Esta es la brecha más grande entre el diseño y la app real.

---

## 4. Backend: dos sistemas de curaduría paralelos, ninguno completo

**Severidad:** Alta

Existen dos flujos independientes que deberían ser uno:

- **`sightings`** (`sighting.controller.ts` + trigger SQL real `handle_sighting_status_change` en `sightings_setup.sql`): sí escribe automáticamente en `curation_logs` y `notifications`, pero el endpoint de validación **no acepta calificación 1-5 estrellas**.
- **`investigation_contributions`** (`contribution.controller.ts`): sí acepta `expert_rating` 1-5 (validado con Zod) y busca especie en la tabla `species`, pero **no tiene ningún trigger o log de auditoría versionado** en el repo (el comentario en el código dice "el trigger de la BD se encarga del log", pero ese trigger no existe en ningún SQL del repositorio).

**Impacto:** Según qué flujo termine usando el frontend, faltará o el rating o la auditoría. Son candidatos a unificarse, no a arreglarse por separado.

---

## 5. `reputation` del perfil nunca se escribe

**Severidad:** Alta

- Grep exhaustivo sobre `backend/src` confirma que ningún archivo hace `UPDATE`/`.update()` sobre el campo `reputation`.
- Solo se **lee** en `backend/src/services/profile.service.ts:11`.

**Impacto:** El sistema de reputación descrito en el diseño (el entusiasta "gana reputación basada en calificaciones de especialistas") no funciona: el valor nunca cambia sin importar cuántas validaciones reciba el usuario.

---

## 6. Estado de apelación: `in_review`, no `en_revision`

**Severidad:** Baja (nombrado, no funcional) — pero indica posible confusión de contrato

- El estado real usado en ambos flujos (`sighting.controller.ts`, `contribution.controller.ts`, y el `CHECK` de `sightings_setup.sql:14`) es `'in_review'` (inglés).
- El literal `'en_revision'` (español) solo existe en un módulo legado y desconectado: `backend/src/models/ObservationRepository.ts` / `identificacion.service.ts`, que no está enlazado al flujo real de `sightings` ni de `investigation_contributions`.

**Impacto:** Si algún código nuevo (frontend u otro backend) compara contra `'en_revision'` esperando que coincida con el estado real, la comparación fallará silenciosamente.

---

## 7. GPS no viene de EXIF de la foto, sino del GPS del dispositivo en el momento

**Severidad:** Informativo (diverge del diseño, no es un bug funcional confirmado)

- No existe la librería `exifr` (ni ninguna otra de lectura EXIF) en el proyecto.
- El GPS se obtiene con `expo-location` en el momento de llenar el formulario (`SightingFormScreen.tsx:94-108`), no extrayendo metadatos de la imagen capturada.

**Impacto:** Si el usuario sube una foto tomada antes (o en otro lugar) y luego completa el formulario en otra ubicación, el GPS registrado será el de ese momento, no el de la foto — puede introducir error de geolocalización sin que el usuario lo note (a diferencia de extraer EXIF, que sería más preciso para fotos ya tomadas). Vale la pena confirmar con el usuario si este es el comportamiento deseado o un bug real.

---

## 8. Mapas: sin `react-native-maps`, y sin dibujo de polígonos en ningún lugar

**Severidad:** Alta (para el flujo de especialista)

- El mapa real es un `WebView` con Leaflet/OpenStreetMap (`SightingFormScreen.tsx:263-308`), no `react-native-maps`.
- No existe ninguna funcionalidad de dibujar polígonos (`grep -rin "polygon|polígono"` sin resultados) en ningún componente, incluyendo los relacionados a proyectos/investigaciones (`ProjectDetailScreen.tsx`, `ProjectListScreen.tsx`).

**Impacto:** Un especialista no puede definir el área geográfica (`area_geom`) de una investigación desde la app — funcionalidad descrita en el diseño pero inexistente.

---

## 9. Persistencia de sesión sin cifrado

**Severidad:** Media

- El JWT se guarda en texto plano vía `AsyncStorage` (nativo) o `localStorage` (web) en `frontend/src/utils/authStore.ts:20-32`, no en `expo-secure-store` (no está instalado).
- `frontend/src/app/welcome.tsx:6-8`: el botón de "logout" solo hace `router.replace('/')` — **no llama a `authStore.clearSession()`**, por lo que el token queda persistido aunque el usuario "cierre sesión" desde esa pantalla. El comentario en el código (`// Aquí se limpiaría el SecureStore en el futuro.`) confirma que es una omisión conocida y no resuelta.

**Impacto:** (a) el token es legible por cualquier proceso/app con acceso al almacenamiento del dispositivo; (b) el "logout" desde `welcome.tsx` no cierra sesión realmente — el usuario puede seguir autenticado sin saberlo.

---

## 10. Verificación de rol en endpoints backend: depende 100% de RLS no verificable

**Severidad:** Alta (seguridad)

- `GET /contributions/pending`, `PATCH /contributions/:id/validate|appeal`, `GET /species/search`, `GET /export/csv` tienen comentarios "Solo Especialistas/Administradores" pero **ningún chequeo de rol real en el controller**.
- No hay DDL versionado en el repo para verificar si las políticas RLS de Supabase realmente restringen estas tablas por rol — solo `sightings_setup.sql` existe, y solo cubre `sightings`.
- El único endpoint con verificación de rol explícita en código es `GET /sightings/pending` (`sighting.controller.ts:64`).

**Impacto:** Si el RLS real en Supabase no restringe por rol (no se puede confirmar desde el repo), cualquier usuario autenticado —incluyendo un "Entusiasta"— podría leer contribuciones pendientes, exportar el CSV científico completo, o acceder a acciones de curaduría vía API directa, incluso sin tener panel en la app.

---

## Resumen por severidad

| Severidad | Hallazgos |
|---|---|
| Crítica | #1 (sin guardias de ruta), #3 (panel de curaduría inexistente) |
| Alta | #2 (role cosmético), #4 (dos sistemas de curaduría), #5 (reputation no se escribe), #8 (sin polígonos), #10 (roles sin verificar en backend) |
| Media | #9 (sesión sin cifrar / logout incompleto) |
| Baja / Informativo | #6 (nombre de estado distinto), #7 (GPS del dispositivo vs EXIF) |

## No son bugs — funcionan como se espera

- Encuesta dinámica desde `survey_questions` (`ProjectDetailScreen.tsx`).
- Bandera `metadata_edited` (cubre fecha/hora/ubicación editada).
- Suscripción a investigaciones: valida estado activo y evita duplicados (constraint UNIQUE + manejo de error `23505`).
- Exportación CSV Darwin Core: filtra correctamente solo datos `validated`.

---

*Ver también `api_documentation2.0` para la spec de endpoints del backend, y el análisis de deuda técnica general (archivos duplicados, ambigüedad de `SUPABASE_KEY`, CORS abierto) que no está incluido aquí por no ser específico del flujo de usuario.*
