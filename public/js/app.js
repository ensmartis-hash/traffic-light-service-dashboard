let servicesCache = [];
let refreshTimer = null;
let refreshInterval = 30000;

const app = {
  async init() {
    const config = await fetchConfig();
    refreshInterval = config.settings?.refreshInterval || 30000;
    ui.setRefreshRateLabel(refreshInterval);
    elements.refreshRate.value = String(refreshInterval);
    elements.customRefresh.value = String(Math.round(refreshInterval / 1000));

    elements.refreshRate.addEventListener('change', () => this.setRefreshInterval(Number(elements.refreshRate.value)));
    elements.refreshBtn.addEventListener('click', () => this.refresh());
    elements.applyRefresh.addEventListener('click', () => {
      const seconds = Number(elements.customRefresh.value);
      if (Number.isFinite(seconds) && seconds > 0) {
        this.setRefreshInterval(seconds * 1000);
      }
    });

    await this.refresh();
    this.startPolling();
  },

  async refresh() {
    const services = await fetchServices();
    servicesCache = services;

    if (elements.servicesGrid.children.length === 0) {
      ui.renderServices(services);
    } else {
      ui.updateServices(services);
    }

    ui.updateSummary(services);
    ui.formatRefreshTime();
  },

  startPolling() {
    this.stopPolling();
    if (refreshInterval <= 0) return;
    refreshTimer = setInterval(() => this.refresh(), refreshInterval);
  },

  stopPolling() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },

  setRefreshInterval(ms) {
    refreshInterval = ms;
    ui.setRefreshRateLabel(ms);
    this.startPolling();
  },

  getServices() {
    return servicesCache.slice();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  app.init().catch((error) => {
    console.error('Failed to initialize app:', error);
    elements.statusSummary.textContent = `Initialization failed: ${error.message}`;
  });
});

window.app = app;
