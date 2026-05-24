import { supports as toolkitSupports } from 'view-transitions-toolkit/feature-detection'
import { viewTransitionCapabilities } from '../data/labs'

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

export const supportsSameDocumentTransition = () =>
  typeof document !== 'undefined' && 'startViewTransition' in document
