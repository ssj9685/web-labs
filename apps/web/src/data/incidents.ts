export type WorkspaceStatus = 'live' | 'queued' | 'research'
export type IncidentSeverity = 'critical' | 'high' | 'medium'
export type IncidentStatus = 'investigating' | 'mitigating' | 'monitoring'

export type Workspace = {
  slug: string
  title: string
  status: WorkspaceStatus
  subtitle: string
  capabilities: string[]
}

export type IncidentMetric = {
  label: string
  value: string
  trend: string
}

export type IncidentLog = {
  time: string
  level: 'error' | 'warn' | 'info'
  message: string
}

export type IncidentAction = {
  label: string
  state: 'ready' | 'running' | 'done'
}

export type IncidentSuspect = {
  label: string
  confidence: string
}

export type Incident = {
  id: string
  time: string
  service: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  impact: string
  region: string
  signal: string
  duration: string
  summary: string
  metrics: IncidentMetric[]
  logs: IncidentLog[]
  actions: IncidentAction[]
  suspects: IncidentSuspect[]
}

export type ToolkitMoment = {
  demoFolder: string
  label: string
  productMoment: string
}

export const primaryWorkspace: Workspace = {
  slug: 'incident-command',
  title: 'Incident Command Center',
  status: 'live',
  subtitle:
    'A single operations surface that folds the View Transitions Toolkit demos into incident triage, animation inspection, and timeline scrubbing.',
  capabilities: [
    'feature-detection',
    'navigation-types',
    'get-animations',
    'measure',
    'optimize',
    'playback-control',
    'scroll-driven-view-transition',
  ],
}

export const toolkitMoments: ToolkitMoment[] = [
  {
    demoFolder: 'feature-detection',
    label: 'Capability check',
    productMoment: 'Browser support gates the motion controls in the header.',
  },
  {
    demoFolder: 'navigation-types',
    label: 'Route intent',
    productMoment: 'Incident switches are tagged as from, to, and severity types.',
  },
  {
    demoFolder: 'get-animations',
    label: 'Animation inventory',
    productMoment: 'The inspector counts live View Transition animations.',
  },
  {
    demoFolder: 'measure',
    label: 'Geometry readout',
    productMoment: 'The detail panel records before and after group bounds.',
  },
  {
    demoFolder: 'optimize',
    label: 'Group optimization',
    productMoment: 'Selected transition groups are converted to compositor-safe motion.',
  },
  {
    demoFolder: 'playback-control',
    label: 'Pause and resume',
    productMoment: 'Operators can hold a transition to inspect the exact frame.',
  },
  {
    demoFolder: 'scroll-driven-view-transition',
    label: 'Timeline scrub',
    productMoment: 'A scrubber drives the active transition through incident states.',
  },
]

