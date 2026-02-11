# Operations

## Monitoring
- Prometheus/Grafana available in `docker-compose.stack.yml`
- Health endpoint: `/healthz`
- Metrics endpoint: `/metrics`

## Backups
- Postgres: nightly `pg_dump` to `/backups`
- `data/` folder (file fallback) should be backed up

## Logs
- Docker logs for containers
- Track agent disconnects and voice errors

## Release checklist
- Deploy to staging
- Run smoke tests
- Deploy to prod
- Post changelog
