import type { Recipe, Tray } from '../../types'
import { dietLabel, trayStatusLabel } from '../../labels'
import type { TrayPatientContext } from '../../hooks/useTrayPatientContexts'

interface TraySidebarItemProps {
  tray: Tray
  patientContext: TrayPatientContext | undefined
  recipeById: Record<string, Recipe>
  isSelected: boolean
  onSelect: () => void
}

interface TraySidebarLabels {
  primary: string
  diet: string | null
  recipes: string | null
}

function buildSidebarLabels(
  tray: Tray,
  patientContext: TrayPatientContext | undefined,
  recipeById: Record<string, Recipe>,
): TraySidebarLabels {
  if (!patientContext) {
    return { primary: `Tray ${tray.id.slice(0, 8)}`, diet: null, recipes: null }
  }
  const { patient, mealRequest } = patientContext
  const patientFullName = `${patient.first_name} ${patient.last_name}`
  const joinedRecipeNames = mealRequest.recipe_ids
    .map((id) => recipeById[id]?.name)
    .filter(Boolean)
    .join(', ')
  return {
    primary: patientFullName,
    diet: dietLabel[patient.diet],
    recipes: joinedRecipeNames || null,
  }
}

export default function TraySidebarItem({
  tray,
  patientContext,
  recipeById,
  isSelected,
  onSelect,
}: TraySidebarItemProps) {
  const labels = buildSidebarLabels(tray, patientContext, recipeById)
  return (
    <li className={isSelected ? 'selected' : ''} onClick={onSelect}>
      <div className="patient-name">{labels.primary}</div>
      {labels.diet && <div className="patient-meta">Diet: {labels.diet}</div>}
      {labels.recipes && <div className="patient-meta">{labels.recipes}</div>}
      <div className="patient-meta">
        <span className={`status-dot status-${tray.status.toLowerCase()}`} />{' '}
        {trayStatusLabel[tray.status]}
      </div>
    </li>
  )
}
