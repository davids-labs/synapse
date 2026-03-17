const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const electronBinary = require('electron');
const appEntry = process.argv[2] || 'dist-electron/main/index.js';
const extraArgs = process.argv.slice(3);
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [appEntry, ...extraArgs], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(typeof code === 'number' ? code : 0);
});

child.on('error', (error) => {
  console.error('[electron-runner]', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  if (!child.killed) {
    child.kill('SIGINT');
  }
});

process.on('SIGTERM', () => {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
});
