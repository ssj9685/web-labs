import {
  AdditiveBlending,
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AriaSquare } from './chessModel'

export type ChessRendererMode = 'three-loading' | 'three-webgl' | 'three-error'

export type ChessRendererChoice = {
  label: string
  mode: ChessRendererMode
  reason: string
}

export type ChessCameraView = 'black' | 'top' | 'white'

export type AnimatedChessMove = {
  from: string
  id: string
  to: string
}

export type ThreeChessScene = {
  dispose: () => void
  setOrbitEnabled: (enabled: boolean) => void
  setViewMode: (viewMode: ChessCameraView) => void
  sync: (
    board: AriaSquare[],
    selectedSquare: string | null,
    legalDestinations: string[],
    animatedMove?: AnimatedChessMove | null,
  ) => void
}

export type ChessSquareProjection = {
  clipPath: string
  height: number
  left: number
  top: number
  width: number
}

type ChessSceneCallbacks = {
  onRendererChange: (renderer: ChessRendererChoice) => void
  onSquareProjection?: (projection: Record<string, ChessSquareProjection>) => void
}

type PieceKey =
  | 'bishop_black'
  | 'bishop_white'
  | 'king_black'
  | 'king_white'
  | 'knight_black'
  | 'knight_white'
  | 'pawn_black'
  | 'pawn_white'
  | 'queen_black'
  | 'queen_white'
  | 'rook_black'
  | 'rook_white'

const chessSetUrl = '/assets/chess-set/chess_set_1k.gltf'
const selectionAuraUrl = '/assets/chess-effects/selection-aura.svg'
const legalMoveUrl = '/assets/chess-effects/legal-move.svg'
const squareStep = 0.05788816
const boardEdge = squareStep * 7
const pieceY = 0.017392655834555626

export const threeChessAssetInfo = {
  assetUrl: 'https://polyhaven.com/a/chess_set',
  author: 'Riley Queen',
  label: 'Poly Haven Chess Set',
  license: 'CC0 / Poly Haven public asset',
} as const

export const webPlatformCompatibilityNotes = {
  accessibility: {
    fallback:
      'Native HTML grid, buttons, keyboard handlers, and aria-live status layered over 3D or shown as a visible 2D board',
    status: 'baseline',
  },
  renderer: {
    fallback:
      'The same chess rules and HTML board remain visible and playable if WebGL asset rendering is unavailable',
    status: '3D WebGL',
  },
} as const

export const initialThreeRenderer: ChessRendererChoice = {
  label: '3D assets loading',
  mode: 'three-loading',
  reason: 'Loading the Poly Haven chess set and interaction effect assets.',
}

const pieceTypeNames: Record<string, string> = {
  b: 'bishop',
  k: 'king',
  n: 'knight',
  p: 'pawn',
  q: 'queen',
  r: 'rook',
}

export const squareToPosition = (square: string) => {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1

  return new Vector3(
    -boardEdge / 2 + file * squareStep,
    pieceY,
    -boardEdge / 2 + rank * squareStep,
  )
}

export const chessSquares = ['8', '7', '6', '5', '4', '3', '2', '1'].flatMap(
  (rank) =>
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => `${file}${rank}`),
)

const pieceKeyFor = (piece: string): PieceKey => {
  const color = piece === piece.toUpperCase() ? 'white' : 'black'
  const type = pieceTypeNames[piece.toLowerCase()]

  return `${type}_${color}` as PieceKey
}

const resizeRenderer = (
  canvas: HTMLCanvasElement,
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
) => {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(320, Math.floor(rect.width || 720))
  const height = Math.max(320, Math.floor(rect.height || 620))
  const narrowViewport = width / height < 0.78

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height, false)
  camera.aspect = width / height

  canvas.setAttribute('data-three-size', `${width}x${height}`)

  return { height, narrowViewport, width }
}

export const cameraViewLabels: Record<ChessCameraView, string> = {
  black: 'Black view',
  top: 'Top view',
  white: 'White view',
}

export const nextCameraView = (viewMode: ChessCameraView): ChessCameraView => {
  if (viewMode === 'white') return 'black'
  if (viewMode === 'black') return 'top'
  return 'white'
}

