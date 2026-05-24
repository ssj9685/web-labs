import { describe, expect, it } from 'vitest'
import {
  checkoutReview,
  reviewMotionMoments,
} from './incidents'

describe('incident command data', () => {
  it('frames the demo as one checkout incident review', () => {
    expect(checkoutReview).toMatchObject({
      slug: 'checkout-incident-review',
      title: 'Checkout Incident Review',
      primaryAction: 'Open incident',
      resolutionAction: 'Apply rollback',
    })
    expect(checkoutReview.incidents).toHaveLength(3)
    expect(checkoutReview.incidents[0].id).toBe('checkout-latency')
  })

  it('keeps each incident focused on review evidence and a concrete action', () => {
    const ids = checkoutReview.incidents.map((incident) => incident.id)

    expect(new Set(ids).size).toBe(checkoutReview.incidents.length)
    expect(
      checkoutReview.incidents.every(
        (incident) =>
          incident.evidence.length >= 2 &&
          incident.metrics.length === 2 &&
          incident.rollback.label,
      ),
    ).toBe(true)
  })

  it('limits toolkit references to product-visible motion moments', () => {
    expect(reviewMotionMoments.map((moment) => moment.label)).toEqual([
      'Alert expands into review',
      'Evidence shifts with context',
      'Rollback resolves the review',
    ])
    expect(
      reviewMotionMoments.every((moment) =>
        moment.toolkitUse.includes('View Transitions Toolkit'),
      ),
    ).toBe(true)
  })
})
