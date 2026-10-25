// Strip shown while compiling or loading a program: each step with its status and timing, plus what
// the current step is doing right now (e.g. arduino-cli's "Compiling core...").

export interface BuildStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
  detail?: string
  startedAt?: number
  endedAt?: number
}

export interface BuildState {
  title: string
  steps: BuildStep[]
  startedAt: number
  endedAt?: number
  failed?: boolean
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`

export function BuildProgress({ build, now, onDismiss }: { build: BuildState; now: number; onDismiss: () => void }) {
  const active = build.steps.find((s) => s.status === 'active' || s.status === 'error')
  const elapsed = (build.endedAt ?? now) - build.startedAt
  const headline = build.failed
    ? `${build.title} failed after ${seconds(elapsed)}`
    : build.endedAt
      ? `Done in ${seconds(elapsed)}`
      : `${build.title}… ${seconds(elapsed)}`

  return (
    <div className={`build-progress${build.failed ? ' failed' : build.endedAt ? ' done' : ''}`} role="status" aria-live="polite">
      <div className="build-headline">{headline}</div>
      <ol className="build-steps">
        {build.steps.map((step) => (
          <li key={step.id} className={`build-step ${step.status}`}>
            <span className="build-step-icon" aria-hidden="true">
              {step.status === 'done' ? '✓' : step.status === 'error' ? '✕' : ''}
            </span>
            <span className="build-step-label">{step.label}</span>
            {step.startedAt != null && (
              <span className="build-step-time">{seconds((step.endedAt ?? now) - step.startedAt)}</span>
            )}
          </li>
        ))}
      </ol>
      {active?.detail && !build.endedAt && <div className="build-detail">{active.detail}</div>}
      {build.endedAt && (
        <button type="button" className="build-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  )
}
