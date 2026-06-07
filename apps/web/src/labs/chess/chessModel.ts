import { Chess, type Square } from 'chess.js'

export type AccessibleChessGame = Chess

export type AriaSquare = {
  ariaLabel: string
  color: 'light' | 'dark'
  piece: string | null
  square: Square
}

export type MoveResult = {
  announcement: string
  color?: 'black' | 'white'
  from?: Square
  gameOver?: boolean
  checkmate?: boolean
  ok: boolean
  piece?: string
  pieceType?: string
  san?: string
  to?: Square
  winner?: 'black' | 'white'
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

const pieceNames = {
  b: 'bishop',
  k: 'king',
  n: 'knight',
  p: 'pawn',
  q: 'queen',
  r: 'rook',
} as const

const colorNames = {
  b: 'black',
  w: 'white',
} as const

export const createAccessibleChessGame = () => new Chess()

const toSquare = (file: string, rank: string) => `${file}${rank}` as Square

const pieceSymbol = (piece: ReturnType<Chess['get']>) => {
  if (!piece) return null

  return piece.color === 'w' ? piece.type.toUpperCase() : piece.type
}

const describePiece = (piece: ReturnType<Chess['get']>) => {
  if (!piece) return 'empty'

  return `${colorNames[piece.color]} ${pieceNames[piece.type]}`
}

export const getAriaBoard = (game: AccessibleChessGame): AriaSquare[] =>
  ranks.flatMap((rank, rankIndex) =>
    files.map((file, fileIndex) => {
      const square = toSquare(file, rank)
      const piece = game.get(square)

      return {
        ariaLabel: `${square} ${describePiece(piece)}`,
        color: (rankIndex + fileIndex) % 2 === 0 ? 'light' : 'dark',
        piece: pieceSymbol(piece),
        square,
      }
    }),
  )

export const getLegalDestinations = (
  game: AccessibleChessGame,
  square: Square,
) =>
  game
    .moves({ square, verbose: true })
    .map((move) => move.to)
    .sort()

export const moveBySquares = (
  game: AccessibleChessGame,
  from: Square,
  to: Square,
): MoveResult => {
  try {
    const move = game.move({ from, promotion: 'q', to })
    const piece = `${colorNames[move.color]} ${pieceNames[move.piece]}`
    const nextTurn = game.turn() === 'w' ? 'White' : 'Black'
    const winner = colorNames[move.color]
    const checkmate = game.isCheckmate()
    const gameOver = game.isGameOver()

    return {
      announcement: checkmate
        ? `Checkmate. ${winner[0].toUpperCase()}${winner.slice(
            1,
          )} wins with ${move.san}.`
        : `${piece[0].toUpperCase()}${piece.slice(
            1,
          )} moved from ${from} to ${to}. ${nextTurn} to move.`,
      checkmate,
      color: colorNames[move.color],
      from: move.from,
      gameOver,
      ok: true,
      piece,
      pieceType: pieceNames[move.piece],
      san: move.san,
      to: move.to,
      winner: checkmate ? winner : undefined,
    }
  } catch {
    return {
      announcement: `Illegal move from ${from} to ${to}.`,
      ok: false,
    }
  }
}

export const describeTurn = (game: AccessibleChessGame) =>
  game.turn() === 'w' ? 'White to move' : 'Black to move'
