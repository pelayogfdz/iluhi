require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { GET } = require('../app/api/cron-processor/route.js');

async function main() {
  const req = {};
  const res = await GET(req);
  console.log('Result:', await res.json());
}
main().catch(console.error);
