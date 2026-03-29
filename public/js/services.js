const API_BASE = '';

async function fetchServices() {
  try {
    const response = await fetch(`${API_BASE}/api/services`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return [];
  }
}

async function fetchConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return { services: [], settings: {} };
  }
}

async function controlService(serviceId, action) {
  try {
    const response = await fetch(`${API_BASE}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, action }),
    });
    return await response.json();
  } catch (error) {
    console.error('Control failed:', error);
    return { success: false, error: error.message };
  }
}

async function fetchLogs(serviceId, lines = 50) {
  try {
    const response = await fetch(`${API_BASE}/api/logs?serviceId=${encodeURIComponent(serviceId)}&lines=${lines}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return { success: false, logs: '', error: error.message };
  }
}

window.fetchServices = fetchServices;
window.fetchConfig = fetchConfig;
window.controlService = controlService;
window.fetchLogs = fetchLogs;
