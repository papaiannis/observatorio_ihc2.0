import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const API_URL = 'http://localhost:8000/api';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error("Uso: npx ts-node test-mvp.ts <email> <password>");
    process.exit(1);
  }
  
  console.log(`\n=== 1. Autenticación ===`);
  console.log(`Intentando login para ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (authError || !authData.session) {
    console.error("❌ Error en el login:", authError?.message);
    return;
  }
  
  const token = authData.session.access_token;
  console.log("✅ Login exitoso. JWT Obtenido.");

  console.log(`\n=== 2. Test GET /api/investigations/active ===`);
  let investigationId = null;
  try {
    const response = await fetch(`${API_URL}/investigations/active`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const investigations = await response.json();
    console.log(`✅ Investigaciones obtenidas: ${investigations.length}`);
    
    if (investigations.length > 0) {
      investigationId = investigations[0].id;
      console.log(`   Usaremos la investigación ID: ${investigationId} para la siguiente prueba.`);
    } else {
      console.warn("⚠️ No hay investigaciones activas. Debes crear una en la base de datos para continuar con el test de contribuciones.");
      return;
    }
  } catch (err: any) {
    console.error("❌ Error en GET /api/investigations/active:", err.message);
    return;
  }

  console.log(`\n=== 3. Test POST /api/contributions ===`);
  if (!investigationId) return;

  try {
    // Crear FormData
    const formData = new FormData();
    formData.append('investigation_id', investigationId);
    formData.append('preliminary_species', 'Canis lupus familiaris');
    formData.append('survey_answers', JSON.stringify({ question_1: 'Respuesta de prueba' }));
    formData.append('latitude', '4.6097');
    formData.append('longitude', '-74.0817');

    // Crear un buffer de imagen simulado o usar uno real si existe
    // En NodeJS nativo con fetch, podemos usar un Blob para simular un archivo
    const dummyImageContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 252, 255, 255, 63, 3, 0, 4, 31, 1, 252, 107, 206, 175, 41, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    const fileBlob = new Blob([dummyImageContent], { type: 'image/png' });
    formData.append('photo', fileBlob, 'test_image.png');

    const response = await fetch(`${API_URL}/contributions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // IMPORTANTE: NO establezcas Content-Type a mano con FormData en fetch.
        // Fetch se encarga automáticamente de establecer el boundary correcto.
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Contribución creada exitosamente.");
    console.log("   ID Contribución:", result.contribution_id);
    console.log("   URL de la Foto:", result.photo_url);

  } catch (err: any) {
    console.error("❌ Error en POST /api/contributions:", err.message);
  }

  console.log(`\n=== Tests Finalizados ===`);
}

runTests();
