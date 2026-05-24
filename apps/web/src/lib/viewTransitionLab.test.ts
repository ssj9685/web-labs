import { describe, expect, it } from 'vitest'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
  formatProgress,
  transitionTypesForIncident,
} from './viewTransitionLab'

describe('view transition lab helpers', () => {
  it('builds CSS-safe transition names from user-facing labels', () => {
    expect(buildTransitionName('Incident Row', 'Checkout Latency')).toBe(
      'lab-incident-row-checkout-latency',
    )
    expect(buildTransitionName('Trace/Drawer', 'API+Gateway')).toBe(
      'lab-trace-drawer-api-gateway',
    )
  })

  it('turns toolkit support flags into display-ready rows', () => {
    expect(
      capabilityRows({
        sameDocument: true,
        types: false,
        crossDocument: true,
        elementScoped: false,
        activeViewTransition: true,
      }),
    ).toEqual([
      { label: 'Same-document transitions', supported: true },
      { label: 'Transition type routing', supported: false },
      { label: 'Cross-document transitions', supported: true },
      { label: 'Element-scoped transitions', supported: false },
      { label: 'Active transition tracking', supported: true },
    ])
  })

  it('describes manual playback control states in product copy', () => {
    expect(describePlaybackState('running')).toBe('Transition is playing')
    expect(describePlaybackState('paused')).toBe('Transition is paused')
    expect(describePlaybackState('scrubbed')).toBe('Transition held at 50%')
  })

  it('derives transition types from incident navigation intent', () => {
    expect(
      transitionTypesForIncident('checkout-latency', 'edge-cache', 'critical'),
    ).toEqual([
      'from-checkout-latency',
      'to-edge-cache',
      'severity-critical',
    ])
  })

  it('formats scrub progress as a bounded percentage', () => {
    expect(formatProgress(-0.2)).toBe('0%')
    expect(formatProgress(0.375)).toBe('38%')
    expect(formatProgress(1.4)).toBe('100%')
  })
})