export const incidentTimeline: Incident[] = [
  {
    id: 'checkout-latency',
    time: '09:41',
    service: 'Checkout API',
    title: 'Payment authorization latency',
    severity: 'critical',
    status: 'mitigating',
    impact: '18% checkout sessions delayed',
    region: 'NA / EU edge',
    signal: 'p95 4.8s',
    duration: '23 min',
    summary:
      'Authorization calls are queuing behind a retry spike after the latest edge cache rule rollout.',
    metrics: [
      { label: 'p95 latency', value: '4.8s', trend: '+312%' },
      { label: 'error budget', value: '71%', trend: '-9 pts' },
      { label: 'affected users', value: '42k', trend: '+18k' },
    ],
    logs: [
      {
        time: '09:41:18',
        level: 'error',
        message: 'POST /payments/authorize exceeded retry budget',
      },
      {
        time: '09:40:44',
        level: 'warn',
        message: 'Edge cache rule checkout-auth-v7 promoted to 100%',
      },
      {
        time: '09:39:57',
        level: 'info',
        message: 'Queue depth crossed adaptive shed threshold',
      },
    ],
    actions: [
      { label: 'Rollback cache rule', state: 'running' },
      { label: 'Shift 20% traffic to warm pool', state: 'ready' },
      { label: 'Notify commerce support', state: 'done' },
    ],
    suspects: [
      { label: 'checkout-auth-v7', confidence: '82%' },
      { label: 'issuer retry fanout', confidence: '64%' },
    ],
  },
  {
    id: 'edge-cache',
    time: '09:27',
    service: 'Edge Cache',
    title: 'Regional cache miss surge',
    severity: 'high',
    status: 'investigating',
    impact: 'Product detail pages slower in EU West',
    region: 'EU West',
    signal: 'miss rate 38%',
    duration: '17 min',
    summary:
      'A configuration drift between two cache clusters is pushing product pages back to origin.',
    metrics: [
      { label: 'cache miss', value: '38%', trend: '+24 pts' },
      { label: 'origin load', value: '2.3x', trend: '+1.1x' },
      { label: 'page p75', value: '1.9s', trend: '+680ms' },
    ],
    logs: [
      {
        time: '09:27:08',
        level: 'warn',
        message: 'Cache shard euw-2 rejected signed variant headers',
      },
      {
        time: '09:26:32',
        level: 'info',
        message: 'Origin protection rule entered observation mode',
      },
      {
        time: '09:24:51',
        level: 'warn',
        message: 'Variant key mismatch detected across clusters',
      },
    ],
    actions: [
      { label: 'Pin traffic to euw-1', state: 'ready' },
      { label: 'Compare cache manifests', state: 'running' },
      { label: 'Freeze rule propagation', state: 'done' },
    ],
    suspects: [
      { label: 'variant header drift', confidence: '74%' },
      { label: 'stale manifest bundle', confidence: '58%' },
    ],
  },
  {
    id: 'search-index',
    time: '08:58',
    service: 'Search Index',
    title: 'Index freshness gap',
    severity: 'medium',
    status: 'monitoring',
    impact: 'New inventory delayed in search results',
    region: 'Global',
    signal: 'lag 11m',
    duration: '44 min',
    summary:
      'Index workers recovered after compaction pressure, but freshness remains above the target window.',
    metrics: [
      { label: 'freshness lag', value: '11m', trend: '-6m' },
      { label: 'worker drain', value: '91%', trend: '+19 pts' },
      { label: 'queue size', value: '128k', trend: '-42k' },
    ],
    logs: [
      {
        time: '08:58:43',
        level: 'info',
        message: 'Compaction pressure returned below warning threshold',
      },
      {
        time: '08:55:10',
        level: 'warn',
        message: 'Search worker pool scaled from 42 to 64 replicas',
      },
      {
        time: '08:51:34',
        level: 'info',
        message: 'Backfill batch inventory-delta-1842 resumed',
      },
    ],
    actions: [
      { label: 'Keep elevated worker pool', state: 'running' },
      { label: 'Audit compaction schedule', state: 'ready' },
      { label: 'Update merchandising ETA', state: 'done' },
    ],
    suspects: [
      { label: 'compaction overlap', confidence: '69%' },
      { label: 'inventory delta burst', confidence: '47%' },
    ],
  },
  {
    id: 'identity-rate-limit',
    time: '08:36',
    service: 'Identity',
    title: 'Login rate-limit false positives',
    severity: 'high',
    status: 'mitigating',
    impact: 'Some returning users challenged twice',
    region: 'APAC mobile',
    signal: 'challenge +22%',
    duration: '31 min',
    summary:
      'A bot-defense threshold is catching legitimate mobile clients after device fingerprint entropy changed.',
    metrics: [
      { label: 'challenge rate', value: '22%', trend: '+14 pts' },
      { label: 'login success', value: '93%', trend: '-3 pts' },
      { label: 'support tickets', value: '318', trend: '+96' },
    ],
    logs: [
      {
        time: '08:36:28',
        level: 'warn',
        message: 'Mobile fingerprint score shifted below trust threshold',
      },
      {
        time: '08:33:59',
        level: 'info',
        message: 'Bot-defense model bdf-2026-05 entered staged rollout',
      },
      {
        time: '08:32:12',
        level: 'error',
        message: 'Login challenge loop detected for trusted session cohort',
      },
    ],
    actions: [
      { label: 'Relax mobile entropy threshold', state: 'running' },
      { label: 'Segment trusted cohorts', state: 'ready' },
      { label: 'Publish support macro', state: 'done' },
    ],
    suspects: [
      { label: 'bdf-2026-05 model', confidence: '77%' },
      { label: 'SDK fingerprint patch', confidence: '62%' },
    ],
  },
]
