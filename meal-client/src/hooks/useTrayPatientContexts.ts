import { useCallback, useState } from 'react'
import { api } from '../api'
import type { MealRequest, Patient, Tray } from '../types'

export interface TrayPatientContext {
  mealRequest: MealRequest
  patient: Patient
}

export type TrayPatientContextMap = Record<string, TrayPatientContext>

export function useTrayPatientContexts() {
  const [contextsByTrayId, setContextsByTrayId] = useState<TrayPatientContextMap>({})

  const ensureContextsLoaded = useCallback(async (trays: Tray[]) => {
    const traysMissingContext = trays.filter((t) => !contextsByTrayId[t.id])
    if (traysMissingContext.length === 0) return

    const fetched = await Promise.all(
      traysMissingContext.map(async (tray): Promise<[string, TrayPatientContext] | null> => {
        try {
          const mealRequest = await api<MealRequest>(`/meal-requests/${tray.meal_request_id}`)
          const patient = await api<Patient>(`/patients/${mealRequest.patient_id}`)
          return [tray.id, { mealRequest, patient }]
        } catch {
          return null
        }
      }),
    )

    setContextsByTrayId((prev) => {
      const next = { ...prev }
      for (const entry of fetched) if (entry) next[entry[0]] = entry[1]
      return next
    })
  }, [contextsByTrayId])

  return { contextsByTrayId, ensureContextsLoaded }
}
