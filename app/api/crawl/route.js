import { chromium } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';

export const runtime = 'nodejs';

const VIEWPORT = { width: 800, height: 600 };

const CIRCLE = {
  x: 630,
  y: 450,
  radius: 50,
};

const GAME_URL =
  'https://swiftplay.slotgen.com/uploads/games/en/caribbean_slot-1764907896/index.html?token=7648d0fc-2d87-4e84-800b-81381650f123';

// Module-level session — persists between GET calls.
let session = null;

async function stopSession() {
  if (!session) return null;
  const { browser, context, page, filename, recordingsDir, logs } = session;
  session = null;
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  const finalPath = path.join(recordingsDir, filename);
  await fs.move(videoPath, finalPath, { overwrite: true });
  return { recording: `recordings/${filename}`, responsesCaptured: logs.length };
}

export async function GET() {
  const logs = [];
  let context;

  try {
    // Stop previous recording and save it first.
    const previous = await stopSession();

    const recordingsDir = path.join(process.cwd(), 'recordings');
    await fs.ensureDir(recordingsDir);

    const filename = `recording-${Date.now()}.webm`;

    const browser = await chromium.launch({ headless: false });

    context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: recordingsDir, size: VIEWPORT },
      permissions: ['camera', 'microphone'],
    });

    const page = await context.newPage();

    // CAPTURE API RESPONSES
    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (url.includes('/v1')) {
          let body;
          try { body = await response.json(); } catch { body = await response.text(); }
          const data = { url, status: response.status(), body, time: new Date().toISOString() };
          logs.push(data);
          await fs.writeJson(path.join(recordingsDir, 'responses.json'), logs, { spaces: 2 });
          console.log('Captured:', url);
        }
      } catch (e) { console.error(e); }
    });

    // OPEN GAME
    await page.goto(GAME_URL, { waitUntil: 'networkidle' });

    // DRAW CIRCLE OVERLAY
    await page.evaluate(({ x, y, radius }) => {
      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.left = `${x - radius}px`;
      div.style.top = `${y - radius}px`;
      div.style.width = `${radius * 2}px`;
      div.style.height = `${radius * 2}px`;
      div.style.borderRadius = '50%';
      div.style.background = 'rgba(255,0,0,0.3)';
      div.style.border = '3px solid red';
      div.style.zIndex = '999999';
      div.style.pointerEvents = 'none';
      document.body.appendChild(div);
    }, CIRCLE);

    await page.mouse.click(CIRCLE.x, CIRCLE.y);

    session = { browser, context, page, filename, recordingsDir, logs };

    return Response.json({
      success: true,
      message: 'Recording started. Call GET again to save this and start a new one.',
      filename,
      previous: previous || null,
    });
  } catch (e) {
    console.error(e);
    session = null;
    if (context) try { await context.close(); } catch {}
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
