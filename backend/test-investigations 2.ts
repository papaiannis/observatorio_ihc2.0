/**
 * test-investigations.ts
 * Script de prueba integral para los nuevos endpoints de gestión de investigaciones.
 *
 * Uso:
 *   npx tsx test-investigations.ts
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

async function runTests() {
  console.log('\n🔬 ===== TEST GESTIÓN DE INVESTIGACIONES =====\n');

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

  let newInvestigationId: string | null = null;

  // ── PASO 2: POST /investigations ─────────────────────────────────────────────────
  console.log('\n── PASO 2: POST /investigations ──');
  const createPayload = {
    title: "Estudio de jaguares TEST",
    description: "Monitoreo de jaguares para pruebas E2E.",
    start_date: "2026-07-01",
    end_date: "2026-12-31",
    area_geom: "SRID=4326;POLYGON((-62.5 5.8, -62.0 5.8, -62.0 6.2, -62.5 6.2, -62.5 5.8))",
    methods: "Cámaras trampa automatizadas",
    survey_questions: [
      { label: "¿Se observó directamente?", type: "boolean" }
    ],
    status: "active"
  };

  const { status: createStatus, body: createBody } = await apiFetch(
    '/investigations',
    {
      method: 'POST',
      body: JSON.stringify(createPayload),
    },
    token,
  );
  
  log('Status 201 al crear investigación', createStatus === 201, `status: ${createStatus}`);
  if (createStatus !== 201) {
    console.error('    ❌ Error de la API:', JSON.stringify(createBody, null, 2));
  }
  if (createStatus === 201) {
    newInvestigationId = createBody?.id;
    log('Investigación retorna id', !!newInvestigationId, newInvestigationId ?? 'sin id');
    log('Título coincide', createBody?.title === createPayload.title);
  }

  // ── PASO 3: GET /investigations/my ───────────────────────────────────────────────
  console.log('\n── PASO 3: GET /investigations/my ──');
  const { status: myStatus, body: myBody } = await apiFetch('/investigations/my', {}, token);
  
  log('Status 200 al listar mis investigaciones', myStatus === 200, `status: ${myStatus}`);
  log('Respuesta tiene array investigations', Array.isArray(myBody?.investigations));
  
  if (newInvestigationId && Array.isArray(myBody?.investigations)) {
    const found = myBody.investigations.some((inv: any) => inv.id === newInvestigationId);
    log('La nueva investigación está en "my"', found);
  }

  // ── PASO 4: PATCH /investigations/:id ──────────────────────────────────────────────
  console.log('\n── PASO 4: PATCH /investigations/:id ──');
  if (newInvestigationId) {
    const patchPayload = {
      title: "Estudio de jaguares TEST - Actualizado"
    };
    const { status: patchStatus, body: patchBody } = await apiFetch(
      `/investigations/${newInvestigationId}`, 
      {
        method: 'PATCH',
        body: JSON.stringify(patchPayload)
      }, 
      token
    );
    
    log('Status 200 al actualizar', patchStatus === 200, `status: ${patchStatus}`);
    log('Título actualizado correctamente', patchBody?.title === patchPayload.title);
  } else {
    console.log('  ⚠️  Saltando actualización (sin ID).');
  }

  // ── PASO 5: DELETE /investigations/:id ──────────────────────────────────────────────
  console.log('\n── PASO 5: DELETE /investigations/:id ──');
  if (newInvestigationId) {
    const { status: deleteStatus, body: deleteBody } = await apiFetch(
      `/investigations/${newInvestigationId}`, 
      { method: 'DELETE' }, 
      token
    );
    
    log('Status 200 al eliminar lógicamente', deleteStatus === 200, `status: ${deleteStatus}`);
    
    // Verificamos si realmente se desactivó
    const { status: checkStatus, body: checkBody } = await apiFetch(`/investigations/${newInvestigationId}`, {}, token);
    if (checkBody?.status !== 'archived') {
      console.error('    ❌ Error al verificar status:', JSON.stringify(checkBody, null, 2));
    }
    log('El estado actual es archived', checkBody?.status === 'archived', checkBody?.status);
  } else {
    console.log('  ⚠️  Saltando borrado lógico (sin ID).');
  }

  // ── RESUMEN ──────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log(`📊 RESULTADO: ${passed} pasaron | ${failed} fallaron`);
  if (failed === 0) {
    console.log('🎉 ¡Todos los tests de Investigaciones pasaron!');
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
