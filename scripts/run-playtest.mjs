import { makeDriver, startLevelOne } from './playtest-bot.mjs';
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const suites = process.argv.slice(2).filter(arg => arg !== '--headed');
if (!suites.length) suites.push('controls', 'combat', 'edgecases', 'boss', 'difficulty', 'journey', 'ranged', 'ape-rock', 'responsive', 'lifecycle', 'v03');
const allowed = new Set(['controls', 'combat', 'edgecases', 'boss', 'difficulty', 'journey', 'ranged', 'ape-rock', 'responsive', 'lifecycle', 'v03']);
for (const name of suites) if (!allowed.has(name)) throw new Error(`Unknown suite: ${name}`);
const baseURL = (process.env.PLAYTEST_URL ?? 'http://localhost:5177').replace(/\/$/, '');
const exists = path => access(path).then(() => true, () => false);
let server;
let browser;
try {
  const running = await fetch(baseURL).then(r => r.ok, () => false);
  if (!running) {
    if (process.env.PLAYTEST_URL) throw new Error(`Start the development server at ${baseURL} first.`);
    server = spawn('npm', ['run', 'dev'], { stdio: 'pipe', detached: process.platform !== 'win32' });
    server.stdout.on('data', () => {});
    server.stderr.on('data', data => process.stderr.write(data));
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      ready = await fetch(baseURL).then(r => r.ok, () => false);
      if (ready) break;
    }
    if (!ready) throw new Error('Development server did not start within 10 seconds.');
  }
  let channel = process.env.PLAYWRIGHT_CHANNEL;
  if (!channel && !await exists(chromium.executablePath()) && process.platform === 'darwin' && await exists('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) channel = 'chrome';
  browser = await chromium.launch({ headless: !process.argv.includes('--headed'), ...(channel ? { channel } : {}) });
  await mkdir('output/playwright', { recursive: true });
  for (const name of suites) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const source = (await readFile(`scripts/playtest-${name}.js`, 'utf8')).replaceAll('http://localhost:5177/', `${baseURL}/`);
    // Local, versioned scenario expressions can also be passed directly to Game Studio's CLI.
    const scenario = new Function(`return (${source.trim()});`)();
    try {
      const result = await scenario(page,{makeDriver,startLevelOne});
      await writeFile(`output/playwright/${name}.json`, JSON.stringify(result, null, 2));
      if (result.passed === false || result.errors?.length || result.failedRequests?.length || result.checks?.some(check => !check.pass)) throw new Error(`${name} failed; see its JSON report.`);
      console.log(`PASS ${name}: ${result.checks?.length ?? 'full-route'} checks${result.elapsedSeconds ? `, ${result.elapsedSeconds}s` : ''}`);
    } catch (error) {
      await page.screenshot({ path: `output/playwright/${name}-failure.png` }).catch(() => {});
      await writeFile(`output/playwright/${name}-failure.txt`, String(error.stack ?? error));
      throw error;
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  if (server?.pid) {
    if (process.platform === 'win32') server.kill();
    else { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already exited */ } }
  }
}
