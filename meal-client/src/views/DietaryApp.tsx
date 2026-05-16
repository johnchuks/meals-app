import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Patient, Recipe } from '../types'
import SidebarContentLayout from '../components/SidebarContentLayout'
import PatientSidebarList from '../components/PatientSidebarList'
import PatientDetail from '../components/PatientDetail'

export default function DietaryApp() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [activeRecipes, setActiveRecipes] = useState<Recipe[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const [recipes, patientsList] = await Promise.all([
          api<Recipe[]>('/recipes?active=true'),
          api<Patient[]>('/patients'),
        ])
        if (!isMounted) return
        setActiveRecipes(recipes)
        setPatients(patientsList)
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (isMounted) setIsLoadingInitialData(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  function upsertPatientInList(patient: Patient) {
    setPatients((currentPatients) => {
      const matchIndex = currentPatients.findIndex((p) => p.id === patient.id)
      if (matchIndex === -1) return [patient, ...currentPatients]
      const copy = currentPatients.slice()
      copy[matchIndex] = patient
      return copy
    })
  }

  async function refreshPatientById(patientId: string) {
    const refreshed = await api<Patient>(`/patients/${patientId}`)
    upsertPatientInList(refreshed)
  }

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null

  if (isLoadingInitialData) return <div className="loading">Loading…</div>

  const sidebar = (
    <PatientSidebarList
      patients={patients}
      selectedPatientId={selectedPatientId}
      onSelectPatient={async (patientId) => {
        setSelectedPatientId(patientId)
        try {
          await refreshPatientById(patientId)
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load patient')
        }
      }}
      onPatientAdmitted={(admittedPatient) => {
        upsertPatientInList(admittedPatient)
        setSelectedPatientId(admittedPatient.id)
      }}
      onError={setErrorMessage}
    />
  )

  const content = selectedPatient ? (
    <PatientDetail
      patient={selectedPatient}
      recipes={activeRecipes}
      onPatientChanged={upsertPatientInList}
      onError={setErrorMessage}
    />
  ) : (
    <div className="empty">
      <p>Select a patient on the left, or admit a new one.</p>
    </div>
  )

  return (
    <SidebarContentLayout
      sidebar={sidebar}
      content={content}
      errorMessage={errorMessage}
      onDismissError={() => setErrorMessage(null)}
    />
  )
}
