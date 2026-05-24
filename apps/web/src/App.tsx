import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  Gauge,
  Github,
  GitBranch,
  ListFilter,
  Pause,
  Play,
  Radio,
  ScanLine,
  Search,
  ShieldCheck,
  StepForward,
  TimerReset,
  Zap,
} from 'lucide-react'
import {
  extractGeometry,
  getAnimations,
  OPTIMIZATION_STRATEGY,
  optimizeGroupAnimations,
  ViewTransitionPart,
} from 'view-transitions-toolkit/animations'
import { pause, resume, scrub } from 'view-transitions-toolkit/playback-control'
import { setTemporaryViewTransitionNames } from 'view-transitions-toolkit/misc'
import { trackActiveViewTransition } from 'view-transitions-toolkit/track-active-view-transition'
import {
  incidentTimeline,
  primaryWorkspace,
  toolkitMoments,
  type Incident,
} from './data/incidents'
import {
  buildTransitionName,
  capabilityRows,
  describePlaybackState,
  formatProgress,
  supportsSameDocumentTransition,
  transitionTypesForIncident,
  type PlaybackState,
} from './lib/viewTransitionLab'
import './App.css'

type TransitionPreference = {
  state: PlaybackState
  progress?: number
}

type TransitionDiagnostic = {
  animationCount: number
  geometry: string
  groupCount: number
  optimizedGroups: string[]
  source: string
  types: string[]
}

const initialDiagnostic: TransitionDiagnostic = {
  animationCount: 0,
  geometry: 'Waiting for first incident switch',
  groupCount: 0,
  optimizedGroups: [],
  source: 'Idle',
  types: [],
}

const nextIncidentId = (currentId: string) => {
  const currentIndex = incidentTimeline.findIndex(
    (incident) => incident.id === currentId,
  )

  return incidentTimeline[(currentIndex + 1) % incidentTimeline.length].id
}

const collectTemporaryNames = (incident: Incident) => {
  const stage = document.querySelector<HTMLElement>('[data-transition-stage]')
  const title = document.querySelector<HTMLElement>('[data-transition-title]')
  const map = document.querySelector<HTMLElement>('[data-transition-map]')
  const inspector = document.querySelector<HTMLElement>(
    '[data-transition-inspector]',
  )

  return [
    stage
      ? ([stage, buildTransitionName('incident-stage', incident.id)] as [
          HTMLElement,
          string,
        ])
      : null,
    title
      ? ([title, buildTransitionName('incident-title', incident.title)] as [
          HTMLElement,
          string,
        ])
      : null,
    map
      ? ([map, buildTransitionName('service-map', incident.service)] as [
          HTMLElement,
          string,
        ])
      : null,
    inspector
      ? ([inspector, buildTransitionName('transition-inspector')] as [
          HTMLElement,
          string,
        ])
      : null,
  ].filter((entry): entry is [HTMLElement, string] => Boolean(entry))
}

const describeStatus = (status: Incident['status']) => {
  if (status === 'investigating') return 'Investigating'
  if (status === 'mitigating') return 'Mitigating'
  return 'Monitoring'
}

const addTransitionTypes = (transition: ViewTransition, types: string[]) => {
  const typedTransition = transition as ViewTransition & {
    types?: { add: (type: string) => void }
  }

  types.forEach((type) => typedTransition.types?.add(type))
}

