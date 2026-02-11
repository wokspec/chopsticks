# Contributing

## Workflow
- Branch from `main` as `feat/<name>` or `fix/<name>`
- Open a PR (even if solo) for a clean review trail
- Keep PRs small and shippable

## Local dev
```bash
npm install
npm run deploy:guild
npm run start:all
```

## Code standards
- Prefer explicit, defensive error handling
- Avoid breaking existing behavior unless documented in the changelog
- Keep commands backwards compatible when possible

## Release
- Update `CHANGELOG.md`
- Tag releases with `vX.Y.Z`
