import type { AriaSquare } from './chessModel'

export type ChessRendererMode = 'webgpu' | '2d-canvas'

export type ChessRendererChoice = {
  device?: unknown
  label: string
  mode: ChessRendererMode
  reason: string
}

type ChessGpuAdapter = {
  requestDevice: () => Promise<unknown>
}

export type ChessGpuLike = {
  requestAdapter: (options: {
    featureLevel: 'compatibility'
    powerPreference: 'high-performance'
  }) => Promise<ChessGpuAdapter | null>
}

type NavigatorWithChessGpu = Navigator & {
  gpu?: ChessGpuLike
}

type Rgb = readonly [number, number, number]

type ChessVertexGeometry = {
  pieceCount: number
  squareCount: number
  vertexData: Float32Array
}

type ChessSquarePlane = {
  bottom: number
  centerX: number
  centerY: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

export const webPlatformCompatibilityNotes = {
  accessibility: {
    fallback: 'Native DOM grid, buttons, keyboard handlers, and aria-live status',
    status: 'baseline',
  },
  webgpu: {
    fallback: '2D canvas renderer with the same DOM accessibility layer',
    status: 'limited',
  },
} as const

export const webGpuRenderFallbackChoice: ChessRendererChoice = {
  label: '2D canvas fallback',
  mode: '2d-canvas',
  reason: 'WebGPU render surface unavailable; using canvas fallback.',
}

export const getNavigatorGpu = () =>
  typeof navigator === 'undefined'
    ? undefined
    : (navigator as NavigatorWithChessGpu).gpu

export const chooseChessRenderer = async (
  gpu: ChessGpuLike | undefined = getNavigatorGpu(),
): Promise<ChessRendererChoice> => {
  if (!gpu) {
    return {
      label: '2D canvas fallback',
      mode: '2d-canvas',
      reason: 'WebGPU unavailable; using baseline canvas rendering.',
    }
  }

  try {
    const adapter = await gpu.requestAdapter({
      featureLevel: 'compatibility',
      powerPreference: 'high-performance',
    })

    if (!adapter) {
      return {
        label: '2D canvas fallback',
        mode: '2d-canvas',
        reason: 'WebGPU adapter unavailable; using canvas fallback.',
      }
    }

    return {
      device: await adapter.requestDevice(),
      label: 'WebGPU compatibility mode',
      mode: 'webgpu',
      reason: 'WebGPU compatibility adapter acquired.',
    }
  } catch {
    return {
      label: '2D canvas fallback',
      mode: '2d-canvas',
      reason: 'WebGPU initialization failed; using canvas fallback.',
    }
  }
}

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

const setupCanvas = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(720, Math.floor(rect.width || 720))
  const height = Math.max(540, Math.floor(rect.height || 540))
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)

  return { dpr, height, width }
}

const getWebGpuSquarePlane = (index: number): ChessSquarePlane => {
  const file = index % 8
  const rank = Math.floor(index / 8)
  const left = -0.82 + file * 0.205 + rank * 0.018
  const top = 0.7 - rank * 0.17 + file * 0.008
  const right = left + 0.19
  const bottom = top - 0.15

  return {
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    height: top - bottom,
    left,
    right,
    top,
    width: right - left,
  }
}

const pushVertex = (
  vertices: number[],
  x: number,
  y: number,
  color: Rgb,
) => {
  vertices.push(x, y, ...color)
}

const pushTriangle = (
  vertices: number[],
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  color: Rgb,
) => {
  pushVertex(vertices, ax, ay, color)
  pushVertex(vertices, bx, by, color)
  pushVertex(vertices, cx, cy, color)
}

const pushQuad = (
  vertices: number[],
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: Rgb,
) => {
  pushTriangle(vertices, left, top, right, top, left, bottom, color)
  pushTriangle(vertices, left, bottom, right, top, right, bottom, color)
}

