import { supports as toolkitSupports } from 'view-transitions-toolkit/feature-detection'

export const viewTransitionCapabilities = [
  ['sameDocument', 'Same-document transitions'],
  ['types', 'Transition type routing'],
  ['crossDocument', 'Cross-document transitions'],
  ['elementScoped', 'Element-scoped transitions'],
  ['activeViewTransition', 'Active transition tracking'],
] as const

export type PlaybackState = 'running' | 'paused' | 'scrubbed'
export type SupportKey = (typeof viewTransitionCapabilities)[number][0]
export type SupportMap = Record<SupportKey, boolean>

const namePartPattern = /[^a-z0-9]+/g

export const buildTransitionName = (...parts: string[]) =>
  `lab-${parts
    .join('-')
    .toLowerCase()
    .replace(namePartPattern, '-')
    .replace(/^-+|-+$/g, '')}`

export const capabilityRows = (
  supportMap: SupportMap = toolkitSupports as SupportMap,
) =>
  viewTransitionCapabilities.map(([key, label]) => ({
    label,
    supported: Boolean(supportMap[key]),
  }))

export const describePlaybackState = (state: PlaybackState) => {
  if (state === 'paused') return 'Transition is paused'
  if (state === 'scrubbed') return 'Transition held at 50%'
  return 'Transition is playing'
}

export const transitionTypesForChessMove = (
  fromSquare: string,
  toSquare: string,
  pieceType: string,
) => ['chess-move', `from-${fromSquare}`, `to-${toSquare}`, `piece-${pieceType}`]

export const formatProgress = (progress: number) => {
  const boundedProgress = Math.max(0, Math.min(1, progress))

  return `${Math.round(boundedProgress * 100)}%`
}

export const supportsSameDocumentTransition = () =>
  typeof document !== 'undefined' && 'startViewTransition' in document

export const runViewTransition = (
  types: string[],
  update: () => void,
): ViewTransition | null => {
  if (!supportsSameDocumentTransition()) {
    update()

    return null
  }

  const transition = document.startViewTransition(update)

  types.forEach((type) => transition.types?.add(type))

  return transition
}
