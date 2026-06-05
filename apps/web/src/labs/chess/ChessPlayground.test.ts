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

  it('shows the active rendering path and fallback baseline note', async () => {
    await renderChess()

    expect(container?.textContent).toContain('Renderer')
    expect(container?.textContent).toContain('2D canvas fallback')
    expect(container?.textContent).toContain(
      'WebGPU is used when available; the same accessible DOM board remains active.',
    )
  })

  it('combines the chess board with an experiment stack and move trace', async () => {
    await renderChess()

    expect(container?.textContent).toContain('Experiment stack')
    expect(container?.textContent).toContain('View transitions')
    expect(container?.textContent).toContain('Move trace')
    expect(container?.textContent).toContain('No moves yet')

    await pressSquare('e2', ' ')
    await pressSquare('e4', 'Enter')

    expect(container?.textContent).toContain('white pawn')
    expect(container?.textContent).toContain('e2 -> e4')
    expect(container?.textContent).toContain('chess-move')
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
  })

  it('reports the canvas fallback when WebGPU painting cannot acquire a render surface', async () => {
    const requestDevice = vi.fn().mockResolvedValue({})
    const requestAdapter = vi.fn().mockResolvedValue({ requestDevice })

    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: { requestAdapter },
    })

    await renderChess()
    await flushAsyncEffects()

    expect(requestAdapter).toHaveBeenCalledWith({
      featureLevel: 'compatibility',
      powerPreference: 'high-performance',
    })
    expect(container?.querySelector('.renderer-badge strong')?.textContent).toBe(
      '2D canvas fallback',
    )
    expect(container?.textContent).toContain(
      'WebGPU render surface unavailable; using canvas fallback.',
    )
  })
})