const cameraTargetFor = (
  viewMode: ChessCameraView,
  narrowViewport: boolean,
) => {
  const sideZ = narrowViewport ? 8.6 : 6.8
  const sideY = narrowViewport ? 5.9 : 5.1
  const sideX = narrowViewport ? 0.12 : 0.2

  if (viewMode === 'black') {
    return {
      fov: narrowViewport ? 60 : 38,
      position: new Vector3(-sideX, sideY, -sideZ),
    }
  }

  if (viewMode === 'top') {
    return {
      fov: narrowViewport ? 58 : 42,
      position: new Vector3(0, narrowViewport ? 8.8 : 7.6, 0.08),
    }
  }

  return {
    fov: narrowViewport ? 60 : 38,
    position: new Vector3(sideX, sideY, sideZ),
  }
}

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

const projectBoardPoint = (
  boardRoot: Group,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  x: number,
  z: number,
) => {
  const projected = boardRoot
    .localToWorld(new Vector3(x, pieceY + 0.002, z))
    .project(camera)

  return {
    x: ((projected.x + 1) / 2) * width,
    y: ((-projected.y + 1) / 2) * height,
  }
}

const buildSquareProjection = (
  boardRoot: Group,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) => {
  const projection: Record<string, ChessSquareProjection> = {}

  boardRoot.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)

  chessSquares.forEach((square) => {
    const center = squareToPosition(square)
    const halfStep = squareStep / 2
    const corners = [
      projectBoardPoint(
        boardRoot,
        camera,
        width,
        height,
        center.x - halfStep,
        center.z - halfStep,
      ),
      projectBoardPoint(
        boardRoot,
        camera,
        width,
        height,
        center.x + halfStep,
        center.z - halfStep,
      ),
      projectBoardPoint(
        boardRoot,
        camera,
        width,
        height,
        center.x + halfStep,
        center.z + halfStep,
      ),
      projectBoardPoint(
        boardRoot,
        camera,
        width,
        height,
        center.x - halfStep,
        center.z + halfStep,
      ),
    ]
    const minX = Math.min(...corners.map((corner) => corner.x))
    const maxX = Math.max(...corners.map((corner) => corner.x))
    const minY = Math.min(...corners.map((corner) => corner.y))
    const maxY = Math.max(...corners.map((corner) => corner.y))
    const boxWidth = Math.max(1, maxX - minX)
    const boxHeight = Math.max(1, maxY - minY)
    const polygon = corners
      .map(
        (corner) =>
          `${((corner.x - minX) / boxWidth) * 100}% ${
            ((corner.y - minY) / boxHeight) * 100
          }%`,
      )
      .join(', ')

    projection[square] = {
      clipPath: `polygon(${polygon})`,
      height: boxHeight,
      left: minX,
      top: minY,
      width: boxWidth,
    }
  })

  return projection
}

const findPrototypePieces = (asset: Object3D) => {
  const pieces = new Map<PieceKey, Object3D>()

  asset.traverse((object) => {
    const name = object.name.toLowerCase()
    if (!name.startsWith('piece_')) return

    for (const type of Object.values(pieceTypeNames)) {
      if (!name.includes(type)) continue

      const color = name.includes('white') ? 'white' : 'black'
      const key = `${type}_${color}` as PieceKey

      if (!pieces.has(key)) {
        const clone = object.clone(true)
        clone.position.set(0, 0, 0)
        pieces.set(key, clone)
      }
    }
  })

  return pieces
}

const buildEffectPlane = (url: string, size: number, opacity: number) => {
  const texture = new TextureLoader().load(url)
  texture.colorSpace = SRGBColorSpace

  const material = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: new Color('#b9ff8b'),
    depthWrite: false,
    map: texture,
    opacity,
    transparent: true,
  })
  const plane = new Mesh(new PlaneGeometry(size, size), material)

  plane.rotation.x = -Math.PI / 2
  plane.position.y = pieceY + 0.002
  plane.visible = false

  return plane
}

