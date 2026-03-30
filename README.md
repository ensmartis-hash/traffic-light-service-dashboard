
# Dashboard

Local service monitoring dashboard for opencode, openclaw, hermes-agent, jarvis-mcp, ollama, and litellm.
<img width="925" height="812" alt="Screenshot 2026-03-29 at 11 49 35" src="https://github.com/user-attachments/assets/98ab6d1b-6b73-4343-aca3-910c616e70c5" />

<img width="917" height="889" alt="Screenshot 2026-03-29 at 11 49 43" src="https://github.com/user-attachments/assets/d204e310-bc29-438e-b93e-051b77969937" />


## Features
- Dark theme service cards
- Health checks via local HTTP and port probes
- Start / Stop / Restart controls
- Log viewer modal
- Configurable refresh interval
- Local Node backend to avoid CORS

## Run
```bash
npm start
```

Open:
```text
http://localhost:3000
```

## Configure
- Edit `config/services.json` for services, ports, commands, and log paths
- Refresh interval defaults to 30s
- Log lines default to 50

## Notes
- Controls execute the configured local command.
- If a service cannot be controlled automatically, the command is still shown in the UI so it can be run manually.

