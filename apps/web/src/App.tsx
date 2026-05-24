import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Github,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { setTemporaryViewTransitionNames } from 'view-transitions-toolkit/misc'
import { trackActiveViewTransition } from 'view-transitions-toolkit/track-active-view-transition'
import {
  checkoutReview,
  reviewMotionMoments,
  type ReviewIncident,
  type ReviewStage,
} from './data/incidents'
import {
  buildTransitionName,
  supportsSameDocumentTransition,
} from './lib/viewTransitionLab'
import './App.css'

const collectTemporaryNames = (incident: ReviewIncident, stage: ReviewStage) => {
  const alert = document.querySelector<HTMLElement>('[data-transition-alert]')
  const title = document.querySelector<HTMLElement>('[data-transition-title]')
  const evidence = document.querySelector<HTMLElement>(
    '[data-transition-evidence]',
  )
  const result = document.querySelector<HTMLElement>('[data-transition-result]')

  return [
    alert
      ? ([alert, buildTransitionName('checkout-alert', incident.id)] as [
          HTMLElement,
          string,
        ])
      : null,
    title
      ? ([title, buildTransitionName('checkout-title', incident.id)] as [
          HTMLElement,
          string,
        ])
      : null,
    evidence
      ? ([evidence, buildTransitionName('checkout-evidence', incident.id)] as [
          HTMLElement,
          string,
        ])
      : null,
    result
      ? ([result, buildTransitionName('checkout-result', stage)] as [
          HTMLElement,
          string,
        ])
      : null,
  ].filter((entry): entry is [HTMLElement, string] => Boolean(entry))
}

function App() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    checkoutReview.incidents[0].id,
  )
  const [stage, setStage] = useState<ReviewStage>('alert')
  const activeTransitionRef = useRef<ViewTransition | null>(null)

  const selectedIncident = useMemo(
    () =>
      checkoutReview.incidents.find(
        (incident) => incident.id === selectedIncidentId,
      ) ?? checkoutReview.incidents[0],
    [selectedIncidentId],
  )

  useEffect(() => {
    trackActiveViewTransition('same-document')
  }, [])

  const updateReview = (
    nextStage: ReviewStage,
    nextIncidentId = selectedIncidentId,
  ) => {
    const nextIncident =
      checkoutReview.incidents.find(
        (incident) => incident.id === nextIncidentId,
      ) ?? selectedIncident

    if (!supportsSameDocumentTransition()) {
      setSelectedIncidentId(nextIncident.id)
      setStage(nextStage)
      return
    }

    activeTransitionRef.current?.skipTransition()

    let finishTemporaryNames = () => {}
    const temporaryNameWindow = new Promise<void>((resolve) => {
      finishTemporaryNames = resolve
    })
    void setTemporaryViewTransitionNames(
      collectTemporaryNames(nextIncident, nextStage),
      temporaryNameWindow,
    )

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setSelectedIncidentId(nextIncident.id)
        setStage(nextStage)
      })
    })

    activeTransitionRef.current = transition

    void transition.finished.finally(() => {
      finishTemporaryNames()
      if (activeTransitionRef.current === transition) {
        activeTransitionRef.current = null
      }
    })
  }

  const isResolved = stage === 'resolved'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Web Labs home">
          <span className="brand-mark">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <span>Web Labs</span>
        </a>
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

      <section className="review-shell" id="top">
        <div className="review-copy">
          <p className="eyebrow">Product demo</p>
          <h1>{checkoutReview.title}</h1>
          <p>{checkoutReview.subtitle}</p>
        </div>

        <div className="review-board">
          <aside className="alert-list" aria-label="Checkout alerts">
            <div className="panel-heading">
              <p className="section-label">Active alert</p>
              <strong>Payment path</strong>
            </div>

            {checkoutReview.incidents.map((incident) => (
              <button
                className={`alert-item ${
                  incident.id === selectedIncident.id ? 'is-selected' : ''
                }`}
                data-transition-alert={
                  incident.id === selectedIncident.id ? true : undefined
                }
                key={incident.id}
                onClick={() => updateReview('review', incident.id)}
                type="button"
              >
                <span>{incident.time}</span>
                <div>
                  <strong>{incident.title}</strong>
                  <small>{incident.service}</small>
                </div>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
          </aside>

          <section className={`review-stage stage-${stage}`}>
            <div className="incident-header">
              <div>
                <p className="section-label">
                  {stage === 'alert' && 'New alert'}
                  {stage === 'review' && 'Focused review'}
                  {stage === 'resolved' && 'Resolved'}
                </p>
                <h2 data-transition-title>{selectedIncident.title}</h2>
                <p>{selectedIncident.summary}</p>
              </div>
              <span className={`severity severity-${selectedIncident.severity}`}>
                <AlertTriangle size={15} aria-hidden="true" />
                {selectedIncident.severity}
              </span>
            </div>

            <div className="impact-strip">
              <div>
                <small>Impact</small>
                <strong>{selectedIncident.impact}</strong>
              </div>
              {selectedIncident.metrics.map((metric) => (
                <div key={metric.label}>
                  <small>{metric.label}</small>
                  <strong>{isResolved ? metric.after : metric.before}</strong>
                </div>
              ))}
            </div>

            <div className="evidence-panel" data-transition-evidence>
              <div className="panel-heading">
                <p className="section-label">Evidence</p>
                <strong>{selectedIncident.service}</strong>
              </div>
              {selectedIncident.evidence.map((item) => (
                <article key={`${selectedIncident.id}-${item.time}`}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            {stage !== 'alert' && (
              <div className="rollback-panel" data-transition-result>
                <div>
                  <p className="section-label">Rollback plan</p>
                  <h3>
                    {isResolved
                      ? 'Rollback applied'
                      : selectedIncident.rollback.label}
                  </h3>
                  <p>
                    {isResolved
                      ? selectedIncident.rollback.expectedResult
                      : `${selectedIncident.rollback.target} will be restored to the previous stable version.`}
                  </p>
                </div>
                {isResolved ? (
                  <span className="resolved-pill">
                    <Check size={16} aria-hidden="true" />
                    Resolved
                  </span>
                ) : (
                  <button
                    className="primary-action"
                    onClick={() => updateReview('resolved')}
                    type="button"
                  >
                    <RotateCcw size={17} aria-hidden="true" />
                    {checkoutReview.resolutionAction}
                  </button>
                )}
              </div>
            )}

            {stage === 'alert' && (
              <button
                className="open-action"
                onClick={() => updateReview('review')}
                type="button"
              >
                {checkoutReview.primaryAction}
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            )}
          </section>
        </div>
      </section>

      <section className="motion-note" aria-labelledby="motion-title">
        <div>
          <p className="section-label">Motion details</p>
          <h2 id="motion-title">Why the transition matters</h2>
        </div>
        <div className="motion-list">
          {reviewMotionMoments.map((moment) => (
            <article key={moment.label}>
              <strong>{moment.label}</strong>
              <p>{moment.productMoment}</p>
              <small>{moment.toolkitUse}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
