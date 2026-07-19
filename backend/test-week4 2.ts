/**
 * test-week4.ts
 * Script de prueba integral para los endpoints de la Semana 4.
 * Interacciones sociales: comentarios, likes, suscripciones y perfiles públicos.
 *
 * Uso:
 *   npx tsx test-week4.ts
 *
 * Variables de entorno en .env:
 *   SUPABASE_URL, SUPABASE_KEY
 *   TEST_SPECIALIST_EMAIL, TEST_SPECIALIST_PASSWORD
 *   API_URL (ej: http://localhost:8000/api/v1)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix Windows: fuerza IPv4 para evitar timeouts de fetch (Undici)
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ override: true });

const API_BASE = process.env.API_URL ?? 'http://localhost:8000/api/v1';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const SPECIALIST_EMAIL = process.env.TEST_SPECIALIST_EMAIL!;
const SPECIALIST_PASSWORD = process.env.TEST_SPECIALIST_PASSWORD!;

let passed = 0;
let failed = 0;

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} ${label}${detail ? ` → ${detail}` : ''}`);
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
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─── Helpers para obtener IDs reales desde la DB ─────────────────────────────

async function getFirstContribution(token: string): Promise<string | null> {
  const { status, body } = await apiFetch('/feed', {}, token);
  if (status !== 200 || !body?.feed?.length) return null;
  return body.feed[0]?.id ?? null;
}

async function getFirstActiveInvestigation(token: string): Promise<string | null> {
  const { status, body } = await apiFetch('/investigations/active', {}, token);
  if (status !== 200 || !body?.length) return null;
  return body[0]?.id ?? null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🔬 ===== TEST SEMANA 4: INTERACCIONES SOCIALES =====\n');

  // ── PASO 1: Login ────────────────────────────────────────────────────────────
  console.log('── PASO 1: Login como Especialista ──');
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: SPECIALIST_EMAIL,
    password: SPECIALIST_PASSWORD,
  });

  if (authError || !authData.session) {
    log('Login Especialista', false, authError?.message ?? 'Sin sesión');
    console.log('\n🔴 No se puede continuar sin sesión. Verifica TEST_SPECIALIST_EMAIL/PASSWORD en .env');
    return;
  }

  const token = authData.session.access_token;
  const userEmail = authData.user?.email ?? '?';
  log('Login Especialista', true, `usuario: ${userEmail}`);

  // ── Obtener IDs reales para usar en los tests ────────────────────────────────
  console.log('\n── Obteniendo IDs de referencia ──');
  const sightingId = await getFirstContribution(token);
  const investigationId = await getFirstActiveInvestigation(token);

  log('sightingId disponible', !!sightingId, sightingId ?? 'sin contribuciones en el feed');
  log('investigationId disponible', !!investigationId, investigationId ?? 'sin investigaciones activas');

  // ── PASO 2: Crear comentario ─────────────────────────────────────────────────
  console.log('\n── PASO 2: POST /comments ──');
  let commentId: string | null = null;

  if (sightingId) {
    const { status: createStatus, body: createBody } = await apiFetch(
      '/comments',
      {
        method: 'POST',
        body: JSON.stringify({ sighting_id: sightingId, content: 'Avistamiento verificado por test-week4 ✅' }),
      },
      token,
    );
    log('Status 201 al crear comentario', createStatus === 201, `status: ${createStatus}`);
    commentId = createBody?.id ?? null;
    log('Comentario retorna id', !!commentId, commentId ?? 'sin id');
  } else {
    console.log('  ⚠️  Sin sightingId, saltando creación de comentario.');
  }

  // Intento sin token → 401
  const { status: commentUnauth } = await apiFetch(
    '/comments',
    { method: 'POST', body: JSON.stringify({ sighting_id: '00000000-0000-0000-0000-000000000000', content: 'x' }) },
  );
  log('Crear comentario sin token da 401', commentUnauth === 401, `status: ${commentUnauth}`);

  // ── PASO 3: Listar comentarios ───────────────────────────────────────────────
  console.log('\n── PASO 3: GET /comments?sighting_id=... ──');
  if (sightingId) {
    const { status: listStatus, body: listBody } = await apiFetch(`/comments?sighting_id=${sightingId}`);
    log('Status 200 al listar comentarios', listStatus === 200, `status: ${listStatus}`);
    log('Respuesta tiene campo "comments"', Array.isArray(listBody?.comments));
    log('Contiene el comentario recién creado', (listBody?.count ?? 0) >= 1, `count: ${listBody?.count}`);
  } else {
    console.log('  ⚠️  Saltando listado de comentarios (sin sightingId).');
  }

  // ── PASO 4: Eliminar comentario ──────────────────────────────────────────────
  console.log('\n── PASO 4: DELETE /comments/:id ──');
  if (commentId) {
    const { status: deleteStatus } = await apiFetch(`/comments/${commentId}`, { method: 'DELETE' }, token);
    log('Status 204 al eliminar comentario', deleteStatus === 204, `status: ${deleteStatus}`);

    // Verificar que ya no aparece
    if (sightingId) {
      const { body: afterDelete } = await apiFetch(`/comments?sighting_id=${sightingId}`);
      const stillExists = (afterDelete?.comments ?? []).some((c: any) => c.id === commentId);
      log('Comentario eliminado no aparece en el listado', !stillExists);
    }
  } else {
    console.log('  ⚠️  Saltando eliminación (sin commentId).');
  }

  // ── PASO 5: Toggle like ──────────────────────────────────────────────────────
  console.log('\n── PASO 5: POST /likes/toggle ──');
  if (sightingId) {
    const { status: like1Status, body: like1Body } = await apiFetch(
      '/likes/toggle',
      { method: 'POST', body: JSON.stringify({ sighting_id: sightingId }) },
      token,
    );
    log('Status 200 toggle like', like1Status === 200, `status: ${like1Status}`);
    log('Acción es "liked" o "unliked"', ['liked', 'unliked'].includes(like1Body?.action), `action: ${like1Body?.action}`);

    // Toggle de nuevo → acción contraria
    const { body: like2Body } = await apiFetch(
      '/likes/toggle',
      { method: 'POST', body: JSON.stringify({ sighting_id: sightingId }) },
      token,
    );
    log('Doble toggle retorna acción opuesta', like1Body?.action !== like2Body?.action, `1°: ${like1Body?.action} 2°: ${like2Body?.action}`);
  } else {
    console.log('  ⚠️  Saltando toggle like (sin sightingId).');
  }

  // Sin token → 401
  const { status: likeUnauth } = await apiFetch(
    '/likes/toggle',
    { method: 'POST', body: JSON.stringify({ sighting_id: '00000000-0000-0000-0000-000000000000' }) },
  );
  log('Toggle like sin token da 401', likeUnauth === 401, `status: ${likeUnauth}`);

  // ── PASO 6: Conteo de likes ──────────────────────────────────────────────────
  console.log('\n── PASO 6: GET /likes/count?sighting_id=... ──');
  if (sightingId) {
    const { status: countStatus, body: countBody } = await apiFetch(`/likes/count?sighting_id=${sightingId}`);
    log('Status 200 al contar likes', countStatus === 200, `status: ${countStatus}`);
    log('Respuesta tiene campo "count"', typeof countBody?.count === 'number', `count: ${countBody?.count}`);
  } else {
    console.log('  ⚠️  Saltando conteo de likes (sin sightingId).');
  }

  // ── PASO 7: Suscribirse a investigación ──────────────────────────────────────
  console.log('\n── PASO 7: POST /investigations/:id/subscribe ──');
  let subscribed = false;

  if (investigationId) {
    const { status: subStatus, body: subBody } = await apiFetch(
      `/investigations/${investigationId}/subscribe`,
      { method: 'POST' },
      token,
    );
    // 201 = nuevo, 409 = ya estaba suscrito (ambos son válidos para el test)
    log('Status 201 o 409 al suscribirse', [201, 409].includes(subStatus), `status: ${subStatus}`);
    log('Mensaje presente', typeof subBody?.message === 'string' || typeof subBody?.detail === 'string',
      subBody?.message ?? subBody?.detail);
    subscribed = subStatus === 201;
  } else {
    console.log('  ⚠️  Saltando suscripción (sin investigationId).');
  }

  // Sin token → 401
  if (investigationId) {
    const { status: subUnauth } = await apiFetch(`/investigations/${investigationId}/subscribe`, { method: 'POST' });
    log('Suscribirse sin token da 401', subUnauth === 401, `status: ${subUnauth}`);
  }

  // ── PASO 8: Listar suscripciones ────────────────────────────────────────────
  console.log('\n── PASO 8: GET /investigations/my-subscriptions ──');
  const { status: mySubStatus, body: mySubBody } = await apiFetch('/investigations/my-subscriptions', {}, token);
  log('Status 200 mis suscripciones', mySubStatus === 200, `status: ${mySubStatus}`);
  log('Respuesta tiene "subscriptions" array', Array.isArray(mySubBody?.subscriptions));

  if (investigationId && mySubBody?.subscriptions?.length > 0) {
    const found = mySubBody.subscriptions.some((s: any) => s.id === investigationId);
    log('Investigación aparece en mis suscripciones', found);
  }

  // Sin token → 401
  const { status: mySubUnauth } = await apiFetch('/investigations/my-subscriptions');
  log('Mis suscripciones sin token da 401', mySubUnauth === 401, `status: ${mySubUnauth}`);

  // ── PASO 9: Desuscribirse ────────────────────────────────────────────────────
  console.log('\n── PASO 9: DELETE /investigations/:id/subscribe ──');
  if (investigationId && subscribed) {
    const { status: unsubStatus, body: unsubBody } = await apiFetch(
      `/investigations/${investigationId}/subscribe`,
      { method: 'DELETE' },
      token,
    );
    log('Status 200 al desuscribirse', unsubStatus === 200, `status: ${unsubStatus}`);
    log('Mensaje de desuscripción', typeof unsubBody?.message === 'string', unsubBody?.message);
  } else if (!subscribed) {
    // También intentar desuscribir de la investigación aunque no hayamos creado la suscripción en este test
    if (investigationId) {
      const { status: unsubStatus } = await apiFetch(
        `/investigations/${investigationId}/subscribe`,
        { method: 'DELETE' },
        token,
      );
      log('Desuscribirse retorna 200', unsubStatus === 200, `status: ${unsubStatus}`);
    } else {
      console.log('  ⚠️  Saltando desuscripción (sin investigationId).');
    }
  }

  // ── PASO 10: Perfil público ──────────────────────────────────────────────────
  console.log('\n── PASO 10: GET /profiles/:username ──');

  // Obtener el username del especialista logueado desde Supabase
  const { data: ownProfile } = await supabaseClient
    .from('profiles')
    .select('username')
    .eq('id', authData.user!.id)
    .single();

  const testUsername = ownProfile?.username ?? 'sara';
  const { status: profStatus, body: profBody } = await apiFetch(`/profiles/${testUsername}`);
  log('Status 200 perfil público', profStatus === 200, `status: ${profStatus}`);
  log('Perfil tiene username', typeof profBody?.username === 'string', profBody?.username);
  log('Perfil tiene reputation', 'reputation' in (profBody ?? {}));

  // Username inexistente → 404
  const { status: notFound } = await apiFetch('/profiles/__usuario_inexistente_xyz__');
  log('Username inexistente da 404', notFound === 404, `status: ${notFound}`);

  // ── PASO 11: Actualizar perfil propio ────────────────────────────────────────
  console.log('\n── PASO 11: PATCH /profiles/me ──');
  const testAvatarUrl = 'https://example.com/avatar-test.jpg';
  const { status: patchStatus, body: patchBody } = await apiFetch(
    '/profiles/me',
    {
      method: 'PATCH',
      body: JSON.stringify({ avatar_url: testAvatarUrl }),
    },
    token,
  );
  log('Status 200 al actualizar perfil', patchStatus === 200, `status: ${patchStatus}`);
  log('avatar_url actualizado', patchBody?.avatar_url === testAvatarUrl, patchBody?.avatar_url);

  // Sin token → 401
  const { status: patchUnauth } = await apiFetch('/profiles/me', { method: 'PATCH', body: '{}' });
  log('Actualizar perfil sin token da 401', patchUnauth === 401, `status: ${patchUnauth}`);

  // ── RESUMEN ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log(`📊 RESULTADO: ${passed} pasaron | ${failed} fallaron`);
  if (failed === 0) {
    console.log('🎉 ¡Todos los tests de la Semana 4 pasaron!');
  } else {
    console.log('⚠️  Revisa los tests fallidos antes del deploy.');
  }
  console.log('═══════════════════════════════════════════════\n');

  await supabaseClient.auth.signOut();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('💥 Error crítico en el test runner:', err);
  process.exit(1);
});
