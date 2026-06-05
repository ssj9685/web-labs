import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChessPlayground } from './ChessPlayground'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLDivElement
let getContextSpy: ReturnType<typeof vi.spyOn>
let root: Root

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const renderChess = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(createElement(ChessPlayground))
  })
}

const squareButton = (square: string) => {
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

describe('ChessPlayground accessibility', () => {
  beforeEach(async () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)
    await renderChess()
  })

  afterEach(() => {
    act(() => root.unmount())
    getContextSpy.mockRestore()
    container.remove()
  })

  it('renders a canvas visual board with a semantic board for assistive tech', () => {
    expect(container.querySelector('canvas')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    expect(
      container
        .querySelector('[role="grid"]')
        ?.getAttribute('aria-label'),
    ).toBe('Accessible chess board')
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(64)
    expect(squareButton('e2').getAttribute('aria-label')).toBe('e2 white pawn')
  })

  it('moves a piece with keyboard commands and announces the result', async () => {
    await pressSquare('e2', ' ')
    expect(squareButton('e2').getAttribute('aria-selected')).toBe('true')

    await pressSquare('e4', 'Enter')

    expect(squareButton('e4').getAttribute('aria-label')).toBe('e4 white pawn')
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'White pawn moved from e2 to e4. Black to move.',
    )
  })

  it('shows the active rendering path and fallback baseline note', () => {
    expect(container.textContent).toContain('Renderer')
    expect(container.textContent).toContain('2D canvas fallback')
    expect(container.textContent).toContain(
      'WebGPU is used when available; the same accessible DOM board remains active.',
    )
  })
})
