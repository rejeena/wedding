const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

let _client = null;

function getSupabase() {
  if (_client) return _client;
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  });
  return _client;
}

module.exports = { getSupabase };
