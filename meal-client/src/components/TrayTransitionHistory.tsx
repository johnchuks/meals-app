import type { TrayHistory } from '../types'
import { trayStatusLabel } from '../labels'

interface TrayTransitionHistoryProps {
  transitions: TrayHistory[]
}

export default function TrayTransitionHistory({ transitions }: TrayTransitionHistoryProps) {
  return (
    <section className="card">
      <h3>History</h3>
      {transitions.length === 0 ? (
        <p className="muted">No transitions yet.</p>
      ) : (
        <ul className="history">
          {transitions.map((transition, index) => (
            <li key={index}>
              <span className="history-time">
                {new Date(transition.transitioned_at).toLocaleString()}
              </span>
              <span>
                {transition.from_status ? trayStatusLabel[transition.from_status] : '—'} →{' '}
                <strong>{trayStatusLabel[transition.to_status]}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
