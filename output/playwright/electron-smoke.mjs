import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const screenshotDir = __dirname;
const env = { ...process.env };
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'synapse-smoke-'));
const tempWorkspace = path.join(tempRoot, 'workspace');
const tempAppData = path.join(tempRoot, 'appdata');
const sourceWorkspace = path.join(projectRoot, 'test-data');
const sourceConfig = JSON.parse(
  await fs.readFile(path.join(sourceWorkspace, '_config.json'), 'utf8'),
);

delete env.ELECTRON_RUN_AS_NODE;
env.APPDATA = tempAppData;
env.LOCALAPPDATA = tempAppData;

await fs.mkdir(tempAppData, { recursive: true });
await fs.cp(sourceWorkspace, tempWorkspace, { recursive: true });
await fs.mkdir(path.join(tempAppData, 'Electron'), { recursive: true });
await fs.writeFile(
  path.join(tempAppData, 'Electron', 'config.json'),
  JSON.stringify(
    {
      ...sourceConfig,
      basePath: tempWorkspace,
    },
    null,
    2,
  ),
  'utf8',
);

function screenshotPath(name) {
  return path.join(screenshotDir, name);
}

async function snapshotMetrics(window, label) {
  const metrics = await window.evaluate(() => {
    const main = document.querySelector('main');
    const pageStage = document.querySelector('.page-stage');
    const sidebar = document.querySelector('.sidebar-panel');
    const canvasViewport = document.querySelector('.module-canvas-viewport');
    const moduleCard = document.querySelector('.module-card');

    const rect = (element) =>
      element
        ? {
            width: Math.round(element.getBoundingClientRect().width),
            height: Math.round(element.getBoundingClientRect().height),
            left: Math.round(element.getBoundingClientRect().left),
            top: Math.round(element.getBoundingClientRect().top),
          }
        : null;

    return {
      sidebarState: main?.getAttribute('data-sidebar-state'),
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      pageStage: rect(pageStage),
      sidebar: rect(sidebar),
      canvasViewport: rect(canvasViewport),
      moduleCard: rect(moduleCard),
      moduleCount: document.querySelectorAll('.module-card').length,
      homeIndexGroups: document.querySelectorAll('.home-index-group').length,
    };
  });

  return { label, ...metrics };
}

const app = await electron.launch({
  cwd: projectRoot,
  args: ['dist-electron/main/index.js'],
  env,
});

try {
  const window = await app.firstWindow();
  const consoleMessages = [];
  window.on('console', (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    });
  });
  window.on('pageerror', (error) => {
    consoleMessages.push({
      type: 'pageerror',
      text: error.message,
    });
  });
  await window.setViewportSize({ width: 1600, height: 980 });
  await window.waitForTimeout(3000);

  let bootInfo = null;
  try {
    await window.locator('#root').waitFor({ state: 'attached', timeout: 15000 });
  } catch {
    bootInfo = {
      url: window.url(),
      title: await window.title(),
      html: (await window.locator('html').innerHTML()).slice(0, 1200),
    };
    await window.screenshot({ path: screenshotPath('00-boot-failure.png'), fullPage: false });
    console.log(JSON.stringify({ bootInfo }, null, 2));
    throw new Error('Renderer root did not attach in time.');
  }

  const output = [];

  await window.screenshot({ path: screenshotPath('01-home.png'), fullPage: false });
  const buttonTexts = await window.locator('button').allTextContents();
  const domSummary = await window.evaluate(() => ({
    bodyText: document.body.innerText.slice(0, 1200),
    htmlSnippet: document.body.innerHTML.slice(0, 1200),
  }));
  output.push({
    ...(await snapshotMetrics(window, 'home')),
    buttonTexts,
    domSummary,
    consoleMessages,
  });

  const cards = window.locator('.home-index-card');
  const cardCount = await cards.count();

  if (cardCount < 2) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('Academics button was not visible on the home screen.');
  }

  const academicsButton = cards.nth(1);
  await academicsButton.click();
  await window.waitForTimeout(900);
  await window.screenshot({ path: screenshotPath('02-canvas-expanded.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'canvas-expanded'));

  const firstHandle = window.locator('.module-drag-handle').first();
  const firstModule = window.locator('.module-card').first();
  const firstModuleBefore = await firstModule.boundingBox();
  const handleBox = await firstHandle.boundingBox();

  if (firstModuleBefore && handleBox) {
    await window.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await window.mouse.down();
    await window.mouse.move(handleBox.x + handleBox.width / 2 + 140, handleBox.y + handleBox.height / 2 + 96, {
      steps: 10,
    });
    await window.mouse.up();
    await window.waitForTimeout(400);
  }

  const firstModuleAfter = await firstModule.boundingBox();
  output.push({
    label: 'module-drag',
    moved:
      Boolean(firstModuleBefore && firstModuleAfter) &&
      (Math.round(firstModuleBefore.x) !== Math.round(firstModuleAfter.x) ||
        Math.round(firstModuleBefore.y) !== Math.round(firstModuleAfter.y)),
    before: firstModuleBefore
      ? { x: Math.round(firstModuleBefore.x), y: Math.round(firstModuleBefore.y) }
      : null,
    after: firstModuleAfter
      ? { x: Math.round(firstModuleAfter.x), y: Math.round(firstModuleAfter.y) }
      : null,
  });

  await window.getByRole('button', { name: /hide sidebar/i }).click();
  await window.waitForTimeout(500);
  await window.screenshot({ path: screenshotPath('03-canvas-collapsed.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'canvas-collapsed'));

  await window.getByRole('button', { name: /show sidebar/i }).click();
  await window.waitForTimeout(500);

  await window.getByRole('button', { name: /import csv/i }).click();
  await window.waitForTimeout(500);
  await window.screenshot({ path: screenshotPath('04-import-modal.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'import-modal'));

  await window.getByRole('button', { name: /^close$/i }).first().click();
  await window.waitForTimeout(300);

  await window.getByRole('button', { name: /settings/i }).click();
  await window.waitForTimeout(500);
  await window.screenshot({ path: screenshotPath('05-settings.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'settings'));

  console.log(JSON.stringify(output, null, 2));
} finally {
  await app.close();
  await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
}
