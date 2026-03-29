# Dashboard - Local Service Monitor

## Project Overview
- **Project Name**: Dashboard
- **Project Path**: /Users/otto/Documents/Projects/Dashboard
- **Type**: Local web application (service monitoring dashboard)
- **Core Functionality**: Monitor local service availability with traffic light indicators, provide controls to start/stop/restart services, view logs, and access service URLs.
- **Target Users**: Developer managing local services (opencode, openclaw, hermes-agent, jarvis mcp, ollama, litellm)

## Technical Stack
- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Simple Node.js server for API proxying (avoids CORS)
- **No external dependencies** for frontend (pure vanilla)
- **Refresh Rate**: 30 seconds default, user-configurable

## UI/UX Specification

### Layout Structure
- **Header**: Project title, last refresh timestamp, refresh rate selector
- **Main Grid**: Service cards in responsive grid layout
- **Footer**: Status summary, manual refresh button

### Responsive Breakpoints
- Desktop (>1024px): 3-column grid
- Tablet (768-1024px): 2-column grid
- Mobile (<768px): Single column

### Visual Design
- **Color Palette**:
  - Background: #0d1117 (dark)
  - Card Background: #161b22
  - Border: #30363d
  - Text Primary: #e6edf3
  - Text Secondary: #8b949e
  - Status Green: #3fb950
  - Status Yellow: #d29922
  - Status Red: #f85149
  - Accent: #58a6ff

- **Typography**:
  - Font Family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
  - Heading: 24px bold
  - Card Title: 16px semibold
  - Body: 14px regular

- **Spacing**:
  - Card padding: 16px
  - Grid gap: 16px
  - Section margin: 24px

### Components

#### Service Card
- Service name (title)
- Status indicator (traffic light: green/yellow/red circle)
- URL with clickable link
- Port number
- Health check endpoint
- Action buttons: Start, Stop, Restart
- Log button (opens log viewer)
- Last checked timestamp

#### Log Viewer Modal
- Overlay modal with dark theme
- Log content display (scrollable)
- Auto-scroll toggle
- Close button
- Service name header

#### Refresh Rate Selector
- Dropdown: 10s, 30s, 60s, 5m (manual)
- Current rate display in header

## Functionality Specification

### Core Features

1. **Service Status Monitoring**
   - HTTP health check to service endpoint
   - Port availability check
   - Status determination: green (healthy), yellow (degraded), red (down)
   - Manual refresh button
   - Auto-refresh at configurable interval

2. **Service Controls**
   - Start service (executes configured start command)
   - Stop service (executes configured stop command)
   - Restart service (stop + start)
   - Display command output/status

3. **Log Viewing**
   - Button to view service logs
   - Reads from configured log file path
   - Displays last N lines (configurable)
   - Option to tail -f live (via polling)

4. **Service Links**
   - Clickable URL to open service in browser
   - Copy URL to clipboard button

### Services to Monitor (Initial Configuration)
| Service | URL | Port | Health Endpoint | Log Path |
|---------|-----|------|-----------------|----------|
| OpenCode | http://localhost | 8080 | /health | ~/.opencode/logs/*.log |
| OpenClaw | http://localhost | 8090 | /health | ~/.openclaw/logs/*.log |
| Hermes Agent | http://localhost | 8100 | /health | ~/hermes-agent/logs/*.log |
| Jarvis MCP | http://localhost | 8200 | /health | ~/jarvis-mcp/logs/*.log |
| Ollama | http://localhost | 11434 | /api/tags | ~/.ollama/logs/*.log |
| LiteLLM | http://localhost | 4000 | /health | ~/.litellm/logs/*.log |

### User Interactions
- Click status indicator → manual immediate check
- Click Start/Stop/Restart → execute service command
- Click Log button → open log viewer modal
- Click URL link → open service in new tab
- Change refresh rate → update polling interval
- Click refresh button → immediate status check

### Edge Cases
- Service not configured → show "Not Configured" state
- Health check timeout → show red status
- Command execution failure → show error message
- Log file not found → show appropriate error
- CORS issues → backend proxy handles

## Project Structure
```
Dashboard/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── services.js
│       └── ui.js
├── server/
│   └── index.js
├── config/
│   └── services.json
├── logs/
│   └── .gitkeep
├── package.json
├── README.md
└── SPEC.md
```

## Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme applied consistently
- [ ] Service cards display in grid layout
- [ ] Traffic light indicators show correct colors
- [ ] All buttons are clickable and provide feedback
- [ ] Log modal opens and displays content
- [ ] Responsive layout works on all breakpoints

### Functional Checkpoints
- [ ] Page loads without errors
- [ ] Service status checks execute on load
- [ ] Auto-refresh works at configured interval
- [ ] Manual refresh button triggers immediate check
- [ ] Start/Stop/Restart buttons execute commands
- [ ] Log viewer reads and displays log files
- [ ] Service URLs are clickable
- [ ] Refresh rate selector changes polling interval

### Technical Checkpoints
- [ ] No CORS errors (backend proxy working)
- [ ] Console shows no critical errors
- [ ] All static files load correctly
- [ ] Server starts without errors
