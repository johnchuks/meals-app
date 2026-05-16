import { useMemo } from 'react'
import type { Recipe, Tray, TrayHistory } from '../../types'
import { dietLabel, trayStatusLabel } from '../../labels'
import type { TrayPatientContext } from '../../hooks/useTrayPatientContexts'
import TrayLifecycleProgress from './TrayLifecycleProgress'
import TrayTransitionHistory from './TrayTransitionHistory'

interface TrayDetailPanelProps {
  tray: Tray
  patientContext: TrayPatientContext | undefined
  recipeById: Record<string, Recipe>
  transitionHistory: TrayHistory[]
  isAdvancing: boolean
  onAdvanceToNextStatus: () => void
}

export default function TrayDetailPanel({
  tray,
  patientContext,
  recipeById,
  transitionHistory,
  isAdvancing,
  onAdvanceToNextStatus,
}: TrayDetailPanelProps) {
  const orderedRecipeNames = useMemo(() => {
    if (!patientContext) return []
    return patientContext.mealRequest.recipe_ids.map(
      (recipeId) => recipeById[recipeId]?.name ?? recipeId,
    )
  }, [patientContext, recipeById])

  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <h2>
            {patientContext
              ? `${patientContext.patient.first_name} ${patientContext.patient.last_name}`
              : `Tray ${tray.id.slice(0, 8)}`}
          </h2>
          {patientContext && (
            <p className="muted">
              MRN {patientContext.patient.mrn} · Diet {dietLabel[patientContext.patient.diet]}
            </p>
          )}
        </div>
        <div className={`status-badge status-${tray.status.toLowerCase()}`}>
          {trayStatusLabel[tray.status]}
        </div>
      </header>

      {patientContext && (
        <section className="card">
          <h3>Recipes</h3>
          {orderedRecipeNames.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="recipe-summary">
              {orderedRecipeNames.map((name, index) => <li key={index}>{name}</li>)}
            </ul>
          )}
        </section>
      )}

      <TrayLifecycleProgress
        currentStatus={tray.status}
        isAdvancing={isAdvancing}
        onAdvanceToNextStatus={onAdvanceToNextStatus}
      />

      <TrayTransitionHistory transitions={transitionHistory} />
    </div>
  )
}
