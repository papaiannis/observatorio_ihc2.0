/**
 * test-week3.ts
 * Script de prueba integral para los endpoints de la Semana 3.
 * Curaduría en 4 clics, feed con privacidad, exportación Darwin Core y notificaciones.
 *
 * Uso:
 *   npx tsx test-week3.ts
 *
 * Variables de entorno en .env:
 *   SUPABASE_URL, SUPABASE_KEY
 *   TEST_SPECIALIST_EMAIL, TEST_SPECIALIST_PASSWORD  (usuario con rol 'Especialista')
 *   API_URL (ej: https://ihcobservatorio2-202625.onrender.com/api/v1  o  http://localhost:8000/api/v1)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix de Windows: fuerza IPv4 primero para evitar timeouts de fetch (Undici)
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ override: true });

// La URL base del API
const API_BASE = process.env.API_URL ?? 'http://localhost:8000/api/v1';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const SPECIALIST_EMAIL = process.env.TEST_SPECIALIST_EMAIL!;
const SPECIALIST_PASSWORD = process.env.TEST_SPECIALIST_PASSWORD!;

let passed = 0;
let failed = 0;

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ` → ${detail}` : ''}`);
  if (ok) passed++; else failed++;
}

async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('text/csv')
    ? await res.text()
    : await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🔬 ===== TEST SEMANA 3: CURADURÍA, FEED Y EXPORTACIÓN =====\n');

  // ── PASO 1: Login como Especialista ─────────────────────────────────────────
  console.log('── PASO 1: Login como Especialista ──');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: SPECIALIST_EMAIL,
    password: SPECIALIST_PASSWORD,
  });

  if (authError || !authData.session) {
    log('Login Especialista', false, authError?.message ?? 'Sin sesión');
    console.log('\n🔴 No se puede continuar sin sesión de Especialista.');
    return;
  }

  const token = authData.session.access_token;
  log('Login Especialista', true, `usuario: ${authData.user?.email}`);

  // ── PASO 2: Obtener contribuciones pendientes ────────────────────────────────
  console.log('\n── PASO 2: GET /contributions/pending ──');
  const { status: pendingStatus, body: pendingBody } = await apiFetch(
    '/contributions/pending',
    {},
    token,
  );

  log('Status 200 /pending', pendingStatus === 200, `status: ${pendingStatus}`);
  log(
    'Respuesta tiene "contributions"',
    Array.isArray(pendingBody?.contributions),
    `count: ${pendingBody?.count ?? '?'}`,
  );

  const firstPending = pendingBody?.contributions?.[0];
  if (!firstPending) {
    console.log('⚠️  No hay contribuciones pendientes. Saltando pasos 3 y 4.');
  }

  // ── PASO 3: Buscar especie ───────────────────────────────────────────────────
  console.log('\n── PASO 3: GET /species/search?q=caimán ──');
  const { status: speciesStatus, body: speciesBody } = await apiFetch(
    '/species/search?q=caim%C3%A1n',
    {},
    token,
  );

  log('Status 200 /species/search', speciesStatus === 200, `status: ${speciesStatus}`);
  log(
    'Respuesta tiene "species" array',
    Array.isArray(speciesBody?.species),
    `found: ${speciesBody?.count ?? 0}`,
  );

  // También probar búsqueda con término muy corto (debe dar 400)
  const { status: shortQueryStatus } = await apiFetch('/species/search?q=a', {}, token);
  log('Query corta devuelve 400', shortQueryStatus === 400, `status: ${shortQueryStatus}`);

  // ── PASO 4: Validar contribución (si existe una pendiente y una especie) ──────
  console.log('\n── PASO 4: PATCH /contributions/:id/validate ──');
  if (firstPending && speciesBody?.species?.length > 0) {
    const speciesId = speciesBody.species[0].id;
    const { status: valStatus, body: valBody } = await apiFetch(
      `/contributions/${firstPending.id}/validate`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          validated_species_id: speciesId,
          expert_comment: 'Verificado por test automatizado de Semana 3.',
          expert_rating: 5,
        }),
      },
      token,
    );

    log('Status 200 al validar', valStatus === 200, `status: ${valStatus}`);
    log('Mensaje de validación presente', typeof valBody?.message === 'string', valBody?.message);
  } else {
    console.log('⚠️  Saltando validación (sin pendientes o sin especies en catálogo).');
  }

  // ── PASO 4B: Apelar contribución ─────────────────────────────────────────────
  console.log('\n── PASO 4B: PATCH /contributions/:id/appeal ──');
  // Intentar apelar con un UUID inventado → debe dar 500 o 404 (no 200)
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { status: appealStatus } = await apiFetch(
    `/contributions/${fakeId}/appeal`,
    { method: 'PATCH', body: JSON.stringify({ notes: 'Requiere revisión adicional.' }) },
    token,
  );
  log(
    'Appeal con ID inexistente no da 200',
    appealStatus !== 200,
    `status: ${appealStatus}`,
  );

  // ── PASO 5: Feed sin token (invitado) → coordenadas nulas ───────────────────
  console.log('\n── PASO 5: GET /feed (sin token, invitado) ──');
  const { status: feedGuestStatus, body: feedGuestBody } = await apiFetch('/feed');

  log('Status 200 feed público', feedGuestStatus === 200, `status: ${feedGuestStatus}`);
  log('authenticated = false', feedGuestBody?.authenticated === false);
  log('coordinates_visible = false', feedGuestBody?.coordinates_visible === false);

  const firstItem = feedGuestBody?.feed?.[0];
  if (firstItem) {
    log(
      'decimal_latitude es null para invitado',
      firstItem.decimal_latitude === null,
      `valor: ${firstItem.decimal_latitude}`,
    );
    log(
      'decimal_longitude es null para invitado',
      firstItem.decimal_longitude === null,
      `valor: ${firstItem.decimal_longitude}`,
    );
  } else {
    console.log('  ℹ️  Feed vacío, no se puede verificar privacidad de coordenadas.');
  }

  // ── PASO 5B: Feed con token (autenticado) → coordenadas visibles ─────────────
  console.log('\n── PASO 5B: GET /feed (con token, autenticado) ──');
  const { status: feedAuthStatus, body: feedAuthBody } = await apiFetch('/feed', {}, token);

  log('Status 200 feed autenticado', feedAuthStatus === 200, `status: ${feedAuthStatus}`);
  log('authenticated = true', feedAuthBody?.authenticated === true);
  log('coordinates_visible = true', feedAuthBody?.coordinates_visible === true);

  // ── PASO 6: Exportar CSV Darwin Core ─────────────────────────────────────────
  console.log('\n── PASO 6: GET /export/csv ──');
  const { status: csvStatus, body: csvBody } = await apiFetch('/export/csv', {}, token);

  log('Status 200 /export/csv', csvStatus === 200, `status: ${csvStatus}`);

  if (typeof csvBody === 'string') {
    const headers = csvBody.split('\r\n')[0] ?? csvBody.split('\n')[0];
    const hasDwcHeaders = headers.includes('dwc:occurrenceID') &&
      headers.includes('dwc:scientificName') &&
      headers.includes('dwc:decimalLatitude');
    log('CSV tiene cabeceras Darwin Core', hasDwcHeaders, `primera línea: ${headers.substring(0, 80)}...`);
  } else {
    log('Respuesta es texto CSV', false, 'No se recibió texto');
  }

  // Sin token debe dar 401
  const { status: csvUnauth } = await apiFetch('/export/csv');
  log('/export/csv sin token da 401', csvUnauth === 401, `status: ${csvUnauth}`);

  // ── PASO 7: Notificaciones ───────────────────────────────────────────────────
  console.log('\n── PASO 7: GET /notifications ──');
  const { status: notifStatus, body: notifBody } = await apiFetch(
    '/notifications',
    {},
    token,
  );

  log('Status 200 /notifications', notifStatus === 200, `status: ${notifStatus}`);
  log('Respuesta tiene "notifications" array', Array.isArray(notifBody?.notifications));
  log('Respuesta tiene "unread_count"', typeof notifBody?.unread_count === 'number');

  // ── PASO 7B: Sin token da 401 ────────────────────────────────────────────────
  const { status: notifUnauth } = await apiFetch('/notifications');
  log('/notifications sin token da 401', notifUnauth === 401, `status: ${notifUnauth}`);

  // ── RESUMEN ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log(`📊 RESULTADO: ${passed} pasaron | ${failed} fallaron`);
  if (failed === 0) {
    console.log('🎉 ¡Todos los tests de la Semana 3 pasaron!');
  } else {
    console.log('⚠️  Revisa los tests fallidos antes del deploy.');
  }
  console.log('═══════════════════════════════════════════════\n');

  await supabase.auth.signOut();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('💥 Error crítico en el test runner:', err);
  process.exit(1);
});