const pushDiamond = (
  vertices: number[],
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: Rgb,
) => {
  pushTriangle(
    vertices,
    centerX,
    centerY + radiusY,
    centerX + radiusX,
    centerY,
    centerX,
    centerY - radiusY,
    color,
  )
  pushTriangle(
    vertices,
    centerX,
    centerY - radiusY,
    centerX - radiusX,
    centerY,
    centerX,
    centerY + radiusY,
    color,
  )
}

const pushDisc = (
  vertices: number[],
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: Rgb,
  segments = 14,
) => {
  for (let index = 0; index < segments; index += 1) {
    const current = (Math.PI * 2 * index) / segments
    const next = (Math.PI * 2 * (index + 1)) / segments

    pushTriangle(
      vertices,
      centerX,
      centerY,
      centerX + Math.cos(current) * radiusX,
      centerY + Math.sin(current) * radiusY,
      centerX + Math.cos(next) * radiusX,
      centerY + Math.sin(next) * radiusY,
      color,
    )
  }
}

const pushPieceMarker = (
  vertices: number[],
  plane: ChessSquarePlane,
  piece: string,
  selected: boolean,
) => {
  const isWhite = piece === piece.toUpperCase()
  const rim: Rgb = selected
    ? [0.39, 0.87, 0.61]
    : isWhite
      ? [0.1, 0.14, 0.11]
      : [0.83, 0.91, 0.75]
  const fill: Rgb = isWhite ? [0.95, 0.9, 0.76] : [0.05, 0.07, 0.06]
  const highlight: Rgb = isWhite ? [1, 0.97, 0.84] : [0.48, 0.62, 0.45]
  const shadow: Rgb = [0.03, 0.05, 0.04]
  const centerX = plane.centerX
  const centerY = plane.centerY + plane.height * 0.02
  const type = piece.toLowerCase()

  pushDisc(
    vertices,
    centerX + plane.width * 0.08,
    centerY - plane.height * 0.18,
    plane.width * 0.32,
    plane.height * 0.18,
    shadow,
    12,
  )
  pushDisc(
    vertices,
    centerX,
    centerY - plane.height * 0.09,
    plane.width * 0.31,
    plane.height * 0.24,
    rim,
    16,
  )
  pushDisc(
    vertices,
    centerX,
    centerY - plane.height * 0.08,
    plane.width * 0.23,
    plane.height * 0.17,
    fill,
    16,
  )
  pushQuad(
    vertices,
    centerX - plane.width * 0.14,
    centerY + plane.height * 0.16,
    centerX + plane.width * 0.14,
    centerY - plane.height * 0.08,
    fill,
  )

  if (type === 'p') {
    pushDisc(
      vertices,
      centerX,
      centerY + plane.height * 0.22,
      plane.width * 0.13,
      plane.height * 0.11,
      highlight,
      12,
    )
    return
  }

  if (type === 'r') {
    pushQuad(
      vertices,
      centerX - plane.width * 0.2,
      centerY + plane.height * 0.28,
      centerX + plane.width * 0.2,
      centerY + plane.height * 0.14,
      highlight,
    )
    pushQuad(
      vertices,
      centerX - plane.width * 0.23,
      centerY + plane.height * 0.35,
      centerX - plane.width * 0.11,
      centerY + plane.height * 0.24,
      highlight,
    )
    pushQuad(
      vertices,
      centerX + plane.width * 0.11,
      centerY + plane.height * 0.35,
      centerX + plane.width * 0.23,
      centerY + plane.height * 0.24,
      highlight,
    )
    return
  }

  if (type === 'n') {
    pushDiamond(
      vertices,
      centerX + plane.width * 0.04,
      centerY + plane.height * 0.23,
      plane.width * 0.19,
      plane.height * 0.17,
      highlight,
    )
    pushQuad(
      vertices,
      centerX - plane.width * 0.2,
      centerY + plane.height * 0.28,
      centerX + plane.width * 0.02,
      centerY + plane.height * 0.15,
      highlight,
    )
    return
  }

  if (type === 'b') {
    pushDiamond(
      vertices,
      centerX,
      centerY + plane.height * 0.24,
      plane.width * 0.16,
      plane.height * 0.2,
      highlight,
    )
    return
  }

  if (type === 'q') {
    pushDisc(
      vertices,
      centerX - plane.width * 0.16,
      centerY + plane.height * 0.27,
      plane.width * 0.07,
      plane.height * 0.07,
      highlight,
      10,
    )
    pushDisc(
      vertices,
      centerX,
      centerY + plane.height * 0.34,
      plane.width * 0.08,
      plane.height * 0.08,
      highlight,
      10,
    )
    pushDisc(
      vertices,
      centerX + plane.width * 0.16,
      centerY + plane.height * 0.27,
      plane.width * 0.07,
      plane.height * 0.07,
      highlight,
      10,
    )
    return
  }

  pushQuad(
    vertices,
    centerX - plane.width * 0.06,
    centerY + plane.height * 0.38,
    centerX + plane.width * 0.06,
    centerY + plane.height * 0.12,
    highlight,
  )
  pushQuad(
    vertices,
    centerX - plane.width * 0.18,
    centerY + plane.height * 0.28,
    centerX + plane.width * 0.18,
    centerY + plane.height * 0.2,
    highlight,
  )
}

