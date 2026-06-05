import { useEffect, useRef, useState } from 'react'
import { Cpu, Keyboard, Layers3, Volume2 } from 'lucide-react'
import type { Square } from 'chess.js'
import {
  createAccessibleChessGame,
  describeTurn,
  getAriaBoard,
  getLegalDestinations,
  moveBySquares,
} from './chessModel'
import {
  chooseChessRenderer,
  paintChessBoard2d,
  paintChessBoardWebGpu,
  webPlatformCompatibilityNotes,
  type ChessRendererChoice,
} from './chessRenderer'

const initialRenderer: ChessRendererChoice = {
  label: '2D canvas fallback',
  mode: '2d-canvas',
  reason: 'Renderer detection pending; 2D canvas is ready.',
}

const squareFocusDelta = (key: string) => {
  if (key === 'ArrowRight') return 1
  if (key === 'ArrowLeft') return -1
  if (key === 'ArrowDown') return 8
  if (key === 'ArrowUp') return -8
  return 0
}

export function ChessPlayground() {
  const [game] = useState(createAccessibleChessGame)
  const [, setVersion] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [announcement, setAnnouncement] = useState(
    'Board ready. White to move.',
  )
  const [renderer, setRenderer] =
    useState<ChessRendererChoice>(initialRenderer)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const board = getAriaBoard(game)
  const legalDestinations = selectedSquare
    ? getLegalDestinations(game, selectedSquare)
    : []

  useEffect(() => {
    let cancelled = false

    void chooseChessRenderer().then((choice) => {
      if (!cancelled) setRenderer(choice)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    const paint = async () => {
      if (renderer.mode === 'webgpu') {
        const painted = await paintChessBoardWebGpu(
          canvas,
          board,
          selectedSquare,
          renderer.device,
        )
        if (painted || cancelled) return
      }

      paintChessBoard2d(canvas, board, selectedSquare)
    }

    void paint()

    return () => {
      cancelled = true
    }
  }, [board, renderer, selectedSquare])

  const focusSquareByDelta = (currentSquare: Square, delta: number) => {
    const currentIndex = board.findIndex((item) => item.square === currentSquare)
    const nextIndex = Math.max(0, Math.min(63, currentIndex + delta))
    const nextSquare = board[nextIndex]?.square
    const nextButton = nextSquare
      ? document.querySelector<HTMLButtonElement>(`[data-square="${nextSquare}"]`)
      : null

    nextButton?.focus()
  }

  const activateSquare = (square: Square) => {
    if (selectedSquare && selectedSquare !== square) {
      const result = moveBySquares(game, selectedSquare, square)
      setAnnouncement(result.announcement)

      if (result.ok) {
        setSelectedSquare(null)
        setVersion((current) => current + 1)
      }
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      setAnnouncement(`${square} cleared. ${describeTurn(game)}.`)
      return
    }

    const destinations = getLegalDestinations(game, square)
    if (!destinations.length) {
      setAnnouncement(`${square} has no legal moves. ${describeTurn(game)}.`)
      return
    }

    setSelectedSquare(square)
    setAnnouncement(
      `${square} selected. Legal moves: ${destinations.join(', ')}.`,
    )
  }

  const handleSquareKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    square: Square,
  ) => {
    const delta = squareFocusDelta(event.key)

    if (delta) {
      event.preventDefault()
      focusSquareByDelta(square, delta)
      return
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      activateSquare(square)
    }
  }

  return (
    <section className="chess-lab" aria-labelledby="chess-lab-title">
      <div className="chess-copy">
        <p className="eyebrow">WebGPU + accessibility</p>
        <h1 id="chess-lab-title">Chess Access Lab</h1>
        <p>
          Canvas-rendered chess with a live HTML accessibility layer. Play by
          pointer, keyboard, or screen reader without depending on GPU support.
        </p>
      </div>

      <div className="chess-stage">
        <div className="canvas-panel">
          <canvas
            aria-hidden="true"
            className="chess-canvas"
            ref={canvasRef}
          />
          <div className="renderer-badge">
            <Cpu size={16} aria-hidden="true" />
            <div>
              <span>Renderer</span>
              <strong>{renderer.label}</strong>
            </div>
          </div>
        </div>

        <div className="chess-controls">
          <div className="status-panel">
            <p className="section-label">Current position</p>
            <strong>{describeTurn(game)}</strong>
            <p role="status" aria-live="polite">
              {announcement}
            </p>
          </div>

          <div
            aria-label="Accessible chess board"
            className="semantic-board"
            role="grid"
          >
            {board.map((square) => (
              <button
                aria-label={square.ariaLabel}
                aria-selected={selectedSquare === square.square}
                className={`semantic-square ${square.color} ${
                  legalDestinations.includes(square.square) ? 'is-legal' : ''
                }`}
                data-square={square.square}
                key={square.square}
                onClick={() => activateSquare(square.square)}
                onKeyDown={(event) =>
                  handleSquareKeyDown(event, square.square)
                }
                role="gridcell"
                type="button"
              >
                <span>{square.square}</span>
                <strong>{square.piece ?? ''}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="capability-strip" aria-label="Chess lab capabilities">
        <article>
          <Layers3 size={18} aria-hidden="true" />
          <strong>WebGPU first</strong>
          <p>{renderer.reason}</p>
        </article>
        <article>
          <Keyboard size={18} aria-hidden="true" />
          <strong>Keyboard and screen reader ready</strong>
          <p>{webPlatformCompatibilityNotes.accessibility.fallback}.</p>
        </article>
        <article>
          <Volume2 size={18} aria-hidden="true" />
          <strong>2D canvas fallback</strong>
          <p>
            WebGPU is used when available; the same accessible DOM board remains
            active.
          </p>
        </article>
      </div>
    </section>
  )
}
