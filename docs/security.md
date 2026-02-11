# Security

## Secrets
- Store secrets only in `.env` on the server
- Never commit real tokens
- Rotate tokens quarterly or after incidents

## Access
- Use a dedicated SSH key for deploy
- Restrict dashboard admin IDs

## Least privilege
- Bot permissions should be minimal
- Roles gate sensitive commands
