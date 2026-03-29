const http = require('http');
const https = require('https');
const net = require('net');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CONFIG_PATH = path.join(ROOT, 'config', 'services.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error.message);
    return fallback;
  }
}

function expandHome(input) {
  if (!input) return input;
  return input.startsWith('~') ? path.join(os.homedir(), input.slice(1)) : input;
}

function buildUrl(base, port, endpoint = '') {
  return `${base.replace(/\/$/, '')}:${port}${endpoint}`;
}

function requestWithTimeout(url, timeoutMs) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, (response) => {
      const statusCode = response.statusCode || 0;
      response.resume();
      resolve({
        ok: statusCode >= 200 && statusCode < 400,
        statusCode,
        timedOut: false,
        error: null,
      });
    });

    request.on('error', (error) => {
      resolve({
        ok: false,
        statusCode: 0,
        timedOut: false,
        error: error.message,
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('timeout'));
      resolve({
        ok: false,
        statusCode: 0,
        timedOut: true,
        error: 'timeout',
      });
    });
  });
}

function checkPort(port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ open: true, error: null }));
    socket.once('timeout', () => finish({ open: false, error: 'timeout' }));
    socket.once('error', (error) => finish({ open: false, error: error.message }));
    socket.connect(port, '127.0.0.1');
  });
}

function classifyStatus(portOpen, httpResult) {
  if (!portOpen) return { state: 'down', label: 'Down', color: 'down' };
  if (!httpResult) return { state: 'warning', label: 'Port open', color: 'warning' };
  if (httpResult.ok) return { state: 'healthy', label: 'Healthy', color: 'healthy' };
  if (httpResult.timedOut) return { state: 'warning', label: 'Timeout', color: 'warning' };
  if (httpResult.statusCode >= 500) return { state: 'warning', label: `HTTP ${httpResult.statusCode}`, color: 'warning' };
  if (httpResult.statusCode >= 400) return { state: 'warning', label: `HTTP ${httpResult.statusCode}`, color: 'warning' };
  return { state: 'warning', label: 'Unknown', color: 'warning' };
}

function loadConfig() {
  const config = readJson(CONFIG_PATH, { services: [], settings: {} });
  return {
    services: config.services || [],
    settings: {
      refreshInterval: 30000,
      healthCheckTimeout: 3000,
      logLines: 50,
      ...config.settings,
    },
  };
}

let runtime = loadConfig();

function resolveService(serviceId) {
  return runtime.services.find((service) => service.id === serviceId);
}

async function getServiceStatus(service) {
  const baseUrl = service.url || 'http://127.0.0.1';
  const healthUrl = buildUrl(baseUrl, service.port, service.healthEndpoint || '/');
  const portResult = await checkPort(service.port, runtime.settings.healthCheckTimeout);
  const httpResult = portResult.open
    ? await requestWithTimeout(healthUrl, runtime.settings.healthCheckTimeout)
    : null;

  const classification = classifyStatus(portResult.open, httpResult);

  return {
    id: service.id,
    name: service.name,
    description: service.description || '',
    url: buildUrl(baseUrl, service.port),
    healthUrl,
    port: service.port,
    healthEndpoint: service.healthEndpoint,
    logPath: expandHome(service.logPath || ''),
    startCommand: service.startCommand || '',
    stopCommand: service.stopCommand || '',
    status: classification.state,
    statusLabel: classification.label,
    statusColor: classification.color,
    portOpen: portResult.open,
    portError: portResult.error,
    httpStatus: httpResult ? httpResult.statusCode : 0,
    httpError: httpResult ? httpResult.error : null,
    lastChecked: new Date().toISOString(),
  };
}

async function sendServices(req, res) {
  const statuses = [];
  for (const service of runtime.services) {
    statuses.push(await getServiceStatus(service));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(statuses));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function executeCommand(command) {
  return new Promise((resolve) => {
    if (!command) {
      resolve({ success: false, error: 'No command configured' });
      return;
    }

    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          output: stderr || stdout || '',
          command,
        });
        return;
      }

      resolve({
        success: true,
        output: stdout || stderr || 'Command completed',
        command,
      });
    });
  });
}

async function handleControl(req, res) {
  try {
    const body = JSON.parse(await readBody(req) || '{}');
    const service = resolveService(body.serviceId);
    if (!service) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Service not found' }));
      return;
    }

    const action = body.action;
    let command = '';
    if (action === 'start') command = service.startCommand;
    if (action === 'stop') command = service.stopCommand;
    if (action === 'restart') command = [service.stopCommand, service.startCommand].filter(Boolean).join(' && ');
    if (!command) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid action' }));
      return;
    }

    const result = await executeCommand(command);
    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

function readLogFile(filePath, maxLines) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

function findNewestLogFile(directory) {
  const files = fs.readdirSync(directory)
    .filter((file) => file.endsWith('.log'))
    .map((file) => ({
      file,
      fullPath: path.join(directory, file),
      mtimeMs: fs.statSync(path.join(directory, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0] || null;
}

function handleLogs(req, res) {
  try {
    const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
    const serviceId = requestUrl.searchParams.get('serviceId');
    const requestedLines = Number.parseInt(requestUrl.searchParams.get('lines') || '50', 10);
    const maxLines = Number.isFinite(requestedLines) ? Math.min(Math.max(requestedLines, 1), 500) : 50;
    const service = resolveService(serviceId);

    if (!service) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Service not found', logs: '' }));
      return;
    }

    const logDirectory = expandHome(service.logPath || '');
    if (!logDirectory || !fs.existsSync(logDirectory)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Log directory not found', logs: '' }));
      return;
    }

    const newest = findNewestLogFile(logDirectory);
    if (!newest) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs: 'No log files found', file: null }));
      return;
    }

    const logs = readLogFile(newest.fullPath, maxLines);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, logs, file: newest.file }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message, logs: '' }));
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  }[ext] || 'text/plain; charset=utf-8';
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(PUBLIC_DIR, urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/services') {
    await sendServices(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(runtime));
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/logs')) {
    handleLogs(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/control') {
    await handleControl(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/reload-config') {
    runtime = loadConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
});