function App() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    incidentTimeline[0].id,
  )
  const [playbackState, setPlaybackState] =
    useState<PlaybackState>('running')
  const [scrubProgress, setScrubProgress] = useState(0.5)
  const [lastTransitionMode, setLastTransitionMode] = useState(
    'Waiting for incident switch',
  )
  const [diagnostic, setDiagnostic] =
    useState<TransitionDiagnostic>(initialDiagnostic)
  const activeTransitionRef = useRef<ViewTransition | null>(null)

  const selectedIncident = useMemo(
    () =>
      incidentTimeline.find((incident) => incident.id === selectedIncidentId) ??
      incidentTimeline[0],
    [selectedIncidentId],
  )

  const supportRows = useMemo(() => capabilityRows(), [])
  const supportedCount = supportRows.filter((row) => row.supported).length
  const nextId = nextIncidentId(selectedIncidentId)

  useEffect(() => {
    trackActiveViewTransition('same-document')
  }, [])

  const inspectTransition = async (
    transition: ViewTransition,
    incident: Incident,
    preference: TransitionPreference,
    types: string[],
  ) => {
    await transition.ready

    let animationCount = 0
    let groupCount = 0
    let geometry = 'Geometry unavailable'
    let optimizedGroups: string[]

    try {
      const animations = getAnimations(transition)
      const groupAnimations = getAnimations(
        transition,
        '*',
        ViewTransitionPart.Group,
      )
      animationCount = animations.length
      groupCount = groupAnimations.length

      if (groupAnimations[0]) {
        const bounds = extractGeometry(groupAnimations[0])
        geometry = `${Math.round(bounds.before.width)}x${Math.round(
          bounds.before.height,
        )} -> ${Math.round(bounds.after.width)}x${Math.round(
          bounds.after.height,
        )}`
      }

      optimizedGroups = optimizeGroupAnimations(
        transition,
        '*',
        OPTIMIZATION_STRATEGY.SCALE,
      )
    } catch {
      optimizedGroups = []
    }

    setDiagnostic({
      animationCount,
      geometry,
      groupCount,
      optimizedGroups,
      source: incident.title,
      types,
    })

    if (preference.state === 'paused') {
      pause(transition)
      setPlaybackState('paused')
      return
    }

    if (preference.state === 'scrubbed') {
      scrub(transition, preference.progress ?? scrubProgress)
      setPlaybackState('scrubbed')
      return
    }

    resume(transition)
    setPlaybackState('running')
  }

  const selectIncident = (
    nextIncidentIdValue: string,
    preference: TransitionPreference = { state: 'running' },
  ) => {
    const nextIncident = incidentTimeline.find(
      (incident) => incident.id === nextIncidentIdValue,
    )
    if (!nextIncident) return

    if (!supportsSameDocumentTransition()) {
      setSelectedIncidentId(nextIncidentIdValue)
      setLastTransitionMode('Fallback state update')
      setDiagnostic({
        animationCount: 0,
        geometry: 'View Transition API unavailable',
        groupCount: 0,
        optimizedGroups: [],
        source: nextIncident.title,
        types: [],
      })
      return
    }

    activeTransitionRef.current?.skipTransition()

    let finishTemporaryNames = () => {}
    const temporaryNameWindow = new Promise<void>((resolve) => {
      finishTemporaryNames = resolve
    })
    void setTemporaryViewTransitionNames(
      collectTemporaryNames(nextIncident),
      temporaryNameWindow,
    )

    const types = transitionTypesForIncident(
      selectedIncidentId,
      nextIncidentIdValue,
      nextIncident.severity,
    )

    const transition = document.startViewTransition(() => {
      flushSync(() => setSelectedIncidentId(nextIncidentIdValue))
    })

    activeTransitionRef.current = transition
    addTransitionTypes(transition, types)
    setLastTransitionMode(`Incident switch: ${nextIncident.service}`)

    void inspectTransition(transition, nextIncident, preference, types).catch(
      () => {
        setDiagnostic({
          animationCount: 0,
          geometry: 'Transition inspection failed',
          groupCount: 0,
          optimizedGroups: [],
          source: nextIncident.title,
          types,
        })
        setPlaybackState('running')
      },
    )

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
      selectIncident(nextId)
      return
    }

    resume(transition)
    setPlaybackState('running')
  }

  const holdNextTransition = () => {
    const progress = 0.5
    setScrubProgress(progress)
    selectIncident(nextId, { state: 'scrubbed', progress })
  }

  const handleScrubChange = (progress: number) => {
    setScrubProgress(progress)

    const transition =
      activeTransitionRef.current ??
      (
        document as Document & {
          activeViewTransition?: ViewTransition | null
        }
      ).activeViewTransition

    if (transition) {
      scrub(transition, progress)
      setPlaybackState('scrubbed')
      return
    }

    selectIncident(nextId, { state: 'scrubbed', progress })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Web Labs home">
          <span className="brand-mark">
            <Activity size={18} aria-hidden="true" />
          </span>
          <span>Web Labs</span>
        </a>
        <nav aria-label="Workspace navigation">
          <a href="#incidents">Incidents</a>
          <a href="#toolkit">Toolkit flow</a>
          <a href="#diagnostics">Inspector</a>
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

      <section className="command-hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Live workspace</p>
          <h1 id="hero-title">{primaryWorkspace.title}</h1>
          <p>{primaryWorkspace.subtitle}</p>
        </div>

        <div className="hero-status" aria-label="Workspace status">
          <div>
            <span className="status-dot"></span>
            <strong>Production checkout</strong>
            <small>{describeStatus(selectedIncident.status)}</small>
          </div>
          <div>
            <strong>
              {supportedCount}/{supportRows.length}
            </strong>
            <small>browser capabilities</small>
          </div>
          <div>
            <strong>{selectedIncident.signal}</strong>
            <small>{selectedIncident.impact}</small>
          </div>
        </div>
      </section>

      <section
        className="incident-workspace"
        id="incidents"
        aria-label="Incident command workspace"
      >
        <aside className="timeline-panel" aria-label="Incident timeline">
          <div className="panel-heading">
            <div>
              <p className="section-label">Timeline</p>
              <h2>Active incidents</h2>
            </div>
            <button type="button" aria-label="Filter incidents" title="Filter">
              <ListFilter size={17} aria-hidden="true" />
            </button>
          </div>

          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <span>Search services</span>
          </label>

          <div className="incident-list">
            {incidentTimeline.map((incident) => (
              <button
                type="button"
                key={incident.id}
                className={`incident-row severity-${incident.severity} ${
                  incident.id === selectedIncident.id ? 'is-selected' : ''
                }`}
                onClick={() => selectIncident(incident.id)}
                data-incident-row={incident.id}
              >
                <span className="incident-time">{incident.time}</span>
                <span className="incident-pulse"></span>
                <span className="incident-copy">
                  <strong>{incident.title}</strong>
                  <small>{incident.service}</small>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <section
          className={`incident-detail severity-${selectedIncident.severity}`}
          aria-label={`${selectedIncident.title} detail`}
          data-transition-stage
        >
          <div className="detail-header">
            <div>
              <p className="section-label">{selectedIncident.service}</p>
              <h2 data-transition-title>{selectedIncident.title}</h2>
              <p>{selectedIncident.summary}</p>
            </div>
            <span className="severity-badge">
              <AlertTriangle size={16} aria-hidden="true" />
              {selectedIncident.severity}
            </span>
          </div>

          <div className="metric-grid" aria-label="Incident metrics">
            {selectedIncident.metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <span>{metric.trend}</span>
              </div>
            ))}
          </div>

          <div className="service-map" data-transition-map>
            <div className="map-node node-app">
              <span>App</span>
              <strong>Storefront</strong>
            </div>
            <div className="map-link"></div>
            <div className="map-node node-service">
              <span>Service</span>
              <strong>{selectedIncident.service}</strong>
            </div>
            <div className="map-link is-hot"></div>
            <div className="map-node node-region">
              <span>Region</span>
              <strong>{selectedIncident.region}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <section aria-labelledby="logs-title">
              <div className="subheading">
                <Radio size={16} aria-hidden="true" />
                <h3 id="logs-title">Live trace</h3>
              </div>
              <div className="log-list">
                {selectedIncident.logs.map((log) => (
                  <div className={`log-line level-${log.level}`} key={log.time}>
                    <time>{log.time}</time>
                    <span>{log.level}</span>
                    <p>{log.message}</p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="actions-title">
              <div className="subheading">
                <ShieldCheck size={16} aria-hidden="true" />
                <h3 id="actions-title">Response actions</h3>
              </div>
              <div className="action-list">
                {selectedIncident.actions.map((action) => (
                  <div className={`action-item state-${action.state}`} key={action.label}>
                    <span>
                      {action.state === 'done' ? (
                        <Check size={14} aria-hidden="true" />
                      ) : (
                        <CircleDot size={14} aria-hidden="true" />
                      )}
                    </span>
                    <strong>{action.label}</strong>
                    <small>{action.state}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside
          className="inspector-panel"
          id="diagnostics"
          aria-label="Transition inspector"
          data-transition-inspector
        >
          <div className="panel-heading">
            <div>
              <p className="section-label">Inspector</p>
              <h2>Motion runtime</h2>
            </div>
            <Command size={18} aria-hidden="true" />
          </div>

          <div className="playback-panel">
            <div>
              <p>{describePlaybackState(playbackState)}</p>
              <strong>{lastTransitionMode}</strong>
            </div>
            <div className="playback-actions">
              <button
                type="button"
                onClick={() => selectIncident(nextId)}
                aria-label="Run next incident transition"
                title="Next"
              >
                <StepForward size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={holdNextTransition}
                aria-label="Hold next transition at 50 percent"
                title="Hold"
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

          <label className="scrub-control">
            <span>
              <TimerReset size={15} aria-hidden="true" />
              Timeline scrub
            </span>
            <strong>{formatProgress(scrubProgress)}</strong>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={scrubProgress}
              onChange={(event) =>
                handleScrubChange(Number(event.currentTarget.value))
              }
              aria-label="Scrub the active transition"
            />
          </label>

          <div className="diagnostic-grid" aria-label="Transition diagnostics">
            <div>
              <Gauge size={16} aria-hidden="true" />
              <span>{diagnostic.animationCount}</span>
              <small>animations</small>
            </div>
            <div>
              <GitBranch size={16} aria-hidden="true" />
              <span>{diagnostic.groupCount}</span>
              <small>groups</small>
            </div>
            <div>
              <ScanLine size={16} aria-hidden="true" />
              <span>{diagnostic.geometry}</span>
              <small>geometry</small>
            </div>
          </div>

          <div className="optimized-readout">
            <small>Optimized groups</small>
            <strong>
              {diagnostic.optimizedGroups.length
                ? diagnostic.optimizedGroups.join(', ')
                : 'ready'}
            </strong>
          </div>

          <div className="support-list" aria-label="Browser support matrix">
            {supportRows.map((row) => (
              <div className="support-row" key={row.label}>
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

          <div className="type-stack" aria-label="Transition types">
            {diagnostic.types.length ? (
              diagnostic.types.map((type) => <span key={type}>{type}</span>)
            ) : (
              <span>types pending</span>
            )}
          </div>
        </aside>
      </section>

      <section className="toolkit-flow" id="toolkit" aria-labelledby="toolkit-title">
        <div className="toolkit-heading">
          <p className="section-label">Toolkit flow</p>
          <h2 id="toolkit-title">One product path, not separate demos</h2>
          <p>
            The original demo folders are represented as operator moments inside
            the same incident workflow.
          </p>
        </div>

        <div className="moment-rail">
          {toolkitMoments.map((moment, index) => (
            <article key={moment.demoFolder} className="moment-item">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{moment.label}</strong>
                <p>{moment.productMoment}</p>
                <small>{moment.demoFolder}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="system-strip" aria-label="Current incident suspects">
          <div>
            <Zap size={17} aria-hidden="true" />
            <span>{diagnostic.source}</span>
          </div>
          {selectedIncident.suspects.map((suspect) => (
            <div key={suspect.label}>
              <Bell size={17} aria-hidden="true" />
              <span>
                {suspect.label} / {suspect.confidence}
              </span>
            </div>
          ))}
          <div>
            <Clock3 size={17} aria-hidden="true" />
            <span>{selectedIncident.duration}</span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
