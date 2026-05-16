import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Allergen, DietType, MealRequest, Patient, Recipe, Tray } from '../../types'
import PatientHeaderCard from './PatientHeaderCard'
import PatientDietPicker from './PatientDietPicker'
import PatientAllergyEditor from './PatientAllergyEditor'
import MealRequestHistoryList from './MealRequestHistoryList'
import MealRequestComposer from './MealRequestComposer'
import MealRequestStatusPanel from './MealRequestStatusPanel'

interface PatientDetailProps {
  patient: Patient
  recipes: Recipe[]
  onPatientChanged: (patient: Patient) => void
  onError: (message: string) => void
}

export default function PatientDetail({
  patient,
  recipes,
  onPatientChanged,
  onError,
}: PatientDetailProps) {
  const [pickedRecipeIds, setPickedRecipeIds] = useState<Set<string>>(new Set())
  const [activeRequest, setActiveRequest] = useState<MealRequest | null>(null)
  const [requestHistory, setRequestHistory] = useState<MealRequest[]>([])
  const [trayByRequestId, setTrayByRequestId] = useState<Record<string, Tray>>({})
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let isMounted = true
    setActiveRequest(null)
    setPickedRecipeIds(new Set())
    setRequestHistory([])
    setTrayByRequestId({})
    ;(async () => {
      try {
        const fetchedRequests = await api<MealRequest[]>(
          `/meal-requests?patient_id=${patient.id}`,
        )
        if (!isMounted) return
        setRequestHistory(fetchedRequests)
        const finalizedRequests = fetchedRequests.filter((r) => r.status === 'FINALIZED')
        const fetchedTrayEntries = await Promise.all(
          finalizedRequests.map(async (request) => {
            try {
              const matchingTrays = await api<Tray[]>(`/trays?meal_request_id=${request.id}`)
              return matchingTrays[0] ? ([request.id, matchingTrays[0]] as const) : null
            } catch {
              return null
            }
          }),
        )
        if (!isMounted) return
        setTrayByRequestId((prev) => {
          const next = { ...prev }
          for (const entry of fetchedTrayEntries) if (entry) next[entry[0]] = entry[1]
          return next
        })
      } catch (err) {
        if (isMounted) {
          onError(err instanceof Error ? err.message : 'Failed to load meal requests')
        }
      }
    })()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id])

  function upsertHistoryEntry(request: MealRequest) {
    setRequestHistory((existing) => {
      const matchIndex = existing.findIndex((r) => r.id === request.id)
      if (matchIndex === -1) return [request, ...existing]
      const copy = existing.slice()
      copy[matchIndex] = request
      return copy
    })
  }

  async function changePatientDiet(nextDiet: DietType) {
    try {
      const updatedPatient = await api<Patient>(`/patients/${patient.id}/diet`, {
        method: 'PATCH',
        body: JSON.stringify({ diet: nextDiet }),
      })
      onPatientChanged(updatedPatient)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update diet')
    }
  }

  async function recordPatientAllergy(allergen: Allergen, severity: string | null) {
    try {
      await api(`/patients/${patient.id}/allergies`, {
        method: 'POST',
        body: JSON.stringify({ allergen, severity }),
      })
      const refreshed = await api<Patient>(`/patients/${patient.id}`)
      onPatientChanged(refreshed)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add allergy')
    }
  }

  async function removePatientAllergy(allergyId: string) {
    try {
      await api(`/patients/${patient.id}/allergies/${allergyId}`, { method: 'DELETE' })
      const refreshed = await api<Patient>(`/patients/${patient.id}`)
      onPatientChanged(refreshed)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove allergy')
    }
  }

  function toggleRecipePicked(recipeId: string) {
    setPickedRecipeIds((prev) => {
      const next = new Set(prev)
      if (next.has(recipeId)) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })
  }

  async function createDraftMealRequest() {
    if (pickedRecipeIds.size === 0) return
    setIsBusy(true)
    try {
      const draft = await api<MealRequest>('/meal-requests', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patient.id,
          recipe_ids: Array.from(pickedRecipeIds),
        }),
      })
      setActiveRequest(draft)
      upsertHistoryEntry(draft)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create request')
    } finally {
      setIsBusy(false)
    }
  }

  async function finalizeActiveRequest() {
    if (!activeRequest) return
    setIsBusy(true)
    try {
      const finalized = await api<MealRequest>(
        `/meal-requests/${activeRequest.id}/finalize`,
        { method: 'POST' },
      )
      setActiveRequest(finalized)
      upsertHistoryEntry(finalized)
      if (finalized.status === 'FINALIZED') {
        try {
          const matchingTrays = await api<Tray[]>(`/trays?meal_request_id=${finalized.id}`)
          if (matchingTrays[0]) {
            setTrayByRequestId((prev) => ({ ...prev, [finalized.id]: matchingTrays[0] }))
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to finalize')
      try {
        const refetched = await api<MealRequest>(`/meal-requests/${activeRequest.id}`)
        setActiveRequest(refetched)
        upsertHistoryEntry(refetched)
      } catch { /* ignore */ }
    } finally {
      setIsBusy(false)
    }
  }

  function resetForNewRequest() {
    setActiveRequest(null)
    setPickedRecipeIds(new Set())
  }

  return (
    <div className="detail">
      <PatientHeaderCard patient={patient} />

      <PatientDietPicker currentDiet={patient.diet} onSelectDiet={changePatientDiet} />

      <PatientAllergyEditor
        allergies={patient.allergies}
        onAddAllergy={recordPatientAllergy}
        onRemoveAllergy={removePatientAllergy}
      />

      <MealRequestHistoryList
        requests={requestHistory}
        trayByRequestId={trayByRequestId}
        recipes={recipes}
        selectedRequestId={activeRequest?.id ?? null}
        onSelectRequest={setActiveRequest}
      />

      <section className="card">
        <div className="card-head">
          <h3>{activeRequest ? 'Selected meal request' : 'New meal request'}</h3>
          {activeRequest && <button className="link" onClick={resetForNewRequest}>Start new</button>}
        </div>

        {!activeRequest ? (
          <MealRequestComposer
            recipes={recipes}
            pickedRecipeIds={pickedRecipeIds}
            isCreatingDraft={isBusy}
            onToggleRecipe={toggleRecipePicked}
            onCreateDraft={createDraftMealRequest}
          />
        ) : (
          <MealRequestStatusPanel
            request={activeRequest}
            recipes={recipes}
            associatedTray={trayByRequestId[activeRequest.id]}
            isFinalizing={isBusy}
            onFinalize={finalizeActiveRequest}
          />
        )}
      </section>
    </div>
  )
}
