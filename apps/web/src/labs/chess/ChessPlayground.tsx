import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Cpu,
  GitBranch,
  History,
  Keyboard,
  Layers3,
  MousePointer2,
  Volume2,
} from 'lucide-react'
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
  webGpuRenderFallbackChoice,
  webPlatformCompatibilityNotes,
  type ChessRendererChoice,
} from './chessRenderer'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
  formatProgress,
  runViewTransition,
  transitionTypesForChessMove,
  type PlaybackState,
} from '../../lib/viewTransitionLab'

const initialRenderer: ChessRendererChoice = {
  label: '2D canvas fallback',
  mode: '2d-canvas',
  reason: 'Renderer detection pending; 2D canvas is ready.',
}

type MoveTraceEntry = {
  from: Square
  id: string
  piece: string
  san: string
  to: Square
  transitionTypes: string[]
}

type ViewTransitionStyle = CSSProperties & {
  viewTransitionName?: string
}

const squareFocusDelta = (key: string) => {
  if (key === 'ArrowRight') return 1
  if (key === 'ArrowLeft') return -1
  if (key === 'ArrowDown') return 8
  if (key === 'ArrowUp') return -8
  return 0
}

const transitionStyle = (name: string): ViewTransitionStyle => ({
  viewTransitionName: name,
})

