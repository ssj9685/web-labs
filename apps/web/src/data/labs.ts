export type LabStatus = 'live' | 'queued' | 'research'

export type Lab = {
  slug: string
  title: string
  kicker: string
  subtitle: string
  status: LabStatus
  href: string
  accent: string
  capabilities: string[]
  metric: string
}

export type LabCase = {
  id: string
  title: string
  category: string
  owner: string
  metric: string
  signal: string
  summary: string
  tone: 'mint' | 'coral' | 'amber' | 'ink'
}

export const viewTransitionCapabilities = [
  ['sameDocument', 'Same-document transitions'],
  ['types', 'Transition type routing'],
  ['crossDocument', 'Cross-document transitions'],
  ['elementScoped', 'Element-scoped transitions'],
  ['activeViewTransition', 'Active transition tracking'],
] as const

export const labs: Lab[] = [
  {
    slug: 'view-transitions-toolkit',
    title: 'View Transitions Toolkit',
    kicker: 'Chrome Labs reference',
    subtitle:
      'A production-style workspace that exercises feature detection, temporary names, playback control, and group animation optimization.',
    status: 'live',
    href: '#view-transitions-toolkit',
    accent: 'Motion',
    capabilities: [
      'feature-detection',
      'temporary-names',
      'playback-control',
      'animation-optimization',
    ],
    metric: '4 toolkit modules',
  },
  {
    slug: 'scroll-driven-ui',
    title: 'Scroll-driven UI',
    kicker: 'CSS timelines',
    subtitle:
      'A queued lab for scroll progress, sticky scenes, and content-aware motion that does not require JavaScript timelines.',
    status: 'queued',
    href: '#scroll-driven-ui',
    accent: 'Scroll',
    capabilities: ['scroll-timeline', 'view-timeline', 'sticky-scenes'],
    metric: 'Spec watch',
  },
  {
    slug: 'popover-command',
    title: 'Popover Command Surface',
    kicker: 'Native overlays',
    subtitle:
      'A research lab for popover, command menus, and anchor-positioned controls that behave like app-grade primitives.',
    status: 'research',
    href: '#popover-command',
    accent: 'Overlay',
    capabilities: ['popover', 'anchor-positioning', 'light-dismiss'],
    metric: 'Prototype',
  },
]

export const labCases: LabCase[] = [
  {
    id: 'launch-deck',
    title: 'Launch Deck',
    category: 'Go-to-market',
    owner: 'Growth',
    metric: '18 modules',
    signal: '+32% scan depth',
    summary:
      'Switches between campaign modules while preserving visual continuity for the selected artifact.',
    tone: 'mint',
  },
  {
    id: 'revenue-ops',
    title: 'Revenue Ops',
    category: 'Dashboard',
    owner: 'Operations',
    metric: '7 live views',
    signal: '420 ms perceived',
    summary:
      'Turns dense operational cards into detail views without losing the user’s place in the grid.',
    tone: 'coral',
  },
  {
    id: 'design-qa',
    title: 'Design QA',
    category: 'Review',
    owner: 'Product',
    metric: '42 checks',
    signal: 'No jump cuts',
    summary:
      'Uses playback controls to pause and inspect transition snapshots during interface reviews.',
    tone: 'amber',
  },
  {
    id: 'support-flow',
    title: 'Support Flow',
    category: 'Workflow',
    owner: 'Success',
    metric: '11 states',
    signal: 'Stable focus',
    summary:
      'Demonstrates a route-like state change that keeps context readable through rapid transitions.',
    tone: 'ink',
  },
]
