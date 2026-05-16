import type { TrayStatus } from '../../types'
import { trayStatusLabel } from '../../labels'
import {
  NEXT_TRANSITION_BY_STATUS,
  TRAY_STATUS_PIPELINE,
  classifyPipelineStep,
} from '../../domain/trayWorkflow'

interface TrayLifecycleProgressProps {
  currentStatus: TrayStatus
  isAdvancing: boolean
  onAdvanceToNextStatus: () => void
}

export default function TrayLifecycleProgress({
  currentStatus,
  isAdvancing,
  onAdvanceToNextStatus,
}: TrayLifecycleProgressProps) {
  const nextTransition = NEXT_TRANSITION_BY_STATUS[currentStatus]
  return (
    <section className="card">
      <h3>Lifecycle</h3>
      <ol className="lifecycle">
        {TRAY_STATUS_PIPELINE.map((step) => {
          const stepState = classifyPipelineStep(step, currentStatus)
          return (
            <li key={step} className={`step step-${stepState}`}>
              {trayStatusLabel[step]}
            </li>
          )
        })}
      </ol>
      {nextTransition && (
        <div className="actions">
          <button
            className="primary"
            onClick={onAdvanceToNextStatus}
            disabled={isAdvancing}
          >
            {isAdvancing ? 'Working…' : nextTransition.buttonLabel}
          </button>
        </div>
      )}
    </section>
  )
}
