import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLDivElement
let getContextSpy: ReturnType<typeof vi.spyOn>
let root: Root

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const renderApp = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  await act(async () => {
    root.render(createElement(App))
  })
}

describe('Web Labs app shell', () => {
  beforeEach(async () => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null)
    await renderApp()
  })

  afterEach(() => {
    act(() => root.unmount())
    getContextSpy.mockRestore()
    container.remove()
  })

  it('opens on the accessible chess playground', () => {
    expect(container.querySelector('h1')?.textContent).toBe('Chess Access Lab')
    expect(container.textContent).toContain(
      'A single 3D chess board with real piece assets',
    )
    expect(container.querySelector('[role="grid"]')).not.toBeNull()
  })

  it('documents explicit 3D rendering with accessible HTML controls', () => {
    expect(container.textContent).toContain('3D when available')
    expect(container.textContent).toContain('Asset source')
    expect(container.textContent).toContain('HTML in the board')
  })
})
