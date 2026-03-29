<<<<<<< HEAD
# Dashboard

Local service monitoring dashboard for opencode, openclaw, hermes-agent, jarvis-mcp, ollama, and litellm.

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
=======
# traffic-light-service-dashboard
Just a simple local dashboard of the services and the state of them, logs etc. 
>>>>>>> c1d46aa93183b8c63b89aea310a7d5d352c3f250
