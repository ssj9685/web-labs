import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  Cpu,
  GitBranch,
  History,
  Keyboard,
  Layers3,
  Move3d,
  MousePointer2,
  Orbit,
  PartyPopper,
  Volume2,
  X,
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
  createThreeChessScene,
  cameraViewLabels,
  initialThreeRenderer,
  nextCameraView,
  threeChessAssetInfo,
  webPlatformCompatibilityNotes,
  type AnimatedChessMove,
  type ChessCameraView,
  type ChessSquareProjection,
  type ChessRendererChoice,
  type ThreeChessScene,
} from './chessRenderer'
import {
  buildTransitionName,
  runViewTransition,
  transitionTypesForChessMove,
} from '../../lib/viewTransitionLab'

type MoveTraceEntry = {
  from: Square
  id: string
  piece: string
  san: string
  to: Square
}

type GameOverState = {
  san: string
  winner: 'black' | 'white'
}

type ViewTransitionStyle = CSSProperties & {
  viewTransitionName?: string
}

type SquareButtonStyle = ViewTransitionStyle & {
  clipPath?: string
}

const transitionStyle = (name: string): ViewTransitionStyle => ({
  viewTransitionName: name,
})

const pieceGlyphs: Record<string, string> = {
  B: '♗',
  K: '♔',
  N: '♘',
  P: '♙',
  Q: '♕',
  R: '♖',
  b: '♝',
  k: '♚',
  n: '♞',
  p: '♟',
  q: '♛',
  r: '♜',
}

const prefersStableMobileInteraction = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 720px), (pointer: coarse)').matches

