// lib/aiClient.test.js
// Smoke test: starts local-api-server.js with DEMO_MODE=true and validates response structure.
//
// Usage: node lib/aiClient.test.js
// Exits with code 0 on success, non-zero on failure.

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { URL } = require('url'); // <-- robust URL constructor import

const SERVER_PATH = path.join(process.cwd(), 'local-api-server.js');
const PORT = process.env.LOCAL_API_PORT || 5174;
const URL_STR = `http://localhost:${PORT}/api/generate`;

function waitForServer(proc, timeout = 15000) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Server did not start in time'));
      }
    }, timeout);

    proc.stdout.on('data', (chunk) => {
      const s = String(chunk);
      process.stdout.write('[server] ' + s);
      if (!resolved && s.includes(`Local API server listening`)) {
        resolved = true;
        clearTimeout(timer);
        resolve();
      }
    });
    proc.stderr.on('data', (chunk) => {
      process.stderr.write('[server.err] ' + String(chunk));
    });
    proc.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(new Error('Server exited prematurely with code ' + code));
      }
    });
  });
}

async function fetchJson(urlStr, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch (err) {
      return reject(new Error('Invalid URL: ' + err.message));
    }
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 10000
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c.toString());
      res.on('end', () => {
        try {
          const parsed = JSON.parse(buf);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + e.message + ' -- raw: ' + buf));
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  // spawn server with DEMO_MODE=true
  const env = Object.assign({}, process.env, { DEMO_MODE: 'true' });
  const proc = spawn(process.execPath, [SERVER_PATH], { env, cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });

  try {
    await waitForServer(proc, 15000);
  } catch (err) {
    console.error('Server failed to start:', err);
    proc.kill();
    process.exit(2);
  }

  try {
    const payload = { jobDesc: 'Smoke test: generate demo output' };
    const res = await fetchJson(URL_STR, payload);
    if (res.statusCode !== 200) {
      console.error('Unexpected status code', res.statusCode, 'body:', JSON.stringify(res.body, null, 2));
      proc.kill();
      process.exit(3);
    }
    const body = res.body;
    // Validate structure
    const keys = ['micro_lessons','profile_short','profile_long','cover_message'];
    for (const k of keys) {
      if (!(k in body)) {
        console.error('Missing key in response:', k, 'full body:', JSON.stringify(body,null,2));
        proc.kill();
        process.exit(4);
      }
    }
    if (!Array.isArray(body.micro_lessons) || body.micro_lessons.length !== 5) {
      console.error('micro_lessons must be an array of length 5. Got:', JSON.stringify(body.micro_lessons,null,2));
      proc.kill();
      process.exit(5);
    }
    // basic shape checks
    for (const [i, m] of body.micro_lessons.entries()) {
      if (!m || !m.title || !m.tip || !m.practice_task || !m.example_output) {
        console.error(`micro_lesson[${i}] missing fields or invalid:`, JSON.stringify(m,null,2));
        proc.kill();
        process.exit(6);
      }
    }

    console.log('SMOKE TEST SUCCESS: Demo response valid.');
    proc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    proc.kill();
    process.exit(7);
  }
})();
