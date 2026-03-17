const { spawn } = require('child_process');
const readline = require('readline');

const npmExecPath = process.env.npm_execpath;
const nodeCommand = process.execPath;

const processes = [
  {
    name: 'dev:renderer',
    color: '\x1b[36m',
    args: ['run', 'dev:renderer'],
  },
  {
    name: 'dev:main',
    color: '\x1b[35m',
    args: ['run', 'dev:main'],
  },
  {
    name: 'dev:electron',
    color: '\x1b[33m',
    args: ['run', 'dev:electron'],
  },
];

const children = [];
let shuttingDown = false;

function prefixStream(child, stream, label, color) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    process.stdout.write(`${color}[${label}]\x1b[0m ${line}\n`);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

for (const processConfig of processes) {
  const childArgs = npmExecPath
    ? [npmExecPath, ...processConfig.args]
    : processConfig.args;

  const childCommand = npmExecPath ? nodeCommand : process.platform === 'win32' ? 'npm.cmd' : 'npm';

  const child = spawn(childCommand, childArgs, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    shell: false,
  });

  prefixStream(child, child.stdout, processConfig.name, processConfig.color);
  prefixStream(child, child.stderr, processConfig.name, processConfig.color);

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    const normalizedCode = typeof code === 'number' ? code : 0;
    if (normalizedCode !== 0) {
      process.stderr.write(
        `${processConfig.color}[${processConfig.name}]\x1b[0m exited with code ${normalizedCode}\n`,
      );
      shutdown(normalizedCode);
    }
  });

  child.on('error', (error) => {
    process.stderr.write(
      `${processConfig.color}[${processConfig.name}]\x1b[0m ${error.message}\n`,
    );
    shutdown(1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