export function ChessPlayground() {
  const [game] = useState(createAccessibleChessGame)
  const [, setVersion] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [announcement, setAnnouncement] = useState(
    'Board ready. White to move.',
  )
  const [renderer, setRenderer] =
    useState<ChessRendererChoice>(initialRenderer)
  const [moveTrace, setMoveTrace] = useState<MoveTraceEntry[]>([])
  const [transitionState, setTransitionState] =
    useState<PlaybackState>('paused')
  const [lastTransitionTypes, setLastTransitionTypes] = useState<string[]>([
    'idle',
  ])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const board = getAriaBoard(game)
  const legalDestinations = selectedSquare
    ? getLegalDestinations(game, selectedSquare)
    : []
  const selectedSquareDetail = selectedSquare
    ? board.find((square) => square.square === selectedSquare)
    : null
  const supportRows = capabilityRows()
  const transitionProgress =
    lastTransitionTypes[0] === 'idle'
      ? 0
      : transitionState === 'scrubbed'
        ? 0.5
        : transitionState === 'running'
          ? 0.72
          : 1
  const experimentRows = [
    {
      detail: renderer.reason,
      label: 'Canvas renderer',
      value: renderer.label,
    },
    {
      detail: 'DOM grid mirrors every canvas square for assistive technology.',
      label: 'HTML accessibility',
      value: `${board.length} grid cells`,
    },
    {
      detail: lastTransitionTypes.join(', '),
      label: 'View transitions',
      value: describePlaybackState(transitionState),
    },
  ]

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

        setRenderer(webGpuRenderFallbackChoice)
      }

      paintChessBoard2d(canvas, board, selectedSquare)
    }

    void paint()

    return () => {
      cancelled = true
    }
  }, [board, renderer, selectedSquare])

  const commitChessTransition = (types: string[], update: () => void) => {
    setLastTransitionTypes(types)
    setTransitionState('running')

    const transition = runViewTransition(types, update)

    if (!transition) {
      setTransitionState('paused')
      return
    }

    void transition.finished.finally(() => {
      setTransitionState('paused')
    })
  }

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
      const transitionTypes =
        result.ok && result.from && result.to && result.pieceType
          ? transitionTypesForChessMove(result.from, result.to, result.pieceType)
          : ['chess-illegal-move', `from-${selectedSquare}`, `to-${square}`]
      const moveMetadata =
        result.ok && result.from && result.to && result.piece
          ? {
              from: result.from,
              piece: result.piece,
              san: result.san ?? `${result.from}${result.to}`,
              to: result.to,
            }
          : null

      commitChessTransition(transitionTypes, () => {
        setAnnouncement(result.announcement)

        if (moveMetadata) {
          setSelectedSquare(null)
          setMoveTrace((current) => [
            {
              from: moveMetadata.from,
              id: `${current.length + 1}-${moveMetadata.from}-${moveMetadata.to}`,
              piece: moveMetadata.piece,
              san: moveMetadata.san,
              to: moveMetadata.to,
              transitionTypes,
            },
            ...current,
          ].slice(0, 6))
          setVersion((current) => current + 1)
        }
      })
      return
    }

    if (selectedSquare === square) {
      commitChessTransition(['chess-clear', `square-${square}`], () => {
        setSelectedSquare(null)
        setAnnouncement(`${square} cleared. ${describeTurn(game)}.`)
      })
      return
    }

    const destinations = getLegalDestinations(game, square)
    if (!destinations.length) {
      commitChessTransition(['chess-inspect', `square-${square}`], () => {
        setAnnouncement(`${square} has no legal moves. ${describeTurn(game)}.`)
      })
      return
    }

    commitChessTransition(['chess-select', `square-${square}`], () => {
      setSelectedSquare(square)
      setAnnouncement(
        `${square} selected. Legal moves: ${destinations.join(', ')}.`,
      )
    })
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
        <div
          className="canvas-panel"
          style={transitionStyle(buildTransitionName('canvas-board'))}
        >
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
          <div
            className="status-panel"
            style={transitionStyle(
              buildTransitionName('position', selectedSquare ?? 'ready'),
            )}
          >
            <p className="section-label">Current position</p>
            <strong>{describeTurn(game)}</strong>
            <p role="status" aria-live="polite">
              {announcement}
            </p>
            {selectedSquareDetail ? (
              <p className="selected-square-note">
                {selectedSquareDetail.ariaLabel}; legal moves:{' '}
                {legalDestinations.join(', ')}
              </p>
            ) : null}
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
                style={
                  selectedSquare === square.square
                    ? transitionStyle(
                        buildTransitionName('selected-square', square.square),
                      )
                    : undefined
                }
                type="button"
              >
                <span>{square.square}</span>
                <strong>{square.piece ?? ''}</strong>
              </button>
            ))}
          </div>

          <div
            aria-label="Integrated web experiments"
            className="experiment-panel"
          >
            <div className="experiment-heading">
              <p className="section-label">Experiment stack</p>
              <strong>{formatProgress(transitionProgress)}</strong>
            </div>

            <div className="experiment-list">
              {experimentRows.map((experiment) => (
                <article key={experiment.label}>
                  <span>{experiment.label}</span>
                  <strong>{experiment.value}</strong>
                  <p>{experiment.detail}</p>
                </article>
              ))}
            </div>

            <div className="support-grid" aria-label="View Transition support">
              {supportRows.map((row) => (
                <span
                  className={row.supported ? 'is-supported' : 'is-fallback'}
                  key={row.label}
                >
                  {row.label}: {row.supported ? 'available' : 'fallback'}
                </span>
              ))}
            </div>
          </div>

          <div className="move-panel">
            <div className="experiment-heading">
              <p className="section-label">Move trace</p>
              <History size={16} aria-hidden="true" />
            </div>

            {moveTrace.length ? (
              <ol aria-label="Recorded chess moves" className="move-trace">
                {moveTrace.map((move) => (
                  <li key={move.id}>
                    <strong>{move.piece}</strong>
                    <span>
                      {move.from} -&gt; {move.to} ({move.san})
                    </span>
                    <code>{move.transitionTypes.join(', ')}</code>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-trace">No moves yet</p>
            )}
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
          <GitBranch size={18} aria-hidden="true" />
          <strong>View Transition flow</strong>
          <p>
            Selection, moves, and trace updates share typed transition names.
          </p>
        </article>
        <article>
          <Volume2 size={18} aria-hidden="true" />
          <strong>2D canvas fallback</strong>
          <p>
            WebGPU is used when available; the same accessible DOM board remains
            active.
          </p>
        </article>
        <article>
          <MousePointer2 size={18} aria-hidden="true" />
          <strong>Pointer and keyboard parity</strong>
          <p>Click or press Space/Enter on the same DOM-backed squares.</p>
        </article>
      </div>
    </section>
  )
}
