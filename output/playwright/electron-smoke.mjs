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
await fs.cp(sourceWorkspace, tempWorkspace, {
  recursive: true,
  filter: (source) => {
    const basename = path.basename(source);
    return !basename.endsWith('.tmp') && !basename.endsWith('.bak');
  },
});
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
  const blockedEmbedConsole = consoleMessages.filter((message) =>
    /youtube|ERR_BLOCKED_BY_RESPONSE|X-Frame-Options/i.test(message.text),
  );
  output.push({
    ...(await snapshotMetrics(window, 'home')),
    buttonTexts,
    domSummary,
    consoleMessages,
  });

  if (blockedEmbedConsole.length > 0) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('Blocked embed console messages were emitted on the home surface.');
  }

  const focusCanvasButton = window.getByRole('button', { name: /focus canvas/i }).first();
  if ((await focusCanvasButton.count()) > 0) {
    await focusCanvasButton.click({ force: true });
    await window.waitForTimeout(500);
    await window.screenshot({ path: screenshotPath('01b-home-focus-canvas.png'), fullPage: false });
    const homeFocusState = await window.evaluate(() => {
      const titlebar = document.querySelector('.home-titlebar');
      const canvasShell = document.querySelector('.home-canvas-panel .module-canvas-shell');
      const viewport = document.querySelector('.home-canvas-panel .module-canvas-viewport');
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
        titlebarVisible:
          titlebar instanceof HTMLElement && getComputedStyle(titlebar).display !== 'none',
        fullscreenShell:
          canvasShell instanceof HTMLElement && canvasShell.classList.contains('is-fullscreen'),
        viewport: rect(viewport),
      };
    });
    output.push({
      label: 'home-focus-canvas',
      ...homeFocusState,
    });
    if (homeFocusState.titlebarVisible || !homeFocusState.fullscreenShell) {
      console.log(JSON.stringify(output, null, 2));
      throw new Error('Home Focus Canvas did not switch into a true canvas-only fullscreen state.');
    }
    await window.getByRole('button', { name: /^exit full screen$/i }).click({ force: true });
    await window.waitForTimeout(400);
  }

  const browserSurfacePromise = app.waitForEvent('window');
  await window.evaluate(() =>
    window.synapse.openBrowserSurface('https://example.com', 'Smoke Browser Surface'),
  );
  const browserSurface = await browserSurfacePromise;
  try {
    await browserSurface.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(
      () => undefined,
    );
    output.push({
      label: 'browser-surface',
      url: browserSurface.url(),
      title: await browserSurface.title().catch(() => ''),
      closed: browserSurface.isClosed(),
    });
    if (browserSurface.isClosed() || !/example\.com/i.test(browserSurface.url())) {
      console.log(JSON.stringify(output, null, 2));
      throw new Error('Browser surface did not open a usable top-level browser window.');
    }
  } finally {
    if (!browserSurface.isClosed()) {
      await browserSurface.close().catch(() => undefined);
    }
  }
  await window.bringToFront();
  await window.waitForTimeout(400);

  const visibleModuleExpandIndex = await window.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.module-expand-button'));
    return buttons.findIndex((button) => {
      if (!(button instanceof HTMLElement)) {
        return false;
      }
      const rect = button.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
        return false;
      }
      const topmost = document.elementFromPoint(centerX, centerY);
      return topmost?.closest('.module-expand-button') === button;
    });
  });

  if (visibleModuleExpandIndex >= 0) {
    await window.locator('.module-expand-button').nth(visibleModuleExpandIndex).click({ force: true });
    await window.locator('.module-focus-shell').waitFor({ state: 'visible', timeout: 5000 });
    const focusTextarea = window.locator('.module-focus-body textarea').first();
    if (await focusTextarea.count()) {
      await focusTextarea.fill('# Smoke note\n\nFullscreen should stay open.');
      await window.waitForTimeout(1000);
    } else {
      await window.waitForTimeout(600);
    }
    const focusStillVisible = await window.locator('.module-focus-shell').isVisible();
    output.push({
      label: 'module-fullscreen-stability',
      openAfterSave: focusStillVisible,
    });
    if (!focusStillVisible) {
      console.log(JSON.stringify(output, null, 2));
      throw new Error('Module fullscreen closed itself after a save cycle.');
    }
    await window.getByRole('button', { name: /close full screen/i }).click({ force: true });
    await window.waitForTimeout(300);
  }

  const cards = window.locator('.home-index-card');
  const cardCount = await cards.count();

  if (cardCount < 2) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('Academics button was not visible on the home screen.');
  }

  const academicsButton = cards.nth(1);
  await academicsButton.click();
  await window.waitForTimeout(900);
  await window.getByRole('button', { name: /center view/i }).click({ force: true });
  await window.waitForTimeout(500);
  await window.screenshot({ path: screenshotPath('02-canvas-expanded.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'canvas-expanded'));

  await window.getByRole('button', { name: /^full screen$/i }).click({ force: true });
  await window.waitForTimeout(500);
  await window.screenshot({ path: screenshotPath('02b-canvas-fullscreen.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'canvas-fullscreen'));

  const visibleDragTarget = await window.evaluate(() => {
    const handles = Array.from(document.querySelectorAll('.module-drag-handle'));
    const index = handles.findIndex((handle) => {
      if (!(handle instanceof HTMLElement)) {
        return false;
      }
      const rect = handle.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const topmost = document.elementFromPoint(centerX, centerY);
      return topmost?.closest('.module-drag-handle') === handle;
    });
    return index >= 0 ? index : 0;
  });
  const firstHandle = window.locator('.module-drag-handle').nth(visibleDragTarget);
  const firstModule = window.locator('.module-card').nth(visibleDragTarget);
  const firstModuleBefore = await firstModule.boundingBox();
  const handleBox = await firstHandle.boundingBox();
  let dragDebug = null;

  if (firstModuleBefore && handleBox) {
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    await window.mouse.move(startX, startY);
    await window.mouse.down();
    await window.waitForTimeout(120);
    dragDebug = await window.evaluate(() => {
      const shell = document.querySelector('.module-canvas-shell');
      const firstCard = document.querySelector('.module-card');
      const canvasDebug = window.__synapseCanvasDebug ?? null;
      return {
        interacting: shell?.classList.contains('is-interacting') ?? false,
        firstCardStyle: firstCard instanceof HTMLElement ? firstCard.style.cssText : null,
        canvasDebug,
      };
    });
    await window.mouse.move(startX + 160, startY + 108, {
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
    debug: dragDebug,
  });

  await window.getByRole('button', { name: /^exit full screen$/i }).click({ force: true });
  await window.waitForTimeout(500);

  const addModuleButton = window
    .locator('.page-header .header-actions')
    .getByRole('button', { name: /^add module$/i });
  const addModuleButtonCount = await addModuleButton.count();
  output.push({
    label: 'add-module-trigger',
    addModuleButtonCount,
  });
  await addModuleButton.click({ force: true });
  await window.waitForTimeout(500);
  const moduleLibraryScroll = await window.evaluate(() => {
    const panel = document.querySelector('.module-library-panel');
    const scrollRegion = document.querySelector('.module-library-scroll');
    const categories = document.querySelectorAll('.module-library-category-button');
    const preview = document.querySelector('.module-directory-preview-card');
    if (scrollRegion instanceof HTMLElement) {
      const before = scrollRegion.scrollTop;
      scrollRegion.scrollTop = Math.max(120, Math.floor(scrollRegion.scrollHeight / 3));
      return {
        found: true,
        panelVisible: panel instanceof HTMLElement,
        categoryCount: categories.length,
        previewVisible: preview instanceof HTMLElement,
        clientHeight: scrollRegion.clientHeight,
        scrollHeight: scrollRegion.scrollHeight,
        before,
        after: scrollRegion.scrollTop,
      };
    }

    return {
      found: false,
      panelVisible: panel instanceof HTMLElement,
      bodyHasModuleLibrary: document.body.innerText.includes('Module Library'),
      modalTitles: Array.from(document.querySelectorAll('.modal-head h2')).map((node) =>
        node.textContent?.trim(),
      ),
    };
  });
  output.push({
    label: 'module-library-scroll',
    ...moduleLibraryScroll,
  });
  if (
    !moduleLibraryScroll ||
    !moduleLibraryScroll.found ||
    moduleLibraryScroll.categoryCount < 2 ||
    moduleLibraryScroll.scrollHeight <= moduleLibraryScroll.clientHeight ||
    moduleLibraryScroll.after <= moduleLibraryScroll.before
  ) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('Module library modal did not expose a working scroll region.');
  }
  await window.getByRole('button', { name: /^close$/i }).first().click({ force: true });
  await window.waitForTimeout(300);

  const hideSidebarButton = window.getByRole('button', { name: /hide sidebar/i });
  if (await hideSidebarButton.count()) {
    await hideSidebarButton.click();
    await window.waitForTimeout(500);
  }
  await window.screenshot({ path: screenshotPath('03-canvas-collapsed.png'), fullPage: false });
  output.push(await snapshotMetrics(window, 'canvas-collapsed'));

  const showSidebarButton = window.getByRole('button', { name: /show sidebar/i });
  if (await showSidebarButton.count()) {
    await showSidebarButton.click();
    await window.waitForTimeout(500);
  }

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

  const blockedAfterInteractions = consoleMessages.filter((message) =>
    /youtube|ERR_BLOCKED_BY_RESPONSE|X-Frame-Options/i.test(message.text),
  );
  const saveFailureToasts = await window.locator('.toast.tone-error').allTextContents();
  output.push({
    label: 'runtime-errors',
    blockedAfterInteractions,
    saveFailureToasts,
  });

  if (blockedAfterInteractions.length > 0) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('Blocked embed console messages were emitted during canvas interactions.');
  }

  if (saveFailureToasts.some((text) => /save-page|enoent|copyfile/i.test(text))) {
    console.log(JSON.stringify(output, null, 2));
    throw new Error('A save-page failure toast was emitted during the smoke run.');
  }

  console.log(JSON.stringify(output, null, 2));
} finally {
  await app.close();
  await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
}
