import { describe, expect, it } from 'vitest'
import { labs, viewTransitionCapabilities } from './labs'

describe('lab catalog', () => {
  it('ships the View Transitions Toolkit lab as the primary live lab', () => {
    expect(labs[0]).toMatchObject({
      slug: 'view-transitions-toolkit',
      title: 'View Transitions Toolkit',
      status: 'live',
    })
    expect(labs[0].capabilities).toEqual(
      expect.arrayContaining([
        'feature-detection',
        'temporary-names',
        'playback-control',
        'animation-optimization',
      ]),
    )
  })

  it('keeps every catalog entry routeable and uniquely addressable', () => {
    const slugs = labs.map((lab) => lab.slug)
    expect(new Set(slugs).size).toBe(labs.length)
    expect(labs.every((lab) => lab.href === `#${lab.slug}`)).toBe(true)
  })

  it('maps toolkit capabilities to human-readable support rows', () => {
    expect(viewTransitionCapabilities).toEqual([
      ['sameDocument', 'Same-document transitions'],
      ['types', 'Transition type routing'],
      ['crossDocument', 'Cross-document transitions'],
      ['elementScoped', 'Element-scoped transitions'],
      ['activeViewTransition', 'Active transition tracking'],
    ])
  })
})