export function ChessPlayground() {
  const [game] = useState(createAccessibleChessGame)
  const [, setVersion] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [announcement, setAnnouncement] = useState(
    'Board ready. White to move.',
  )
  const [renderer, setRenderer] =
    useState<ChessRendererChoice>(initialThreeRenderer)
  const [moveTrace, setMoveTrace] = useState<MoveTraceEntry[]>([])
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [cameraView, setCameraView] = useState<ChessCameraView>('white')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [orbitEnabled, setOrbitEnabled] = useState(false)
  const [lastAnimatedMove, setLastAnimatedMove] =
    useState<AnimatedChessMove | null>(null)
  const [squareProjection, setSquareProjection] = useState<
    Record<string, ChessSquareProjection>
  >({})
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<ThreeChessScene | null>(null)

  const board = getAriaBoard(game)
  const legalDestinations = useMemo(
    () => (selectedSquare ? getLegalDestinations(game, selectedSquare) : []),
    [game, selectedSquare],
  )
  const selectedSquareDetail = selectedSquare
    ? board.find((square) => square.square === selectedSquare)
    : null
  const isTwoDimensionalFallback = renderer.mode === 'three-error'
  const hasSquareProjection =
    !isTwoDimensionalFallback && Object.keys(squareProjection).length > 0
  const positionTitle = gameOver
    ? `${gameOver.winner[0].toUpperCase()}${gameOver.winner.slice(1)} wins`
    : describeTurn(game)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = createThreeChessScene(canvas, {
      onRendererChange: setRenderer,
      onSquareProjection: setSquareProjection,
    })
    sceneRef.current = scene

    return () => {
      scene?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.sync(
      board,
      selectedSquare,
      legalDestinations,
      lastAnimatedMove,
    )
  }, [board, lastAnimatedMove, legalDestinations, selectedSquare])

  useEffect(() => {
    sceneRef.current?.setViewMode(cameraView)
  }, [cameraView])

  useEffect(() => {
    sceneRef.current?.setOrbitEnabled(orbitEnabled)
  }, [orbitEnabled])

  useEffect(() => {
    if (!historyOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHistoryOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [historyOpen])

  const commitChessTransition = (types: string[], update: () => void) => {
    if (prefersStableMobileInteraction()) {
      update()
      return
    }

    const transition = runViewTransition(types, update)

    if (transition) void transition.finished
  }

  const focusSquareByBoardOrder = (currentSquare: Square, key: string) => {
    const delta =
      key === 'ArrowRight'
        ? 1
        : key === 'ArrowLeft'
          ? -1
          : key === 'ArrowDown'
            ? 8
            : key === 'ArrowUp'
              ? -8
              : 0

    if (!delta) return

    const currentIndex = board.findIndex((item) => item.square === currentSquare)
    const nextIndex = Math.max(0, Math.min(63, currentIndex + delta))
    const nextSquare = board[nextIndex]?.square
    const nextButton = nextSquare
      ? document.querySelector<HTMLButtonElement>(`[data-square="${nextSquare}"]`)
      : null

    nextButton?.focus()
  }

  const focusSquareByScreenDirection = (currentSquare: Square, key: string) => {
    const currentButton = document.querySelector<HTMLButtonElement>(
      `[data-square="${currentSquare}"]`,
    )
    if (!currentButton || !hasSquareProjection) {
      focusSquareByBoardOrder(currentSquare, key)
      return
    }

    const currentRect = currentButton.getBoundingClientRect()
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    }
    const currentFile = currentSquare[0]
    const currentRank = currentSquare[1]
    const horizontal = key === 'ArrowLeft' || key === 'ArrowRight'
    const forward = key === 'ArrowRight' || key === 'ArrowDown'
    const candidates = board
      .filter((item) =>
        horizontal
          ? item.square[1] === currentRank
          : item.square[0] === currentFile,
      )
      .map((item) => {
        const element = document.querySelector<HTMLButtonElement>(
          `[data-square="${item.square}"]`,
        )
        if (!element || item.square === currentSquare) return null

        const rect = element.getBoundingClientRect()
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
        const axisDelta = horizontal
          ? center.x - currentCenter.x
          : center.y - currentCenter.y

        if (forward ? axisDelta <= 0 : axisDelta >= 0) return null

        return {
          axisDistance: Math.abs(axisDelta),
          element,
          crossDistance: horizontal
            ? Math.abs(center.y - currentCenter.y)
            : Math.abs(center.x - currentCenter.x),
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        Boolean(candidate),
      )
      .sort(
        (a, b) =>
          a.axisDistance - b.axisDistance ||
          a.crossDistance - b.crossDistance,
      )

    const nextElement = candidates[0]?.element

    if (nextElement) {
      nextElement.focus()
      return
    }

    focusSquareByBoardOrder(currentSquare, key)
  }

  const activateSquare = (square: Square) => {
    if (gameOver) return

    if (selectedSquare && selectedSquare !== square) {
      const result = moveBySquares(game, selectedSquare, square)
      const transitionTypes = [
        ...(result.ok && result.from && result.to && result.pieceType
          ? transitionTypesForChessMove(result.from, result.to, result.pieceType)
          : ['chess-illegal-move', `from-${selectedSquare}`, `to-${square}`]),
        'move-trace-update',
        ...(result.checkmate ? ['chess-checkmate'] : []),
      ]
      const moveMetadata =
        result.ok && result.from && result.to && result.piece
          ? {
              checkmate: result.checkmate,
              from: result.from,
              piece: result.piece,
              san: result.san ?? `${result.from}${result.to}`,
              to: result.to,
              winner: result.winner,
            }
          : null

      commitChessTransition(transitionTypes, () => {
        setAnnouncement(result.announcement)

        if (moveMetadata) {
          setSelectedSquare(null)
          setLastAnimatedMove({
            from: moveMetadata.from,
            id: `${moveMetadata.from}-${moveMetadata.to}-${moveMetadata.san}-${moveTrace.length}`,
            to: moveMetadata.to,
          })
          if (moveMetadata.checkmate && moveMetadata.winner) {
            setGameOver({
              san: moveMetadata.san,
              winner: moveMetadata.winner,
            })
          }
          setMoveTrace((current) => [
            {
              from: moveMetadata.from,
              id: `${current.length + 1}-${moveMetadata.from}-${moveMetadata.to}`,
              piece: moveMetadata.piece,
              san: moveMetadata.san,
              to: moveMetadata.to,
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
    const isArrowKey = event.key.startsWith('Arrow')

    if (isArrowKey) {
      event.preventDefault()
      focusSquareByScreenDirection(square, event.key)
      return
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      activateSquare(square)
    }
  }

  const handleSquarePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType !== 'mouse') event.preventDefault()
  }

  const handleSquarePointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
    square: Square,
  ) => {
    if (event.pointerType !== 'pen') return

    event.preventDefault()
    activateSquare(square)
  }

  const handleSquareTouchStart = (
    event: React.TouchEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault()
  }

  const handleSquareTouchEnd = (
    event: React.TouchEvent<HTMLButtonElement>,
    square: Square,
  ) => {
    event.preventDefault()
    activateSquare(square)
  }

  return (
    <section className="chess-lab" aria-labelledby="chess-lab-title">
      <div className="chess-copy">
        <p className="eyebrow">Three.js + accessible HTML layer</p>
        <h1 id="chess-lab-title">Chess Access Lab</h1>
        <p>
          A single 3D chess board with real piece assets, selectable aura
          effects, mapped legal moves, and keyboard or screen reader controls.
        </p>
      </div>

      <div className={`chess-stage ${historyOpen ? 'is-history-open' : ''}`}>
        <div
          className={`canvas-panel ${
            isTwoDimensionalFallback ? 'is-2d-fallback' : ''
          } ${orbitEnabled ? 'is-orbiting' : ''}`}
          style={transitionStyle(buildTransitionName('canvas-board'))}
        >
          <canvas
            aria-hidden="true"
            className="chess-canvas"
            ref={canvasRef}
          />
          <div
            aria-label="Accessible chess board"
            className={`semantic-board board-access-layer ${
              hasSquareProjection ? 'is-projected' : ''
            } ${isTwoDimensionalFallback ? 'is-2d-fallback' : ''}`}
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
                onPointerDown={handleSquarePointerDown}
                onPointerUp={(event) =>
                  handleSquarePointerUp(event, square.square)
                }
                onTouchEnd={(event) =>
                  handleSquareTouchEnd(event, square.square)
                }
                onTouchStart={handleSquareTouchStart}
                role="gridcell"
                style={(() => {
                  const projection = squareProjection[square.square]
                  const selectedStyle =
                    selectedSquare === square.square
                      ? transitionStyle(
                          buildTransitionName(
                            'selected-square',
                            square.square,
                          ),
                        )
                      : undefined

                  if (!projection || isTwoDimensionalFallback) {
                    return selectedStyle
                  }

                  return {
                    ...selectedStyle,
                    clipPath: projection.clipPath,
                    height: `${projection.height}px`,
                    left: `${projection.left}px`,
                    top: `${projection.top}px`,
                    width: `${projection.width}px`,
                  } satisfies SquareButtonStyle
                })()}
                type="button"
              >
                <span>{square.square}</span>
                <strong>{square.piece ? pieceGlyphs[square.piece] : ''}</strong>
              </button>
            ))}
          </div>
          {gameOver ? (
            <div
              aria-live="assertive"
              className="checkmate-celebration"
              role="status"
              style={transitionStyle(buildTransitionName('checkmate-banner'))}
            >
              <div className="firework-field" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
              <div className="checkmate-banner">
                <PartyPopper size={22} aria-hidden="true" />
                <div>
                  <span>Checkmate</span>
                  <strong>
                    {gameOver.winner[0].toUpperCase()}
                    {gameOver.winner.slice(1)} wins
                  </strong>
                  <p>Finished by {gameOver.san}</p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="renderer-badge">
            <Cpu size={16} aria-hidden="true" />
            <div>
              <span>Renderer</span>
              <strong>{renderer.label}</strong>
            </div>
          </div>
          <button
            aria-controls="move-trace-panel"
            aria-expanded={historyOpen}
            className="history-toggle"
            onClick={() => setHistoryOpen((current) => !current)}
            type="button"
          >
            <History size={17} aria-hidden="true" />
            <span>History</span>
            {moveTrace.length ? <strong>{moveTrace.length}</strong> : null}
          </button>
          <button
            aria-label={`Switch camera view. Current: ${cameraViewLabels[cameraView]}`}
            className="view-toggle"
            onClick={() => {
              setOrbitEnabled(false)
              setCameraView((current) => nextCameraView(current))
            }}
            type="button"
          >
            <Move3d size={17} aria-hidden="true" />
            <span>View</span>
            <strong>{cameraViewLabels[cameraView].replace(' view', '')}</strong>
          </button>
          <button
            aria-pressed={orbitEnabled}
            className="orbit-toggle"
            onClick={() => setOrbitEnabled((current) => !current)}
            type="button"
          >
            <Orbit size={17} aria-hidden="true" />
            <span>Orbit</span>
          </button>
        </div>

        <div className="chess-controls">
          <div
            className="status-panel"
            style={transitionStyle(
              buildTransitionName('position', selectedSquare ?? 'ready'),
            )}
          >
            <p className="section-label">Current position</p>
            <strong>{positionTitle}</strong>
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

          <div className="move-panel" id="move-trace-panel">
            <div className="experiment-heading">
              <p className="section-label">Move trace</p>
              <button
                aria-label="Close move history"
                className="move-panel-close"
                onClick={() => setHistoryOpen(false)}
                type="button"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {moveTrace.length ? (
              <ol
                aria-label="Recorded chess moves"
                className="move-trace"
                style={transitionStyle(buildTransitionName('move-trace'))}
              >
                {moveTrace.map((move) => (
                  <li
                    key={move.id}
                    style={transitionStyle(buildTransitionName('move', move.id))}
                  >
                    <strong>{move.piece}</strong>
                    <span>
                      {move.from} -&gt; {move.to} ({move.san})
                    </span>
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
          <strong>3D when available</strong>
          <p>{renderer.reason}</p>
        </article>
        <article>
          <Keyboard size={18} aria-hidden="true" />
          <strong>HTML in the board</strong>
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
          <strong>Asset source</strong>
          <p>
            {threeChessAssetInfo.label} by {threeChessAssetInfo.author}; effect
            textures are local SVG assets.
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
