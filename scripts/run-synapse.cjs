const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mode = (process.argv[2] || 'dev').toLowerCase();
const nodeModulesPath = path.join(root, 'node_modules');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (typeof result.status === 'number') {
    return result.status;
  }

  return 1;
}

function ensureDependencies() {
  if (fs.existsSync(nodeModulesPath)) {
    return;
  }

  console.log('[SYNAPSE] Installing dependencies...');
  const result = spawnSync('npm', ['install'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

ensureDependencies();

switch (mode) {
  case 'dev':
    console.log('[SYNAPSE] Starting development mode...');
    process.exit(run('npm', ['run', 'dev']));
    break;
  case 'build':
    console.log('[SYNAPSE] Building renderer and Electron main process...');
    process.exit(run('npm', ['run', 'build']));
    break;
  case 'run':
    console.log('[SYNAPSE] Building and launching the desktop app...');
    process.exit(run('npm', ['run', 'run']));
    break;
  case 'package':
    console.log('[SYNAPSE] Building Windows package...');
    process.exit(run('npm', ['run', 'electron:build:win']));
    break;
  case 'test':
    console.log('[SYNAPSE] Running validation...');
    {
      const lintStatus = run('npm', ['run', 'lint']);
      if (lintStatus !== 0) {
        process.exit(lintStatus);
      }
      process.exit(run('npm', ['test']));
    }
    break;
  default:
    console.log('Usage:');
    console.log('  npm run synapse -- dev      (start dev mode)');
    console.log('  npm run synapse -- build    (build app)');
    console.log('  npm run synapse -- run      (build and launch built Electron app)');
    console.log('  npm run synapse -- package  (build Windows package)');
    console.log('  npm run synapse -- test     (lint and test)');
    process.exit(1);
}
