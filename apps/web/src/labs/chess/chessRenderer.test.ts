import { describe, expect, it } from 'vitest'
import {
  chessSquares,
  cameraViewLabels,
  initialThreeRenderer,
  nextCameraView,
  squareToPosition,
  threeChessAssetInfo,
  webPlatformCompatibilityNotes,
} from './chessRenderer'

describe('3D chess renderer metadata', () => {
  it('starts in an explicit 3D asset loading state', () => {
    expect(initialThreeRenderer.mode).toBe('three-loading')
    expect(initialThreeRenderer.label).toBe('3D assets loading')
    expect(initialThreeRenderer.reason).toContain('Poly Haven chess set')
  })

  it('documents the imported chess asset and local effect textures', () => {
    expect(threeChessAssetInfo.label).toBe('Poly Haven Chess Set')
    expect(threeChessAssetInfo.author).toBe('Riley Queen')
    expect(threeChessAssetInfo.assetUrl).toBe(
      'https://polyhaven.com/a/chess_set',
    )
  })

  it('documents the persistent HTML accessibility layer', () => {
    expect(webPlatformCompatibilityNotes.renderer.status).toBe('3D WebGL')
    expect(webPlatformCompatibilityNotes.accessibility.fallback).toContain(
      'HTML grid',
    )
    expect(webPlatformCompatibilityNotes.accessibility.status).toBe('baseline')
  })

  it('maps chess squares to the GLTF board coordinate order', () => {
    expect(chessSquares).toHaveLength(64)
    expect(chessSquares[0]).toBe('a8')
    expect(chessSquares[63]).toBe('h1')

    expect(squareToPosition('a1').x).toBeLessThan(squareToPosition('h1').x)
    expect(squareToPosition('a1').z).toBe(squareToPosition('h1').z)
    expect(squareToPosition('a1').z).toBeLessThan(squareToPosition('a8').z)
  })

  it('cycles through camera views with reader-facing labels', () => {
    expect(cameraViewLabels.white).toBe('White view')
    expect(cameraViewLabels.black).toBe('Black view')
    expect(cameraViewLabels.top).toBe('Top view')
    expect(nextCameraView('white')).toBe('black')
    expect(nextCameraView('black')).toBe('top')
    expect(nextCameraView('top')).toBe('white')
  })
})
