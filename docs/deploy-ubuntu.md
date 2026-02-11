# Deploy on Ubuntu (Production)

## Requirements
- Docker + Docker Compose
- Git
- Node.js (only for local tooling, optional if using Docker)

## Setup
1. Clone repo:
   ```bash
   git clone <your-repo> chopsticks
   cd chopsticks
   ```
2. Create `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill secrets in `.env` (Discord tokens, DB, OAuth, etc).

## Start stack
```bash
./scripts/stack-up.sh
```

## Systemd (recommended)
Create `/etc/systemd/system/chopsticks.service`:
```ini
[Unit]
Description=Chopsticks bot stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/chopsticks
ExecStart=/opt/chopsticks/scripts/stack-up.sh
ExecStop=/opt/chopsticks/scripts/stack-down.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now chopsticks
```

## Deploy updates
```bash
./scripts/deploy-prod.sh
```

## GitHub Actions deploy
Set secrets in your repo:
- `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `DEPLOY_PATH`

Then run the **Deploy** workflow.

## Rollback
```bash
./scripts/rollback.sh vX.Y.Z
```

## Health
- Metrics: `http://<host>:9100/metrics`
- Health: `http://<host>:9100/healthz`
