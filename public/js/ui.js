const elements = {
  servicesGrid: document.getElementById('servicesGrid'),
  lastRefresh: document.getElementById('lastRefresh'),
  refreshRate: document.getElementById('refreshRate'),
  customRefresh: document.getElementById('customRefresh'),
  applyRefresh: document.getElementById('applyRefresh'),
  refreshBtn: document.getElementById('refreshBtn'),
  statusSummary: document.getElementById('statusSummary'),
  logModal: document.getElementById('logModal'),
  logModalTitle: document.getElementById('logModalTitle'),
  logContent: document.getElementById('logContent'),
  closeLogModal: document.getElementById('closeLogModal'),
  refreshLogs: document.getElementById('refreshLogs'),
  autoScroll: document.getElementById('autoScroll'),
  controlModal: document.getElementById('controlModal'),
  controlModalTitle: document.getElementById('controlModalTitle'),
  controlMessage: document.getElementById('controlMessage'),
  closeControlModal: document.getElementById('closeControlModal'),
  controlOutput: document.getElementById('controlOutput'),
  btnStart: document.getElementById('btnStart'),
  btnStop: document.getElementById('btnStop'),
  btnRestart: document.getElementById('btnRestart'),
};

let currentLogServiceId = null;
let currentControlServiceId = null;

function statusClass(statusColor) {
  if (statusColor === 'healthy') return 'up';
  if (statusColor === 'warning') return 'degraded';
  return 'down';
}

function createServiceCard(service) {
  const card = document.createElement('article');
  card.className = 'service-card';
  card.dataset.serviceId = service.id;

  card.innerHTML = `
    <div class="service-header">
      <span class="service-name">${service.name}</span>
      <button class="status-indicator ${statusClass(service.statusColor)}" title="${service.statusLabel}"></button>
    </div>
    <div class="service-info">
      <div class="service-url">
        <a href="${service.url}" target="_blank" rel="noreferrer">${service.url}</a>
        <button class="copy-btn" title="Copy URL">Copy</button>
      </div>
      <div class="service-meta">
        <span>Port: ${service.port}</span>
        <span>HTTP: ${service.httpStatus || '—'}</span>
        <span>Status: ${service.statusLabel}</span>
      </div>
      <div class="service-detail">Health: ${service.healthUrl}</div>
      <div class="service-detail">Logs: ${service.logPath || 'Not configured'}</div>
    </div>
    <div class="service-actions">
      <button class="btn btn-success" data-action="start">Start</button>
      <button class="btn btn-danger" data-action="stop">Stop</button>
      <button class="btn btn-warning" data-action="restart">Restart</button>
      <button class="btn btn-secondary" data-action="logs">Logs</button>
    </div>
  `;

  card.querySelector('.status-indicator').addEventListener('click', () => app.refresh());

  card.querySelector('.copy-btn').addEventListener('click', async (event) => {
    event.preventDefault();
    await navigator.clipboard.writeText(service.url);
    event.target.textContent = 'Copied!';
    setTimeout(() => {
      event.target.textContent = 'Copy';
    }, 1200);
  });

  card.querySelectorAll('.service-actions button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'logs') {
        ui.showLogs(service.id, service.name);
        return;
      }
      ui.showControl(service.id, service.name, service.startCommand, service.stopCommand);
    });
  });

  return card;
}

function renderServices(services) {
  elements.servicesGrid.innerHTML = '';
  services.forEach((service) => {
    elements.servicesGrid.appendChild(createServiceCard(service));
  });
}

function updateServices(services) {
  const cards = Array.from(elements.servicesGrid.querySelectorAll('.service-card'));
  services.forEach((service) => {
    const card = cards.find((node) => node.dataset.serviceId === service.id);
    if (!card) return;

    const indicator = card.querySelector('.status-indicator');
    indicator.className = `status-indicator ${statusClass(service.statusColor)}`;
    indicator.title = service.statusLabel;

    const meta = card.querySelector('.service-meta');
    meta.innerHTML = `
      <span>Port: ${service.port}</span>
      <span>HTTP: ${service.httpStatus || '—'}</span>
      <span>Status: ${service.statusLabel}</span>
    `;

    card.querySelector('.service-detail').textContent = `Health: ${service.healthUrl}`;
    card.querySelectorAll('.service-detail')[1].textContent = `Logs: ${service.logPath || 'Not configured'}`;
  });
}

