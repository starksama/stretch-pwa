# Stretch Flow PWA

Mobile-first progressive web app for daily stretching habits.

## Structure

- `apps/stretch-pwa`: Installable web client (PWA shell + UI)
- `packages/domain`: Shared workout/streak/routine domain logic
- `packages/storage`: Persistence adapters
- `packages/integrations`: External sync scaffolds (feature-flagged)

## Quick Start

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/apps/stretch-pwa/`.
