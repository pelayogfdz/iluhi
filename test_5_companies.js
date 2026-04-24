const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const empresas = [
  'f1ce2337-a831-4ac0-8eda-51a6f139f520', // RAMAR
  '715213c6-8d05-4c45-aab2-b621cc17ec43', // AGORA
  '5f3af2cc-b5a4-4049-bb03-44dae4bd1841', // MCO MX
  '98360127-5bfc-468a-8c04-595bd8776844', // ALTROS
  'e3229aa4-c381-48fc-bc6a-375f10e73123'  // ALKIBA
];

const logFile = fs.openSync(os.tmpdir() + '/test_5_companies.log', 'a');

console.log("Iniciando pruebas asíncronas para 5 empresas...");

empresas.forEach((empresaId, index) => {
  console.log(`Lanzando test para empresa ID: ${empresaId} (Delay: ${index * 5000}ms)`);
  setTimeout(() => {
    // Test CFDI
    spawn('node', ['playwright_sat_maestro.js', '--cfdi-only', `--empresa-id=${empresaId}`], { detached: true, stdio: ['ignore', logFile, logFile] }).unref();
    // Test Opinión
    spawn('node', ['playwright_sat_maestro.js', '--opinion-only', '--skip-cfdi', `--empresa-id=${empresaId}`], { detached: true, stdio: ['ignore', logFile, logFile] }).unref();
    // Test CSF
    spawn('node', ['playwright_sat_maestro.js', '--csf-only', '--skip-cfdi', `--empresa-id=${empresaId}`], { detached: true, stdio: ['ignore', logFile, logFile] }).unref();
  }, index * 5000);
});

console.log("Procesos lanzados. Revisa el log en " + os.tmpdir() + "/test_5_companies.log");
