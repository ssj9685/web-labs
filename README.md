# Web Labs

Web Labs is a GitHub Pages-hosted playground for modern browser features. The
repo is intentionally shaped like a small monorepo so new experiments can be
added under `apps/` and shared packages can be introduced later without moving
the deployed site.

## Current Lab

- `apps/web`: React + Vite app deployed to GitHub Pages.
- `Incident Command Center`: A product-style View Transitions Toolkit demo that
  folds the upstream demo folders into one incident triage workflow.

The live lab uses:

- feature detection from `view-transitions-toolkit/feature-detection`
- transition animation inventory, geometry extraction, and group optimization
  from `view-transitions-toolkit/animations`
- playback controls from `view-transitions-toolkit/playback-control`
- temporary transition names from `view-transitions-toolkit/misc`
- active transition tracking from
  `view-transitions-toolkit/track-active-view-transition`

The product flow maps the upstream `demo/feature-detection`,
`demo/navigation-types`, `demo/get-animations`, `demo/measure`,
`demo/optimize`, `demo/playback-control`, and
`demo/scroll-driven-view-transition` examples into one workspace.

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
