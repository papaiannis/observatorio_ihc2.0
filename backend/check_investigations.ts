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

async function check() {
  try {
    const { data, error } = await supabase.from('investigations').select('*');
    if (error) {
      console.error("Error retrieving investigations:", error.message);
    } else {
      console.log("Investigations in database:", data ? data.length : 0);
      console.log("Details:", data);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

check();
