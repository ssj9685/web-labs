# Web Labs

Web Labs is a GitHub Pages-hosted playground for modern browser features. The
repo is intentionally shaped like a small monorepo so new experiments can be
added under `apps/` and shared packages can be introduced later without moving
the deployed site.

## Current Lab

- `apps/web`: React + Vite app deployed to GitHub Pages.
- `Checkout Incident Review`: A focused product-style View Transitions Toolkit
  demo for opening a payment latency alert, reviewing evidence, and applying a
  rollback.

The live lab uses:

- temporary transition names from `view-transitions-toolkit/misc`
- active transition tracking from
  `view-transitions-toolkit/track-active-view-transition`

The product flow intentionally keeps the surface small: alert list, focused
review, evidence, rollback, and resolved state.

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
