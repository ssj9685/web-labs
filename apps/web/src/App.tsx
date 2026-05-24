import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowRight,
  Beaker,
  Check,
  CircleDot,
  Gauge,
  Github,
  Grid3X3,
  Pause,
  Play,
  ScanLine,
  Sparkles,
  StepForward,
} from 'lucide-react'
import {
  OPTIMIZATION_STRATEGY,
  optimizeGroupAnimations,
} from 'view-transitions-toolkit/animations'
import { pause, resume, scrub } from 'view-transitions-toolkit/playback-control'
import { setTemporaryViewTransitionNames } from 'view-transitions-toolkit/misc'
import { trackActiveViewTransition } from 'view-transitions-toolkit/track-active-view-transition'
import { labCases, labs, type LabCase } from './data/labs'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
  supportsSameDocumentTransition,
  type PlaybackState,
} from './lib/viewTransitionLab'
import './App.css'

const nextCaseId = (currentId: string) => {
  const currentIndex = labCases.findIndex((item) => item.id === currentId)
  return labCases[(currentIndex + 1) % labCases.length].id
}

const collectTemporaryNames = (caseItem: LabCase) => {
  const surface = document.querySelector<HTMLElement>('[data-transition-stage]')
  const title = document.querySelector<HTMLElement>('[data-transition-title]')

  return [
    surface
      ? ([surface, buildTransitionName('stage', caseItem.id)] as [
          HTMLElement,
          string,
        ])
      : null,
    title
      ? ([title, buildTransitionName('title', caseItem.title)] as [
          HTMLElement,
          string,
        ])
      : null,
  ].filter((entry): entry is [HTMLElement, string] => Boolean(entry))
}

