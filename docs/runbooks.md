# Runbooks

## Bot not responding
1. Check container status
2. Check Discord token and rate limits
3. Restart stack

## Lavalink down
1. Restart lavalink container
2. Check `LAVALINK_*` env
3. Confirm port 2333 is open

## Agents offline
1. Verify agent tokens
2. Check agent WS control host/port
3. Restart agents

## Dashboard OAuth fails
1. Validate redirect URI
2. Check client secret
3. Verify cookies/HTTPS
