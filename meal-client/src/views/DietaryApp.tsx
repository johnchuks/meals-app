import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Patient, Recipe } from '../types'
import PatientList from './PatientList'
import PatientDetail from './PatientDetail'

export default function DietaryApp() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [recs, pats] = await Promise.all([
          api<Recipe[]>('/recipes?active=true'),
          api<Patient[]>('/patients'),
        ])
        if (!alive) return
        setRecipes(recs)
        setPatients(pats)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function upsertPatient(p: Patient) {
    setPatients((list) => {
      const idx = list.findIndex((x) => x.id === p.id)
      if (idx === -1) return [p, ...list]
      const copy = list.slice()
      copy[idx] = p
      return copy
    })
  }

  async function loadPatient(id: string) {
    const p = await api<Patient>(`/patients/${id}`)
    upsertPatient(p)
  }

  const selected = patients.find((p) => p.id === selectedId) ?? null

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="layout">
      <aside className="sidebar">
        <PatientList
          patients={patients}
          selectedId={selectedId}
          onSelect={async (id) => {
            setSelectedId(id)
            try {
              await loadPatient(id)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to load patient')
            }
          }}
          onCreated={(p) => {
            upsertPatient(p)
            setSelectedId(p.id)
          }}
          onError={setError}
        />
      </aside>
      <section className="content">
        {error && <div className="banner-error" onClick={() => setError(null)}>{error}</div>}
        {selected ? (
          <PatientDetail
            patient={selected}
            recipes={recipes}
            onPatientChanged={upsertPatient}
            onError={setError}
          />
        ) : (
          <div className="empty">
            <p>Select a patient on the left, or admit a new one.</p>
          </div>
        )}
      </section>
    </div>
  )
}
