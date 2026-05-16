import type { MealRequest, Recipe, Tray } from '../../types'
import { requestStatusLabel, trayStatusLabel } from '../../labels'
import { formatIsoAsLocalDateTime } from './PatientHeaderCard'

interface MealRequestStatusPanelProps {
  request: MealRequest
  recipes: Recipe[]
  associatedTray: Tray | undefined
  isFinalizing: boolean
  onFinalize: () => void
}

export default function MealRequestStatusPanel({
  request,
  recipes,
  associatedTray,
  isFinalizing,
  onFinalize,
}: MealRequestStatusPanelProps) {
  return (
    <div className="request-status">
      <div className={`status-badge status-${request.status.toLowerCase()}`}>
        {requestStatusLabel[request.status]}
      </div>
      <p className="muted">Request ID {request.id}</p>
      <ul className="recipe-summary">
        {request.recipe_ids.map((id) => {
          const recipe = recipes.find((r) => r.id === id)
          return <li key={id}>{recipe ? recipe.name : id}</li>
        })}
      </ul>
      {request.status === 'REJECTED' && request.rejection_reason && (
        <div className="banner-error">{request.rejection_reason}</div>
      )}
      {request.status === 'DRAFT' && (
        <div className="actions">
          <button className="primary" onClick={onFinalize} disabled={isFinalizing}>
            {isFinalizing ? 'Finalizing…' : 'Finalize & send to kitchen'}
          </button>
        </div>
      )}
      {request.status === 'FINALIZED' && (
        <>
          <p className="muted">
            Sent to kitchen{' '}
            {request.finalized_at ? `at ${formatIsoAsLocalDateTime(request.finalized_at)}` : ''}
          </p>
          {associatedTray && (
            <div className="tray-state">
              <span className="muted">Tray status</span>
              <span className={`status-badge status-${associatedTray.status.toLowerCase()}`}>
                {trayStatusLabel[associatedTray.status]}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
