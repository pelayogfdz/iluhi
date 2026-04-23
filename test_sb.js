const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjndxczlctfyyekcdyol.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabaseClient.storage.from('documentos_sat').upload('test/dummy.txt', Buffer.from('Testing the upload'), { upsert: true });
    if (error) {
        console.error("Storage Error:", error);
    } else {
        console.log("Upload Success!", data);
    }
}
run();
