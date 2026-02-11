# Architecture

## Components
- **Main bot**: Command router, storage, dashboard, agent orchestration.
- **Agents**: Voice + music playback, assistant voice pipeline. No main-bot audio.
- **Lavalink**: Audio backend for music agents.
- **Dashboard**: Admin controls, analytics, audit.
- **Storage**: Postgres (primary), file fallback.
- **Cache**: Redis for guild data.

## Data flow
- Commands → permission gate → storage/config → agent manager → agent command.
- Agents handle voice sessions and report state back via WS control.

## Scaling model
- **Shard main bot** based on guild count.
- **Agents** scale horizontally; sessions are pinned per voice channel.
