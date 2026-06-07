# Web Labs

Web Labs is a GitHub Pages-hosted playground for modern browser features. The
repo is intentionally shaped like a small monorepo so new experiments can be
added under `apps/` and shared packages can be introduced later without moving
the deployed site.

## Current Lab

- `apps/web`: React + Vite app deployed to GitHub Pages.
- `Chess Access Lab`: A Three.js-rendered 3D chess playground that combines
  imported chess assets with one persistent accessible HTML board layer.

The live lab uses:

- `chess.js` for legal chess rules.
- Three.js plus the Poly Haven Chess Set model for the visible 3D board and
  pieces.
- Local SVG effect textures for the selected-piece aura and legal move markers.
- DOM buttons, `role="grid"`, `role="gridcell"`, and `aria-live` layered over
  the 3D board for keyboard controls and move announcements.
- View Transition Toolkit feature detection plus typed same-document transition
  names for square selection, move updates, and move trace entries.
- A move trace panel that turns chess moves into visible experiment telemetry.

The accessible DOM board remains active even if the WebGL asset renderer cannot
initialize.

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