function updateSummary(services) {
  const healthy = services.filter((service) => service.statusColor === 'healthy').length;
  const warning = services.filter((service) => service.statusColor === 'warning').length;
  const down = services.filter((service) => service.statusColor === 'down').length;
  elements.statusSummary.textContent = `Services: ${healthy} healthy, ${warning} warning, ${down} down`;
}

function formatRefreshTime() {
  elements.lastRefresh.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
}

const ui = {
  renderServices,
  updateServices,
  updateSummary,
  formatRefreshTime,

  showLogs(serviceId, serviceName) {
    currentLogServiceId = serviceId;
    elements.logModalTitle.textContent = `${serviceName} Logs`;
    elements.logModal.classList.add('active');
    this.loadLogs();
  },

  hideLogs() {
    currentLogServiceId = null;
    elements.logModal.classList.remove('active');
  },

  async loadLogs() {
    if (!currentLogServiceId) return;

    elements.logContent.textContent = 'Loading...';
    const result = await fetchLogs(currentLogServiceId, 50);

    if (!result.success && result.error) {
      elements.logContent.textContent = `Error: ${result.error}`;
      return;
    }

    elements.logContent.textContent = result.logs || 'No logs available';
    if (elements.autoScroll.checked) {
      elements.logContent.scrollTop = elements.logContent.scrollHeight;
    }
  },

  showControl(serviceId, serviceName, startCommand, stopCommand) {
    currentControlServiceId = serviceId;
    elements.controlModalTitle.textContent = `${serviceName} Control`;
    elements.controlMessage.textContent = 'Use a command or run the service action below.';
    elements.controlOutput.classList.remove('active');
    elements.controlOutput.textContent = [
      `Start: ${startCommand || 'not configured'}`,
      `Stop: ${stopCommand || 'not configured'}`,
    ].join('\n');
    elements.controlOutput.classList.add('active');
    elements.controlModal.classList.add('active');
  },

  hideControl() {
    currentControlServiceId = null;
    elements.controlModal.classList.remove('active');
  },

  async executeControl(action) {
    if (!currentControlServiceId) return;

    elements.controlOutput.textContent = `Executing ${action}...`;
    elements.controlOutput.classList.add('active');

    const result = await controlService(currentControlServiceId, action);
    if (result.success) {
      elements.controlOutput.textContent = `${result.command}\n\n${result.output || 'Command completed'}`;
    } else {
      elements.controlOutput.textContent = `${result.command || ''}\n\nError: ${result.error}`;
    }

    setTimeout(() => app.refresh(), 1000);
  },

  setRefreshRateLabel(ms) {
    const options = {
      10000: '10s',
      30000: '30s',
      60000: '60s',
      0: 'Manual',
    };
    elements.refreshRate.value = String(ms);
    elements.refreshBtn.textContent = ms === 0 ? 'Refresh' : `Refresh (${options[ms] || `${ms / 1000}s`})`;
  },
};

elements.closeLogModal.addEventListener('click', () => ui.hideLogs());
elements.refreshLogs.addEventListener('click', () => ui.loadLogs());
elements.closeControlModal.addEventListener('click', () => ui.hideControl());
elements.btnStart.addEventListener('click', () => ui.executeControl('start'));
elements.btnStop.addEventListener('click', () => ui.executeControl('stop'));
elements.btnRestart.addEventListener('click', () => ui.executeControl('restart'));
elements.logModal.addEventListener('click', (event) => {
  if (event.target === elements.logModal) ui.hideLogs();
});
elements.controlModal.addEventListener('click', (event) => {
  if (event.target === elements.controlModal) ui.hideControl();
});
