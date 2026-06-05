import { describe, expect, it, vi } from 'vitest'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
  formatProgress,
  runViewTransition,
  transitionTypesForChessMove,
} from './viewTransitionLab'

describe('view transition lab helpers', () => {
  it('builds CSS-safe transition names from user-facing labels', () => {
    expect(buildTransitionName('Selected Square', 'E2 Pawn')).toBe(
      'lab-selected-square-e2-pawn',
    )
    expect(buildTransitionName('Move/Trace', 'E2+E4')).toBe(
      'lab-move-trace-e2-e4',
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

  it('derives transition types from chess move intent', () => {
    expect(
      transitionTypesForChessMove('e2', 'e4', 'pawn'),
    ).toEqual([
      'chess-move',
      'from-e2',
      'to-e4',
      'piece-pawn',
    ])
  })

  it('formats scrub progress as a bounded percentage', () => {
    expect(formatProgress(-0.2)).toBe('0%')
    expect(formatProgress(0.375)).toBe('38%')
    expect(formatProgress(1.4)).toBe('100%')
  })

  it('runs the update immediately when same-document transitions are unavailable', () => {
    let updated = false

    const transition = runViewTransition(['chess-move'], () => {
      updated = true
    })

    expect(transition).toBeNull()
    expect(updated).toBe(true)
  })

  it('adds transition types when the browser exposes startViewTransition', () => {
    const add = vi.fn()
    const startViewTransition = vi
      .fn()
      .mockImplementation((callback: () => void) => {
        callback()

        return {
          finished: Promise.resolve(),
          ready: Promise.resolve(),
          types: { add },
          updateCallbackDone: Promise.resolve(),
          skipTransition: vi.fn(),
        }
      })
    let updated = false

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })

    const transition = runViewTransition(['chess-move', 'from-e2'], () => {
      updated = true
    })

    Reflect.deleteProperty(document, 'startViewTransition')

    expect(transition).not.toBeNull()
    expect(updated).toBe(true)
    expect(startViewTransition).toHaveBeenCalled()
    expect(add).toHaveBeenCalledWith('chess-move')
    expect(add).toHaveBeenCalledWith('from-e2')
  })
})