export const createThreeChessScene = (
  canvas: HTMLCanvasElement,
  callbacks: ChessSceneCallbacks,
): ThreeChessScene | null => {
  let renderer: WebGLRenderer

  try {
    renderer = new WebGLRenderer({
      alpha: false,
      antialias: true,
      canvas,
      powerPreference: 'high-performance',
    })
  } catch {
    callbacks.onRendererChange({
      label: '3D renderer unavailable',
      mode: 'three-error',
      reason: 'WebGL context could not be created; HTML chess controls remain active.',
    })
    return null
  }

  renderer.outputColorSpace = SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  const scene = new Scene()
  scene.background = new Color('#101512')
  const camera = new PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0.25, 4.8, 6.2)
  camera.lookAt(0, 0, 0)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enableZoom = true
  controls.enabled = false
  controls.maxDistance = 9.6
  controls.maxPolarAngle = Math.PI * 0.43
  controls.minDistance = 5.4
  controls.minPolarAngle = Math.PI * 0.18
  controls.target.set(0, 0, 0)

  const ambient = new AmbientLight('#d7f7cf', 1.45)
  const keyLight = new DirectionalLight('#fff8df', 4.2)
  const rimLight = new DirectionalLight('#85ffbd', 1.7)
  const boardRoot = new Group()
  const piecesGroup = new Group()
  const effectsGroup = new Group()
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const selectionAura = buildEffectPlane(selectionAuraUrl, 0.106, 0.9)
  const legalMoveMarker = buildEffectPlane(legalMoveUrl, 0.067, 0.72)
  const legalMarkers = Array.from({ length: 32 }, () => legalMoveMarker.clone())
  const prototypes = new Map<PieceKey, Object3D>()
  const cameraLookAt = new Vector3(0, 0, 0)
  let currentBoard: AriaSquare[] = []
  let currentSelectedSquare: string | null = null
  let currentLegalDestinations: string[] = []
  let currentViewMode: ChessCameraView = 'white'
  let orbitEnabled = false
  let activePieceAnimation:
    | {
        duration: number
        from: Vector3
        object: Object3D
        start: number
        to: Vector3
      }
    | null = null
  let animationFrame = 0
  let disposed = false
  let lastAnimatedMoveId: string | null = null
  let lastProjectionKey = ''
  let loaded = false

  boardRoot.scale.setScalar(11.8)
  boardRoot.rotation.y = Math.PI
  keyLight.position.set(3.3, 5.4, 4.8)
  keyLight.castShadow = true
  rimLight.position.set(-4.4, 3.2, -3.6)
  boardRoot.add(piecesGroup, effectsGroup)
  scene.add(ambient, keyLight, rimLight, boardRoot)
  effectsGroup.add(selectionAura, ...legalMarkers)

  const syncEffects = (elapsed: number) => {
    if (currentSelectedSquare) {
      const position = squareToPosition(currentSelectedSquare)
      const pulse = 1 + Math.sin(elapsed * 0.006) * 0.11
      selectionAura.position.x = position.x
      selectionAura.position.z = position.z
      selectionAura.scale.setScalar(pulse)
      selectionAura.visible = true
    } else {
      selectionAura.visible = false
    }

    legalMarkers.forEach((marker, index) => {
      const square = currentLegalDestinations[index]
      if (!square) {
        marker.visible = false
        return
      }

      const position = squareToPosition(square)
      const pulse = 1 + Math.sin(elapsed * 0.005 + index * 0.32) * 0.08
      marker.position.x = position.x
      marker.position.z = position.z
      marker.scale.setScalar(pulse)
      marker.visible = true
    })
  }

  const syncPieces = (animatedMove?: AnimatedChessMove | null) => {
    piecesGroup.clear()
    activePieceAnimation = null

    currentBoard.forEach((square) => {
      if (!square.piece) return

      const prototype = prototypes.get(pieceKeyFor(square.piece))
      if (!prototype) return

      const piece = prototype.clone(true)
      const position = squareToPosition(square.square)
      const shouldAnimate =
        animatedMove &&
        animatedMove.id !== lastAnimatedMoveId &&
        animatedMove.to === square.square
      const startPosition = shouldAnimate
        ? squareToPosition(animatedMove.from)
        : position

      piece.position.copy(startPosition)
      piece.scale.setScalar(1)
      piece.traverse((object) => {
        if (object instanceof Mesh) {
          object.castShadow = true
          object.receiveShadow = true
        }
      })
      piecesGroup.add(piece)

      if (shouldAnimate) {
        activePieceAnimation = {
          duration: 420,
          from: startPosition,
          object: piece,
          start: performance.now(),
          to: position,
        }
        lastAnimatedMoveId = animatedMove.id
      }
    })
  }

  const syncPieceAnimation = (timestamp: number) => {
    if (!activePieceAnimation) return

    const progress = Math.min(
      1,
      (timestamp - activePieceAnimation.start) / activePieceAnimation.duration,
    )
    const eased = easeOutCubic(progress)
    const lift = Math.sin(progress * Math.PI) * 0.045

    activePieceAnimation.object.position.lerpVectors(
      activePieceAnimation.from,
      activePieceAnimation.to,
      eased,
    )
    activePieceAnimation.object.position.y = activePieceAnimation.to.y + lift

    if (progress >= 1) {
      activePieceAnimation.object.position.copy(activePieceAnimation.to)
      activePieceAnimation = null
    }
  }

  const render = (timestamp: number) => {
    if (disposed) return

    const size = resizeRenderer(canvas, renderer, camera)
    if (orbitEnabled) {
      controls.update()
    } else {
      const target = cameraTargetFor(currentViewMode, size.narrowViewport)
      camera.position.lerp(target.position, 0.08)
      camera.fov += (target.fov - camera.fov) * 0.12
      controls.target.copy(cameraLookAt)
      camera.lookAt(cameraLookAt)
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)

    const projectionKey = [
      size.width,
      size.height,
      currentViewMode,
      camera.position.x.toFixed(3),
      camera.position.y.toFixed(3),
      camera.position.z.toFixed(3),
      camera.fov.toFixed(2),
    ].join(':')

    if (projectionKey !== lastProjectionKey) {
      lastProjectionKey = projectionKey
      callbacks.onSquareProjection?.(
        buildSquareProjection(boardRoot, camera, size.width, size.height),
      )
    }
    syncEffects(timestamp)
    syncPieceAnimation(timestamp)
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }

  const loader = new GLTFLoader()
  loader.load(
    chessSetUrl,
    (gltf) => {
      if (disposed) return

      const asset = gltf.scene

      asset.traverse((object) => {
        if (object instanceof Mesh) {
          object.castShadow = true
          object.receiveShadow = true
          if (object.material && 'envMapIntensity' in object.material) {
            object.material.envMapIntensity = 0.72
          }
        }
      })

      const foundPieces = findPrototypePieces(asset)
      foundPieces.forEach((piece, key) => prototypes.set(key, piece))

      const board = asset.getObjectByName('board')
      if (board) boardRoot.add(board.clone(true))

      loaded = true
      syncPieces()
      callbacks.onRendererChange({
        label: 'Three.js 3D assets',
        mode: 'three-webgl',
        reason: `${threeChessAssetInfo.label} loaded with effect textures and an HTML accessibility layer.`,
      })
    },
    undefined,
    () => {
      if (disposed) return

      callbacks.onRendererChange({
        label: '3D asset load failed',
        mode: 'three-error',
        reason:
          'The GLTF chess asset could not be loaded; HTML chess controls remain active.',
      })
    },
  )

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
  })

  animationFrame = requestAnimationFrame(render)

  return {
    dispose: () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        materials.forEach((material) => material.dispose())
      })
      controls.dispose()
      renderer.dispose()
    },
    setOrbitEnabled: (enabled) => {
      orbitEnabled = enabled
      controls.enabled = enabled
      controls.target.copy(cameraLookAt)
      controls.update()
    },
    setViewMode: (viewMode) => {
      currentViewMode = viewMode
    },
    sync: (board, selectedSquare, legalDestinations, animatedMove) => {
      currentBoard = board
      currentSelectedSquare = selectedSquare
      currentLegalDestinations = legalDestinations
      if (loaded) syncPieces(animatedMove)
    },
  }
}
