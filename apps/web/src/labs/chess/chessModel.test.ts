import { describe, expect, it } from 'vitest'
import {
  createAccessibleChessGame,
  getAriaBoard,
  getLegalDestinations,
  moveBySquares,
} from './chessModel'

describe('accessible chess model', () => {
  it('exposes all 64 board squares with screen-reader labels', () => {
    const game = createAccessibleChessGame()
    const board = getAriaBoard(game)

    expect(board).toHaveLength(64)
    expect(board.find((square) => square.square === 'e2')).toMatchObject({
      ariaLabel: 'e2 white pawn',
      piece: 'P',
    })
    expect(board.find((square) => square.square === 'e4')).toMatchObject({
      ariaLabel: 'e4 empty',
      piece: null,
    })
  })

  it('reports legal destinations for keyboard selection', () => {
    const game = createAccessibleChessGame()

    expect(getLegalDestinations(game, 'e2')).toEqual(['e3', 'e4'])
  })

  it('moves a piece and returns an announcement for assistive technology', () => {
    const game = createAccessibleChessGame()
    const result = moveBySquares(game, 'e2', 'e4')

    expect(result.ok).toBe(true)
    expect(result.announcement).toBe(
      'White pawn moved from e2 to e4. Black to move.',
    )
    expect(getAriaBoard(game).find((square) => square.square === 'e4')).toMatchObject({
      ariaLabel: 'e4 white pawn',
      piece: 'P',
    })
  })

  it('rejects illegal moves without mutating the board', () => {
    const game = createAccessibleChessGame()
    const result = moveBySquares(game, 'e2', 'e5')

    expect(result.ok).toBe(false)
    expect(result.announcement).toBe('Illegal move from e2 to e5.')
    expect(getAriaBoard(game).find((square) => square.square === 'e2')).toMatchObject({
      ariaLabel: 'e2 white pawn',
      piece: 'P',
    })
  })
})
