import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function runTests() {
  console.log('\n🔬 ===== TEST GESTIÓN DE SIGHTINGS INDEPENDIENTES =====\n');

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log('── PASO 1: Login como Especialista ──');
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: SPECIALIST_EMAIL,
    password: SPECIALIST_PASSWORD,
  });

  if (authError || !authData.session) {
    log('Login Especialista', false, authError?.message ?? 'Sin sesión');
    return;
  }

  const token = authData.session.access_token;
  log('Login Especialista', true, `usuario: ${authData.user?.email}`);

  let newSightingId: string | null = null;
  
  console.log('\n── PASO 2: POST /sightings ──');
  
  // Create a dummy image file for testing
  const dummyImagePath = path.join(__dirname, 'dummy_test_image.jpg');
  if (!fs.existsSync(dummyImagePath)) {
    fs.writeFileSync(dummyImagePath, Buffer.from('dummy image data'));
  }

  try {
    const formData = new FormData();
    const imageBuffer = fs.readFileSync(dummyImagePath);
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'dummy_test_image.jpg');
    formData.append('preliminary_species', 'Jaguar');

    const res = await fetch(`${API_BASE}/sightings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData as any,
    });
    
    const createStatus = res.status;
    const createBody = await res.json().catch(() => null);
    
    log('Status 201 al crear avistamiento', createStatus === 201, `status: ${createStatus}`);
    if (createStatus === 201) {
      newSightingId = createBody?.sighting_id;
      log('Avistamiento retorna id', !!newSightingId, newSightingId ?? 'sin id');
    } else {
      console.error('    ❌ Error:', JSON.stringify(createBody, null, 2));
    }
  } catch (error) {
    log('Error subiendo foto', false, String(error));
  }

  console.log('\n── PASO 3: GET /sightings/my ──');
  const { status: myStatus, body: myBody } = await apiFetch('/sightings/my', {
    headers: { 'Content-Type': 'application/json' }
  }, token);
  
  log('Status 200 al listar mis avistamientos', myStatus === 200, `status: ${myStatus}`);
  log('Respuesta es array', Array.isArray(myBody?.sightings));
  if (newSightingId && Array.isArray(myBody?.sightings)) {
    log('El nuevo avistamiento está en "my"', myBody.sightings.some((s: any) => s.id === newSightingId));
  }

  console.log('\n── PASO 4: GET /sightings/pending ──');
  const { status: pendingStatus, body: pendingBody } = await apiFetch('/sightings/pending', {
    headers: { 'Content-Type': 'application/json' }
  }, token);
  
  log('Status 200 al listar pendientes', pendingStatus === 200, `status: ${pendingStatus}`);
  
  // Buscar una especie válida para probar la validación
  let validSpeciesId = null;
  const { data: speciesData } = await supabaseClient.from('species').select('id').limit(1).single();
  validSpeciesId = speciesData?.id;

  console.log('\n── PASO 5: PATCH /sightings/:id/validate ──');
  if (newSightingId && validSpeciesId) {
    const { status: validateStatus, body: validateBody } = await apiFetch(`/sightings/${newSightingId}/validate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validated_species_id: validSpeciesId })
    }, token);
    
    log('Status 200 al validar avistamiento', validateStatus === 200, `status: ${validateStatus}`);
    if (validateStatus !== 200) {
      console.error('    ❌ Error de validación:', JSON.stringify(validateBody, null, 2));
    }
  } else {
    console.log('  ⚠️  Saltando validación (sin sightingId o speciesId).');
  }

  console.log('\n── PASO 6: GET /sightings/feed ──');
  const { status: feedStatus, body: feedBody } = await apiFetch('/sightings/feed', {
    headers: { 'Content-Type': 'application/json' }
  }); // sin token
  
  log('Status 200 al obtener feed público', feedStatus === 200, `status: ${feedStatus}`);
  
  // Limpiar imagen temporal
  if (fs.existsSync(dummyImagePath)) {
    fs.unlinkSync(dummyImagePath);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`📊 RESULTADO: ${passed} pasaron | ${failed} fallaron`);
  console.log('═══════════════════════════════════════════════\n');

  await supabaseClient.auth.signOut();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('💥 Error crítico en el test runner:', err);
  process.exit(1);
});
