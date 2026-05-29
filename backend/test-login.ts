import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.error("Usage: ts-node test-login.ts <email> <password>");
    process.exit(1);
  }
  
  console.log(`Attempting login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error("Error logging in:", error.message);
  } else {
    console.log("Login successful!");
    console.log("Token:", data.session?.access_token);
    console.log("User:", data.user?.email);
  }
}

testLogin();
