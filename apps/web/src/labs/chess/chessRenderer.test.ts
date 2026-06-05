import { describe, expect, it, vi } from 'vitest'
import {
  buildChessVertexData,
  chooseChessRenderer,
  webPlatformCompatibilityNotes,
} from './chessRenderer'
import { createAccessibleChessGame, getAriaBoard } from './chessModel'

describe('chess renderer selection', () => {
  it('falls back to 2D canvas when WebGPU is unavailable', async () => {
    const renderer = await chooseChessRenderer(undefined)

    expect(renderer.mode).toBe('2d-canvas')
    expect(renderer.label).toBe('2D canvas fallback')
    expect(renderer.reason).toContain('WebGPU unavailable')
  })

  it('requests a WebGPU compatibility adapter before using GPU rendering', async () => {
    const requestDevice = vi.fn().mockResolvedValue({ queue: {} })
    const requestAdapter = vi.fn().mockResolvedValue({ requestDevice })

    const renderer = await chooseChessRenderer({ requestAdapter })

    expect(requestAdapter).toHaveBeenCalledWith({
      featureLevel: 'compatibility',
      powerPreference: 'high-performance',
    })
    expect(requestDevice).toHaveBeenCalled()
    expect(renderer.mode).toBe('webgpu')
    expect(renderer.label).toBe('WebGPU compatibility mode')
  })

  it('documents baseline and fallback strategy for the demo', () => {
    expect(webPlatformCompatibilityNotes.webgpu.status).toBe('limited')
    expect(webPlatformCompatibilityNotes.webgpu.fallback).toBe(
      '2D canvas renderer with the same DOM accessibility layer',
    )
    expect(webPlatformCompatibilityNotes.accessibility.status).toBe('baseline')
  })

  it('builds WebGPU geometry for board squares and visible piece markers', () => {
    const board = getAriaBoard(createAccessibleChessGame())
    const geometry = buildChessVertexData(board, null)

    expect(geometry.squareCount).toBe(64)
    expect(geometry.pieceCount).toBe(32)
    expect(geometry.vertexData.length).toBeGreaterThan(64 * 6 * 5)
  })
})