export const buildChessVertexData = (
  board: AriaSquare[],
  selectedSquare: string | null,
): ChessVertexGeometry => {
  const vertices: number[] = []
  let pieceCount = 0

  board.forEach((square, index) => {
    const plane = getWebGpuSquarePlane(index)
    const selected = square.square === selectedSquare
    const light = square.color === 'light'
    const color: Rgb = selected
      ? [0.38, 0.83, 0.62]
      : light
        ? [0.82, 0.89, 0.78]
        : [0.27, 0.38, 0.29]

    pushQuad(vertices, plane.left, plane.top, plane.right, plane.bottom, color)

    if (square.piece) {
      pieceCount += 1
      pushPieceMarker(vertices, plane, square.piece, selected)
    }
  })

  return {
    pieceCount,
    squareCount: board.length,
    vertexData: new Float32Array(vertices),
  }
}

export const paintChessBoard2d = (
  canvas: HTMLCanvasElement,
  board: AriaSquare[],
  selectedSquare: string | null,
) => {
  const context = canvas.getContext('2d')
  if (!context) return

  const { dpr, height, width } = setupCanvas(canvas)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const boardSize = Math.min(width * 0.78, height * 0.84)
  const tile = boardSize / 8
  const originX = (width - boardSize) / 2
  const originY = (height - boardSize) / 2 + 22

  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#101715')
  gradient.addColorStop(1, '#26352e')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.fillStyle = '#0a0f0d'
  context.globalAlpha = 0.42
  context.beginPath()
  context.moveTo(originX - 24, originY + boardSize + 16)
  context.lineTo(originX + boardSize + 42, originY + boardSize - 12)
  context.lineTo(originX + boardSize + 18, originY + boardSize + 38)
  context.lineTo(originX - 42, originY + boardSize + 58)
  context.closePath()
  context.fill()
  context.globalAlpha = 1

  board.forEach((square, index) => {
    const file = index % 8
    const rank = Math.floor(index / 8)
    const x = originX + file * tile
    const y = originY + rank * tile

    context.fillStyle =
      square.square === selectedSquare
        ? '#62d49d'
        : square.color === 'light'
          ? '#d9e6d4'
          : '#5b715f'
    context.fillRect(x, y, tile, tile)

    context.strokeStyle = 'rgba(14, 20, 16, 0.18)'
    context.strokeRect(x, y, tile, tile)

    if (square.piece) {
      context.fillStyle = square.piece === square.piece.toUpperCase()
        ? '#fffaf0'
        : '#111612'
      context.font = `${Math.floor(tile * 0.62)}px Georgia, serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(pieceGlyphs[square.piece], x + tile / 2, y + tile / 2)
    }
  })

  context.fillStyle = '#ecf4ec'
  context.font = '700 15px system-ui, sans-serif'
  context.textAlign = 'left'
  context.fillText('Canvas visual; DOM board remains interactive', 24, 34)
}

export const paintChessBoardWebGpu = async (
  canvas: HTMLCanvasElement,
  board: AriaSquare[],
  selectedSquare: string | null,
  device: unknown,
) => {
  const gpu = getNavigatorGpu() as
    | (ChessGpuLike & { getPreferredCanvasFormat?: () => string })
    | undefined
  const context = canvas.getContext('webgpu')

  if (!gpu || !context || !device) return false

  const { height, width } = setupCanvas(canvas)
  const gpuDevice = device as {
    createBuffer: (descriptor: unknown) => unknown
    createCommandEncoder: () => {
      beginRenderPass: (descriptor: unknown) => {
        draw: (count: number) => void
        end: () => void
        setPipeline: (pipeline: unknown) => void
        setVertexBuffer: (slot: number, buffer: unknown) => void
      }
      finish: () => unknown
    }
    createRenderPipeline: (descriptor: unknown) => unknown
    createShaderModule: (descriptor: unknown) => unknown
    queue: {
      submit: (commands: unknown[]) => void
      writeBuffer: (
        buffer: unknown,
        offset: number,
        data: Float32Array,
      ) => void
    }
  }
  const gpuContext = context as {
    configure: (descriptor: unknown) => void
    getCurrentTexture: () => { createView: () => unknown }
  }
  const format = gpu.getPreferredCanvasFormat?.() ?? 'bgra8unorm'
  const { vertexData } = buildChessVertexData(board, selectedSquare)
  const shader = gpuDevice.createShaderModule({
    code: `
      struct VertexOut {
        @builtin(position) position: vec4f,
        @location(0) color: vec3f,
      };

      @vertex
      fn vertexMain(
        @location(0) position: vec2f,
        @location(1) color: vec3f,
      ) -> VertexOut {
        var output: VertexOut;
        output.position = vec4f(position.x, position.y, 0.0, 1.0);
        output.color = color;
        return output;
      }

      @fragment
      fn fragmentMain(input: VertexOut) -> @location(0) vec4f {
        return vec4f(input.color, 1.0);
      }
    `,
  })

  const pipeline = gpuDevice.createRenderPipeline({
    fragment: {
      entryPoint: 'fragmentMain',
      module: shader,
      targets: [{ format }],
    },
    layout: 'auto',
    primitive: { topology: 'triangle-list' },
    vertex: {
      buffers: [
        {
          arrayStride: 20,
          attributes: [
            { format: 'float32x2', offset: 0, shaderLocation: 0 },
            { format: 'float32x3', offset: 8, shaderLocation: 1 },
          ],
        },
      ],
      entryPoint: 'vertexMain',
      module: shader,
    },
  })

  gpuContext.configure({
    alphaMode: 'premultiplied',
    device: gpuDevice,
    format,
  })

  const usage =
    (globalThis as { GPUBufferUsage?: { COPY_DST: number; VERTEX: number } })
      .GPUBufferUsage
  if (!usage) return false

  const vertexBuffer = gpuDevice.createBuffer({
    size: vertexData.byteLength,
    usage: usage.VERTEX | usage.COPY_DST,
  })
  gpuDevice.queue.writeBuffer(vertexBuffer, 0, vertexData)

  const encoder = gpuDevice.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        clearValue: { a: 1, b: 0.08, g: 0.07, r: 0.05 },
        loadOp: 'clear',
        storeOp: 'store',
        view: gpuContext.getCurrentTexture().createView(),
      },
    ],
  })

  pass.setPipeline(pipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.draw(vertexData.length / 5)
  pass.end()
  gpuDevice.queue.submit([encoder.finish()])

  canvas.setAttribute('data-webgpu-size', `${width}x${height}`)

  return true
}
