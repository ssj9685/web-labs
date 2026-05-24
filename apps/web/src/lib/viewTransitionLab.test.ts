import { describe, expect, it } from 'vitest'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
} from './viewTransitionLab'

describe('view transition lab helpers', () => {
  it('builds CSS-safe transition names from user-facing labels', () => {
    expect(buildTransitionName('Hero Tile', 'Launch Deck')).toBe(
      'lab-hero-tile-launch-deck',
    )
    expect(buildTransitionName('Grid/Detail', 'Revenue+Ops')).toBe(
      'lab-grid-detail-revenue-ops',
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
})
