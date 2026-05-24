export type ReviewStage = 'alert' | 'review' | 'resolved'
export type IncidentSeverity = 'critical' | 'high' | 'medium'

export type ReviewMetric = {
  label: string
  before: string
  after: string
}

export type ReviewEvidence = {
  time: string
  label: string
  detail: string
}

export type RollbackPlan = {
  label: string
  target: string
  expectedResult: string
}

export type ReviewIncident = {
  id: string
  time: string
  title: string
  service: string
  severity: IncidentSeverity
  impact: string
  summary: string
  metrics: ReviewMetric[]
  evidence: ReviewEvidence[]
  rollback: RollbackPlan
}

export type CheckoutReview = {
  slug: string
  title: string
  subtitle: string
  primaryAction: string
  resolutionAction: string
  incidents: ReviewIncident[]
}

export type ReviewMotionMoment = {
  label: string
  productMoment: string
  toolkitUse: string
}

export const checkoutReview: CheckoutReview = {
  slug: 'checkout-incident-review',
  title: 'Checkout Incident Review',
  subtitle:
    'Review the payment latency alert, inspect the evidence, and apply the rollback.',
  primaryAction: 'Open incident',
  resolutionAction: 'Apply rollback',
  incidents: [
    {
      id: 'checkout-latency',
      time: '09:41',
      title: 'Payment authorization latency',
      service: 'Checkout API',
      severity: 'critical',
      impact: '18% of checkout sessions delayed',
      summary:
        'A cache rule rollout caused authorization retries to queue behind the payment gateway.',
      metrics: [
        { label: 'p95 latency', before: '4.8s', after: '740ms' },
        { label: 'retry rate', before: '31%', after: '4%' },
      ],
      evidence: [
        {
          time: '09:40',
          label: 'Rollout reached 100%',
          detail: 'checkout-auth-v7 was promoted to every edge region.',
        },
        {
          time: '09:41',
          label: 'Retry budget exceeded',
          detail: 'Payment authorization requests crossed the retry threshold.',
        },
      ],
      rollback: {
        label: 'Rollback checkout-auth-v7',
        target: 'Edge cache rule',
        expectedResult: 'p95 latency returned below target',
      },
    },
    {
      id: 'issuer-timeouts',
      time: '09:37',
      title: 'Issuer timeout spike',
      service: 'Payment Gateway',
      severity: 'high',
      impact: 'Card authorization retries elevated',
      summary:
        'A subset of issuer calls slowed down after traffic shifted to the warm pool.',
      metrics: [
        { label: 'issuer timeout', before: '12%', after: '2%' },
        { label: 'approval rate', before: '91%', after: '97%' },
      ],
      evidence: [
        {
          time: '09:36',
          label: 'Warm pool shift',
          detail: 'Traffic moved to the secondary gateway pool during mitigation.',
        },
        {
          time: '09:37',
          label: 'Issuer queue grew',
          detail: 'The timeout spike is isolated to two issuer integrations.',
        },
      ],
      rollback: {
        label: 'Restore primary gateway route',
        target: 'Payment route map',
        expectedResult: 'issuer timeout returned below target',
      },
    },
    {
      id: 'support-volume',
      time: '09:32',
      title: 'Support contact increase',
      service: 'Customer Support',
      severity: 'medium',
      impact: 'Checkout delay tickets increasing',
      summary:
        'Customers are contacting support after seeing the payment confirmation screen stall.',
      metrics: [
        { label: 'new tickets', before: '318', after: '46' },
        { label: 'avg wait', before: '11m', after: '2m' },
      ],
      evidence: [
        {
          time: '09:31',
          label: 'Ticket macro created',
          detail: 'Support prepared a response for delayed payment confirmations.',
        },
        {
          time: '09:32',
          label: 'Contact rate peaked',
          detail: 'Most tickets reference checkout confirmation latency.',
        },
      ],
      rollback: {
        label: 'Publish resolved notice',
        target: 'Support status banner',
        expectedResult: 'ticket volume returned below target',
      },
    },
  ],
}

export const reviewMotionMoments: ReviewMotionMoment[] = [
  {
    label: 'Alert expands into review',
    productMoment: 'The selected alert keeps its identity as the review opens.',
    toolkitUse: 'View Transitions Toolkit assigns temporary names to the alert and detail header.',
  },
  {
    label: 'Evidence shifts with context',
    productMoment: 'Metrics and evidence move together when a different alert is selected.',
    toolkitUse: 'View Transitions Toolkit keeps the focused evidence panel visually continuous.',
  },
  {
    label: 'Rollback resolves the review',
    productMoment: 'The review changes into a resolved state without losing the incident context.',
    toolkitUse: 'View Transitions Toolkit wraps the state change and fallback update path.',
  },
]