function App() {
  const [selectedCaseId, setSelectedCaseId] = useState(labCases[0].id)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('running')
  const [optimizedGroups, setOptimizedGroups] = useState<string[]>([])
  const [lastTransitionMode, setLastTransitionMode] =
    useState('Same-document transition')
  const activeTransitionRef = useRef<ViewTransition | null>(null)

  const selectedCase = useMemo(
    () =>
      labCases.find((caseItem) => caseItem.id === selectedCaseId) ??
      labCases[0],
    [selectedCaseId],
  )

  const supportRows = useMemo(() => capabilityRows(), [])
  const supportedCount = supportRows.filter((row) => row.supported).length

  useEffect(() => {
    trackActiveViewTransition('same-document')
  }, [])

  const applyPlaybackPreference = async (
    transition: ViewTransition,
    preference: PlaybackState,
  ) => {
    await transition.ready
    const groups = optimizeGroupAnimations(
      transition,
      '*',
      OPTIMIZATION_STRATEGY.SCALE,
    )
    setOptimizedGroups(groups)

    if (preference === 'paused') {
      pause(transition)
      setPlaybackState('paused')
      return
    }

    if (preference === 'scrubbed') {
      scrub(transition, 0.5)
      setPlaybackState('scrubbed')
      return
    }

    resume(transition)
    setPlaybackState('running')
  }

  const selectCase = (
    nextId: string,
    playbackPreference: PlaybackState = 'running',
  ) => {
    const nextCase = labCases.find((caseItem) => caseItem.id === nextId)
    if (!nextCase) return

    if (!supportsSameDocumentTransition()) {
      setSelectedCaseId(nextId)
      setLastTransitionMode('Fallback state update')
      return
    }

    activeTransitionRef.current?.skipTransition()

    let finishTemporaryNames = () => {}
    const finishedProxy = new Promise<void>((resolve) => {
      finishTemporaryNames = resolve
    })
    void setTemporaryViewTransitionNames(
      collectTemporaryNames(nextCase),
      finishedProxy,
    )

    const transition = document.startViewTransition(() => {
      flushSync(() => setSelectedCaseId(nextId))
    })

    activeTransitionRef.current = transition
    setLastTransitionMode(`Toolkit transition: ${nextCase.title}`)

    void applyPlaybackPreference(transition, playbackPreference).catch(() => {
      setOptimizedGroups([])
      setPlaybackState('running')
    })

    void transition.finished.finally(() => {
      finishTemporaryNames()
      if (activeTransitionRef.current === transition) {
        activeTransitionRef.current = null
      }
    })
  }

  const resumeActiveTransition = () => {
    const transition =
      activeTransitionRef.current ??
      (
        document as Document & {
          activeViewTransition?: ViewTransition | null
        }
      ).activeViewTransition

    if (!transition) {
      selectCase(nextCaseId(selectedCaseId), 'running')
      return
    }

    resume(transition)
    setPlaybackState('running')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Web Labs home">
          <span className="brand-mark">
            <Beaker size={18} aria-hidden="true" />
          </span>
          <span>Web Labs</span>
        </a>
        <nav aria-label="Lab navigation">
          {labs.map((lab) => (
            <a key={lab.slug} href={lab.href}>
              {lab.title}
            </a>
          ))}
        </nav>
        <a
          className="icon-link"
          href="https://github.com/ssj9685/web-labs"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
        >
          <Github size={18} aria-hidden="true" />
        </a>
      </header>

      <section className="hero-section" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Browser experiments as usable product surfaces</p>
          <h1 id="hero-title">Web Labs</h1>
          <p>
            A live playground for modern web platform features, starting with a
            View Transitions Toolkit lab that behaves like a real app workflow.
          </p>
          <div className="hero-actions">
            <a href="#view-transitions-toolkit" className="primary-action">
              Open live lab
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a
              href="https://github.com/googlechromelabs/view-transitions-toolkit"
              target="_blank"
              rel="noreferrer"
              className="secondary-action"
            >
              Reference toolkit
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-toolbar">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="visual-grid">
            <div className="visual-large"></div>
            <div className="visual-stack">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="visual-strip"></div>
          </div>
        </div>
      </section>

      <section
        className="lab-shell"
        id="view-transitions-toolkit"
        aria-labelledby="lab-title"
      >
        <aside className="lab-rail" aria-label="Lab catalog">
          <div>
            <p className="section-label">Labs</p>
            <h2>Experiment catalog</h2>
          </div>
          <div className="lab-list">
            {labs.map((lab) => (
              <a
                href={lab.href}
                key={lab.slug}
                className={`lab-item ${lab.status === 'live' ? 'is-live' : ''}`}
              >
                <span>{lab.accent}</span>
                <strong>{lab.title}</strong>
                <small>{lab.metric}</small>
              </a>
            ))}
          </div>
        </aside>

        <div className="lab-workspace">
          <div className="lab-heading">
            <div>
              <p className="section-label">{labs[0].kicker}</p>
              <h2 id="lab-title">{labs[0].title}</h2>
              <p>{labs[0].subtitle}</p>
            </div>
            <div className="support-score" aria-label="Supported features">
              <strong>
                {supportedCount}/{supportRows.length}
              </strong>
              <span>supported here</span>
            </div>
          </div>

          <div className="feature-grid" aria-label="Toolkit support matrix">
            {supportRows.map((row) => (
              <div className="feature-row" key={row.label}>
                <span className={row.supported ? 'is-supported' : ''}>
                  {row.supported ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <CircleDot size={14} aria-hidden="true" />
                  )}
                </span>
                <p>{row.label}</p>
              </div>
            ))}
          </div>

          <div className="transition-console">
            <section className="case-grid" aria-label="Transition cases">
              {labCases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  type="button"
                  className={`case-card ${caseItem.id === selectedCase.id ? 'is-selected' : ''}`}
                  onClick={() => selectCase(caseItem.id)}
                  data-case-id={caseItem.id}
                >
                  <span className={`case-swatch tone-${caseItem.tone}`}></span>
                  <span>
                    <strong>{caseItem.title}</strong>
                    <small>{caseItem.category}</small>
                  </span>
                </button>
              ))}
            </section>

            <section
              className={`case-stage tone-${selectedCase.tone}`}
              aria-label={`${selectedCase.title} detail`}
              data-transition-stage
            >
              <div className="case-stage-header">
                <div>
                  <p>{selectedCase.category}</p>
                  <h3 data-transition-title>{selectedCase.title}</h3>
                </div>
                <span>{selectedCase.owner}</span>
              </div>

              <div className="stage-visual">
                <div className="orbital">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="metric-stack">
                  <strong>{selectedCase.metric}</strong>
                  <span>{selectedCase.signal}</span>
                </div>
              </div>

              <p className="case-summary">{selectedCase.summary}</p>

              <div className="playback-panel">
                <div>
                  <p className="section-label">Playback</p>
                  <strong>{describePlaybackState(playbackState)}</strong>
                  <span>{lastTransitionMode}</span>
                </div>
                <div className="playback-actions">
                  <button
                    type="button"
                    onClick={() => selectCase(nextCaseId(selectedCaseId))}
                    aria-label="Run next transition"
                    title="Run next transition"
                  >
                    <StepForward size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectCase(nextCaseId(selectedCaseId), 'scrubbed')
                    }
                    aria-label="Hold next transition at 50 percent"
                    title="Hold at 50%"
                  >
                    <Pause size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={resumeActiveTransition}
                    aria-label="Resume active transition"
                    title="Resume"
                  >
                    <Play size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="toolkit-strip" aria-label="Toolkit modules used">
            <div>
              <Grid3X3 size={17} aria-hidden="true" />
              <span>Temporary names</span>
            </div>
            <div>
              <Gauge size={17} aria-hidden="true" />
              <span>Playback control</span>
            </div>
            <div>
              <ScanLine size={17} aria-hidden="true" />
              <span>
                Optimized groups:{' '}
                {optimizedGroups.length ? optimizedGroups.join(', ') : 'ready'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="roadmap" aria-labelledby="roadmap-title">
        <div>
          <p className="section-label">Monorepo direction</p>
          <h2 id="roadmap-title">Built for more labs</h2>
        </div>
        <div className="roadmap-list">
          {labs.slice(1).map((lab) => (
            <article key={lab.slug}>
              <Sparkles size={18} aria-hidden="true" />
              <h3>{lab.title}</h3>
              <p>{lab.subtitle}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
