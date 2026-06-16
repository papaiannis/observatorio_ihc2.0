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

async function testConnection() {
  console.log("Testing Supabase connection...");
  try {
    // Attempt to query the 'sightings' table, limit to 1 to just test connection
    const { data, error } = await supabase.from('sightings').select('*').limit(1);
    
    if (error) {
      console.error("Connection failed with error:", error.message);
      process.exit(1);
    } else {
      console.log("✅ Connection successful!");
      console.log("Data retrieved:", data);
    }
  } catch (err) {
    console.error("❌ Exception during connection test:", err);
    process.exit(1);
  }
}

testConnection();
