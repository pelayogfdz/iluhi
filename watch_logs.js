const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

const env = Object.assign({}, process.env, { NETLIFY_AUTH_TOKEN: 'nfp_GJDmLKMSZUnrLbW7TLff5Pn99KHZPpX4b333', NETLIFY_SITE_ID: 'f03ade15-1675-4f74-8358-e94246d57d6d' });
console.log("Starting netlify logs...");
const proc = spawn('npx.cmd', ['netlify', 'logs:function', '___netlify-server-handler'], { env, shell: true });

let logsText = "";
proc.stdout.on('data', (d) => { logsText += d.toString(); });
proc.stderr.on('data', (d) => { logsText += d.toString(); });

setTimeout(() => {
  console.log("Triggering GET request");
  https.get('https://planeacionseit.netlify.app/api/diag', (res) => {
    let raw = "";
    res.on('data', c => raw += c);
    res.on('end', () => {
      logsText += "\nHTTP BODY: " + raw;
      setTimeout(() => {
        fs.writeFileSync('netlify_function_logs.txt', logsText);
        proc.kill();
        process.exit(0);
      }, 5000);
    });
  }).on('error', e => console.error(e));
}, 10000);
