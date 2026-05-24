# Web Labs

Web Labs is a GitHub Pages-hosted playground for modern browser features. The
repo is intentionally shaped like a small monorepo so new experiments can be
added under `apps/` and shared packages can be introduced later without moving
the deployed site.

## Current Lab

- `apps/web`: React + Vite app deployed to GitHub Pages.
- `View Transitions Toolkit`: A production-style interaction lab inspired by
  `googlechromelabs/view-transitions-toolkit`.

The live lab uses:

- feature detection from `view-transitions-toolkit/feature-detection`
- temporary transition names from `view-transitions-toolkit/misc`
- playback controls from `view-transitions-toolkit/playback-control`
- group animation optimization from `view-transitions-toolkit/animations`
- active transition tracking from
  `view-transitions-toolkit/track-active-view-transition`

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
