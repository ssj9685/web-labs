# Web Labs

Web Labs is a GitHub Pages-hosted playground for modern browser features. The
repo is intentionally shaped like a small monorepo so new experiments can be
added under `apps/` and shared packages can be introduced later without moving
the deployed site.

## Current Lab

- `apps/web`: React + Vite app deployed to GitHub Pages.
- `Chess Access Lab`: A canvas-rendered chess playground that combines several
  browser experiments inside one playable product flow.

The live lab uses:

- `chess.js` for legal chess rules.
- WebGPU compatibility-mode detection when available.
- 2D canvas fallback when WebGPU is unavailable or initialization fails.
- DOM buttons, `role="grid"`, `role="gridcell"`, and `aria-live` for the
  accessible board and move announcements.
- View Transition Toolkit feature detection plus typed same-document transition
  names for square selection, move updates, and move trace entries.
- A move trace panel that turns chess moves into visible experiment telemetry.

WebGPU is treated as a progressive enhancement because it is not Baseline
across the core browser set yet. The accessible DOM board remains active in all
rendering modes.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

## Deployment

GitHub Pages is deployed by `.github/workflows/deploy.yml` from the `main`
branch. The Vite app builds with `base: /web-labs/`, so assets resolve correctly
under the Pages project path.
