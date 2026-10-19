// Run both development servers without a root npm dependency.
const { spawn } = require('node:child_process');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Start development with npm run dev.');
const children = ['dev:server', 'dev:frontend'].map(script =>
  spawn(process.execPath, [npmCli, 'run', script], { stdio: 'inherit', env: process.env })
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
