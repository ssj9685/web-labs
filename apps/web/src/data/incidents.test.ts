import { describe, expect, it } from 'vitest'
import {
  incidentTimeline,
  primaryWorkspace,
  toolkitMoments,
} from './incidents'

describe('incident command data', () => {
  it('frames Web Labs as one live product workspace', () => {
    expect(primaryWorkspace).toMatchObject({
      slug: 'incident-command',
      title: 'Incident Command Center',
      status: 'live',
    })
    expect(primaryWorkspace.capabilities).toEqual(
      expect.arrayContaining([
        'feature-detection',
        'navigation-types',
        'get-animations',
        'measure',
        'optimize',
        'playback-control',
        'scroll-driven-view-transition',
      ]),
    )
  })

  it('keeps incidents uniquely selectable and rich enough for product detail', () => {
    const ids = incidentTimeline.map((incident) => incident.id)

    expect(new Set(ids).size).toBe(incidentTimeline.length)
    expect(incidentTimeline.length).toBeGreaterThanOrEqual(4)
    expect(
      incidentTimeline.every(
        (incident) =>
          incident.logs.length >= 3 &&
          incident.actions.length >= 2 &&
          incident.metrics.length >= 3,
      ),
    ).toBe(true)
  })

  it('maps the upstream demo folders into one user workflow', () => {
    expect(toolkitMoments.map((moment) => moment.demoFolder)).toEqual([
      'feature-detection',
      'navigation-types',
      'get-animations',
      'measure',
      'optimize',
      'playback-control',
      'scroll-driven-view-transition',
    ])
    expect(toolkitMoments.every((moment) => moment.productMoment)).toBe(true)
  })
})
