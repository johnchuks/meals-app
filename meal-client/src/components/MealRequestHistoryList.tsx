import type { MealRequest, Recipe, Tray } from '../types'
import { requestStatusLabel, trayStatusLabel } from '../labels'
import { formatIsoAsLocalDateTime } from '../utils/datetime'

interface MealRequestHistoryListProps {
  requests: MealRequest[]
  trayByRequestId: Record<string, Tray>
  recipes: Recipe[]
  selectedRequestId: string | null
  onSelectRequest: (request: MealRequest) => void
}

export default function MealRequestHistoryList({
  requests,
  trayByRequestId,
  recipes,
  selectedRequestId,
  onSelectRequest,
}: MealRequestHistoryListProps) {
  if (requests.length === 0) return null

  return (
    <section className="card">
      <h3>Meal requests</h3>
      <ul className="request-history">
        {requests.map((request) => {
          const associatedTray = trayByRequestId[request.id]
          return (
            <li
              key={request.id}
              className={selectedRequestId === request.id ? 'selected' : ''}
              onClick={() => onSelectRequest(request)}
            >
              <div className="request-row">
                <span className={`status-badge status-${request.status.toLowerCase()}`}>
                  {requestStatusLabel[request.status]}
                </span>
                {associatedTray && (
                  <span className={`status-badge status-${associatedTray.status.toLowerCase()}`}>
                    Tray · {trayStatusLabel[associatedTray.status]}
                  </span>
                )}
                <span className="muted">{formatIsoAsLocalDateTime(request.created_at)}</span>
              </div>
              <div className="request-recipes">
                {request.recipe_ids
                  .map((id) => recipes.find((r) => r.id === id)?.name ?? id)
                  .join(', ')}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
