import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChessPlayground } from './ChessPlayground'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLDivElement | null = null
let getContextSpy: ReturnType<typeof vi.spyOn>
let root: Root | null = null

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const renderChess = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  const currentRoot = createRoot(container)
  root = currentRoot

  await act(async () => {
    currentRoot.render(createElement(ChessPlayground))
  })
}

const squareButton = (square: string) => {
  if (!container) throw new Error('Chess playground is not rendered')

  const element = container.querySelector<HTMLButtonElement>(
    `[data-square="${square}"]`,
  )
  if (!element) throw new Error(`Missing square ${square}`)
  return element
}

const pressSquare = async (square: string, key: string) => {
  const element = squareButton(square)

  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
  })
}

const touchSquare = async (square: string) => {
  const element = squareButton(square)

  const touchStart = new Event('touchstart', {
    bubbles: true,
    cancelable: true,
  })
  const touchEnd = new Event('touchend', {
    bubbles: true,
    cancelable: true,
  })

  await act(async () => {
    element.dispatchEvent(touchStart)
    element.dispatchEvent(touchEnd)
  })
}

const flushAsyncEffects = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('ChessPlayground accessibility', () => {
  beforeEach(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    getContextSpy.mockRestore()
    container?.remove()
    container = null
    Reflect.deleteProperty(window, 'matchMedia')
    Reflect.deleteProperty(navigator, 'gpu')
  })

  it('renders a canvas visual board with a semantic board for assistive tech', async () => {
    await renderChess()

    expect(container?.querySelector('canvas')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    expect(
      container
        ?.querySelector('[role="grid"]')
        ?.getAttribute('aria-label'),
    ).toBe('Accessible chess board')
    expect(container?.querySelectorAll('[role="gridcell"]')).toHaveLength(64)
    expect(squareButton('e2').getAttribute('aria-label')).toBe('e2 white pawn')
  })

  it('moves a piece with keyboard commands and announces the result', async () => {
    await renderChess()

    await pressSquare('e2', ' ')
    expect(squareButton('e2').getAttribute('aria-selected')).toBe('true')

    await pressSquare('e4', 'Enter')

    expect(squareButton('e4').getAttribute('aria-label')).toBe('e4 white pawn')
    expect(container?.querySelector('[role="status"]')?.textContent).toBe(
      'White pawn moved from e2 to e4. Black to move.',
    )
  })

  it('shows the active 3D rendering path and baseline note', async () => {
    await renderChess()

    expect(container?.textContent).toContain('Renderer')
    expect(container?.textContent).toContain('3D renderer unavailable')
    expect(container?.textContent).toContain(
      'Native HTML grid, buttons, keyboard handlers, and aria-live status layered over 3D or shown as a visible 2D board.',
    )
  })

  it('keeps the right rail focused on status and move trace', async () => {
    await renderChess()

    expect(container?.textContent).not.toContain('Experiment stack')
    expect(container?.textContent).toContain('Move trace')
    expect(container?.textContent).toContain('No moves yet')

    await pressSquare('e2', ' ')
    await pressSquare('e4', 'Enter')

    expect(container?.textContent).toContain('white pawn')
    expect(container?.textContent).toContain('e2 -> e4')
    expect(container?.querySelector('.move-trace code')).toBeNull()
  })

  it('keeps the mobile history sheet open during board taps and closes from the close button', async () => {
    await renderChess()

    const stage = container?.querySelector('.chess-stage')
    const historyToggle = container?.querySelector<HTMLButtonElement>(
      '.history-toggle',
    )
    const movePanel = container?.querySelector('.move-panel')
    const closeButton = container?.querySelector<HTMLButtonElement>(
      '.move-panel-close',
    )

    expect(stage).not.toBeNull()
    expect(historyToggle).not.toBeNull()
    expect(movePanel).not.toBeNull()
    expect(closeButton).not.toBeNull()

    await act(async () => {
      historyToggle?.click()
    })
    expect(stage?.classList.contains('is-history-open')).toBe(true)

    await act(async () => {
      movePanel?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(stage?.classList.contains('is-history-open')).toBe(true)

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    expect(stage?.classList.contains('is-history-open')).toBe(true)

    await act(async () => {
      closeButton?.click()
    })
    expect(stage?.classList.contains('is-history-open')).toBe(false)
  })

  it('cycles the 3D camera view from the board controls', async () => {
    await renderChess()

    const viewToggle = container?.querySelector<HTMLButtonElement>('.view-toggle')

    expect(viewToggle).not.toBeNull()
    expect(viewToggle?.getAttribute('aria-label')).toContain('White view')
    expect(viewToggle?.textContent).toContain('White')

    await act(async () => {
      viewToggle?.click()
    })
    expect(viewToggle?.getAttribute('aria-label')).toContain('Black view')
    expect(viewToggle?.textContent).toContain('Black')

    await act(async () => {
      viewToggle?.click()
    })
    expect(viewToggle?.getAttribute('aria-label')).toContain('Top view')
    expect(viewToggle?.textContent).toContain('Top')
  })

  it('toggles constrained orbit mode from the board controls', async () => {
    await renderChess()

    const stagePanel = container?.querySelector('.canvas-panel')
    const orbitToggle =
      container?.querySelector<HTMLButtonElement>('.orbit-toggle')
    const viewToggle = container?.querySelector<HTMLButtonElement>('.view-toggle')

    expect(stagePanel).not.toBeNull()
    expect(orbitToggle).not.toBeNull()
    expect(orbitToggle?.getAttribute('aria-pressed')).toBe('false')

    await act(async () => {
      orbitToggle?.click()
    })
    expect(orbitToggle?.getAttribute('aria-pressed')).toBe('true')
    expect(stagePanel?.classList.contains('is-orbiting')).toBe(true)

    await act(async () => {
      viewToggle?.click()
    })
    expect(orbitToggle?.getAttribute('aria-pressed')).toBe('false')
    expect(stagePanel?.classList.contains('is-orbiting')).toBe(false)
  })

  it('adds View Transition types for square selection and moves when supported', async () => {
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

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })

    await renderChess()
    await pressSquare('e2', ' ')
    await pressSquare('e4', 'Enter')

    Reflect.deleteProperty(document, 'startViewTransition')

    expect(startViewTransition).toHaveBeenCalled()
    expect(add).toHaveBeenCalledWith('chess-select')
    expect(add).toHaveBeenCalledWith('square-e2')
    expect(add).toHaveBeenCalledWith('chess-move')
    expect(add).toHaveBeenCalledWith('from-e2')
    expect(add).toHaveBeenCalledWith('to-e4')
    expect(add).toHaveBeenCalledWith('piece-pawn')
    expect(add).toHaveBeenCalledWith('move-trace-update')
  })

  it('skips View Transition capture on compact touch viewports', async () => {
    const startViewTransition = vi.fn()

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query.includes('max-width') || query.includes('pointer'),
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
      })),
    })

    await renderChess()
    await touchSquare('e2')
    await touchSquare('e4')

    Reflect.deleteProperty(document, 'startViewTransition')

    expect(startViewTransition).not.toHaveBeenCalled()
    expect(squareButton('e4').getAttribute('aria-label')).toBe('e4 white pawn')
  })

  it('shows a checkmate celebration banner when the game ends', async () => {
    await renderChess()

    await pressSquare('f2', ' ')
    await pressSquare('f3', 'Enter')
    await pressSquare('e7', ' ')
    await pressSquare('e5', 'Enter')
    await pressSquare('g2', ' ')
    await pressSquare('g4', 'Enter')
    await pressSquare('d8', ' ')
    await pressSquare('h4', 'Enter')

    expect(container?.textContent).toContain('Checkmate')
    expect(container?.textContent).toContain('Black wins')
    expect(container?.textContent).toContain('Finished by Qh4#')
    expect(container?.querySelector('.checkmate-celebration')).not.toBeNull()
    expect(container?.querySelectorAll('.firework-field span')).toHaveLength(18)
  })

  it('keeps the HTML chess layer available when 3D rendering is unavailable', async () => {
    await renderChess()
    await flushAsyncEffects()

    expect(container?.querySelector('.board-access-layer')).not.toBeNull()
    expect(
      container?.querySelector('.board-access-layer.is-2d-fallback'),
    ).not.toBeNull()
    expect(squareButton('e2').textContent).toContain('♙')
    expect(container?.querySelector('[role="grid"]')).not.toBeNull()
    expect(container?.textContent).toContain(
      'WebGL context could not be created; HTML chess controls remain active.',
    )
    expect(container?.querySelector('.renderer-badge strong')?.textContent).toBe(
      '3D renderer unavailable',
    )
  })
})
