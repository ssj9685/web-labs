import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

let container: HTMLDivElement
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

const clickByText = async (text: string) => {
  const element = Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.includes(text),
  )

  if (!element) throw new Error(`Missing button: ${text}`)

  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('simplified product demo', () => {
  beforeEach(async () => {
    await renderApp()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('presents a clear checkout incident review instead of a lab dashboard', () => {
    expect(container.querySelector('h1')?.textContent).toBe(
      'Checkout Incident Review',
    )
    expect(container.textContent).toContain(
      'Review the payment latency alert, inspect the evidence, and apply the rollback.',
    )
  })

  it('removes decorative or non-working dashboard controls', () => {
    expect(container.textContent).not.toContain('Search services')
    expect(container.textContent).not.toContain('Filter incidents')
    expect(container.textContent).not.toContain('Browser support matrix')
    expect(container.textContent).not.toContain('Toolkit flow')
    expect(container.textContent).not.toContain('animations')
    expect(container.textContent).not.toContain('geometry')
  })

  it('opens an incident into a focused review state', async () => {
    expect(container.textContent).toContain('Open incident')
    expect(container.textContent).not.toContain('Apply rollback')

    await clickByText('Open incident')

    expect(container.textContent).toContain('Focused review')
    expect(container.textContent).toContain('Payment authorization latency')
    expect(container.textContent).toContain('Rollback plan')
    expect(container.textContent).toContain('Apply rollback')
  })

  it('applies the rollback and shows a resolved product state', async () => {
    await clickByText('Open incident')
    await clickByText('Apply rollback')

    expect(container.textContent).toContain('Rollback applied')
    expect(container.textContent).toContain('p95 latency returned below target')
    expect(container.textContent).toContain('Resolved')
  })
})
