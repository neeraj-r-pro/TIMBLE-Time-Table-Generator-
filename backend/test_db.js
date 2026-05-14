require('dotenv').config();
const supabase = require('./db');

async function test() {
  const { data, error } = await supabase.from('subjects').select('*').order('updated_at', { ascending: false }).limit(3);
  console.log('Subjects:', JSON.stringify(data, null, 2));
}

test();
