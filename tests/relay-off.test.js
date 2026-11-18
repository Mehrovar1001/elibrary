/* The old Supabase relay "drive-file" must not serve files anymore
   (files come straight from Google; an open relay could burn Supabase traffic).
   Run: node tests/relay-off.test.js */
const URL = 'https://vdohgnxcqdlewwghxnqp.supabase.co/functions/v1/drive-file?id=1f42nLinx6xdlA6jpFCVsWqckOuhIOMrB';
fetch(URL, { headers: { Range: 'bytes=0-9' } }).then(r => {
  const ok = !r.ok;
  console.log(ok ? `relay off: OK (HTTP ${r.status})` : `FAIL relay still serves files (HTTP ${r.status})\nrelay off: 1 problem(s)`);
  process.exit(ok ? 0 : 1);
}).catch(e => { console.log('FAIL', e.message); process.exit(1); });
