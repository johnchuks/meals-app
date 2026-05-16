import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Allergen, DietType, MealRequest, Patient, Recipe, Tray } from '../types'
import { ALLERGENS, DIET_TYPES } from '../types'
import { allergenLabel, clinicalStateLabel, dietLabel, requestStatusLabel, trayStatusLabel } from '../labels'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

interface Props {
  patient: Patient
  recipes: Recipe[]
  onPatientChanged: (p: Patient) => void
  onError: (msg: string) => void
}

export default function PatientDetail({ patient, recipes, onPatientChanged, onError }: Props) {
  const [allergen, setAllergen] = useState<Allergen | ''>('')
  const [severity, setSeverity] = useState('')
  const [pickedRecipes, setPickedRecipes] = useState<Set<string>>(new Set())
  const [request, setRequest] = useState<MealRequest | null>(null)
  const [history, setHistory] = useState<MealRequest[]>([])
  const [trays, setTrays] = useState<Record<string, Tray>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setRequest(null)
    setPickedRecipes(new Set())
    setHistory([])
    setTrays({})
    ;(async () => {
      try {
        const list = await api<MealRequest[]>(`/meal-requests?patient_id=${patient.id}`)
        if (!alive) return
        setHistory(list)
        const finalized = list.filter((r) => r.status === 'FINALIZED')
        const loaded = await Promise.all(
          finalized.map(async (r) => {
            try {
              const matches = await api<Tray[]>(`/trays?meal_request_id=${r.id}`)
              return matches[0] ? ([r.id, matches[0]] as const) : null
            } catch {
              return null
            }
          }),
        )
        if (!alive) return
        setTrays((prev) => {
          const next = { ...prev }
          for (const entry of loaded) if (entry) next[entry[0]] = entry[1]
          return next
        })
      } catch (e) {
        if (alive) onError(e instanceof Error ? e.message : 'Failed to load meal requests')
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id])

  function upsertHistory(r: MealRequest) {
    setHistory((list) => {
      const idx = list.findIndex((x) => x.id === r.id)
      if (idx === -1) return [r, ...list]
      const copy = list.slice()
      copy[idx] = r
      return copy
    })
  }

  async function changeDiet(diet: DietType) {
    try {
      const p = await api<Patient>(`/patients/${patient.id}/diet`, {
        method: 'PATCH',
        body: JSON.stringify({ diet }),
      })
      onPatientChanged(p)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update diet')
    }
  }

  async function addAllergy(e: React.FormEvent) {
    e.preventDefault()
    if (!allergen) return
    try {
      await api(`/patients/${patient.id}/allergies`, {
        method: 'POST',
        body: JSON.stringify({ allergen, severity: severity.trim() || null }),
      })
      const p = await api<Patient>(`/patients/${patient.id}`)
      onPatientChanged(p)
      setAllergen('')
      setSeverity('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add allergy')
    }
  }

  async function removeAllergy(id: string) {
    try {
      await api(`/patients/${patient.id}/allergies/${id}`, { method: 'DELETE' })
      const p = await api<Patient>(`/patients/${patient.id}`)
      onPatientChanged(p)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to remove allergy')
    }
  }

  function toggleRecipe(id: string) {
    setPickedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function createDraft() {
    if (pickedRecipes.size === 0) return
    setBusy(true)
    try {
      const r = await api<MealRequest>('/meal-requests', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patient.id,
          recipe_ids: Array.from(pickedRecipes),
        }),
      })
      setRequest(r)
      upsertHistory(r)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create request')
    } finally {
      setBusy(false)
    }
  }

  async function finalize() {
    if (!request) return
    setBusy(true)
    try {
      const r = await api<MealRequest>(`/meal-requests/${request.id}/finalize`, {
        method: 'POST',
      })
      setRequest(r)
      upsertHistory(r)
      if (r.status === 'FINALIZED') {
        try {
          const matches = await api<Tray[]>(`/trays?meal_request_id=${r.id}`)
          if (matches[0]) setTrays((prev) => ({ ...prev, [r.id]: matches[0] }))
        } catch { /* ignore */ }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to finalize'
      // 422 returns the rejected request; surface the reason inline
      onError(msg)
      try {
        const r = await api<MealRequest>(`/meal-requests/${request.id}`)
        setRequest(r)
        upsertHistory(r)
      } catch { /* ignore */ }
    } finally {
      setBusy(false)
    }
  }

  function newRequest() {
    setRequest(null)
    setPickedRecipes(new Set())
  }

  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <h2>{patient.first_name} {patient.last_name}</h2>
          <p className="muted">MRN {patient.mrn} · DOB {patient.date_of_birth}</p>
          <p className="muted">Admitted {formatDateTime(patient.admitted_at)}</p>
        </div>
        <div className={`status-badge state-${patient.current_clinical_state.toLowerCase()}`}>
          {clinicalStateLabel[patient.current_clinical_state]}
        </div>
      </header>

      <section className="card">
        <h3>Diet</h3>
        <div className="diet-row">
          {DIET_TYPES.map((d) => (
            <button
              key={d}
              className={`chip ${d === patient.diet ? 'chip-active' : ''}`}
              onClick={() => d !== patient.diet && changeDiet(d)}
            >
              {dietLabel[d]}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Allergies</h3>
        {patient.allergies.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul className="tag-list">
            {patient.allergies.map((a) => (
              <li key={a.id} className="tag">
                <span>{allergenLabel[a.allergen]}{a.severity ? ` (${a.severity})` : ''}</span>
                <button className="tag-x" onClick={() => removeAllergy(a.id)} aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
        )}
        <form className="row inline-form" onSubmit={addAllergy}>
          <select
            value={allergen}
            onChange={(e) => setAllergen(e.target.value as Allergen | '')}
            required
          >
            <option value="">Select allergen…</option>
            {ALLERGENS.filter(
              (a) => !patient.allergies.some((existing) => existing.allergen === a),
            ).map((a) => (
              <option key={a} value={a}>{allergenLabel[a]}</option>
            ))}
          </select>
          <input
            placeholder="Severity (optional)"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          />
          <button className="primary" type="submit" disabled={!allergen}>Add</button>
        </form>
      </section>

      {history.length > 0 && (
        <section className="card">
          <h3>Meal requests</h3>
          <ul className="request-history">
            {history.map((r) => (
              <li
                key={r.id}
                className={request?.id === r.id ? 'selected' : ''}
                onClick={() => setRequest(r)}
              >
                <div className="request-row">
                  <span className={`status-badge status-${r.status.toLowerCase()}`}>
                    {requestStatusLabel[r.status]}
                  </span>
                  {trays[r.id] && (
                    <span className={`status-badge status-${trays[r.id].status.toLowerCase()}`}>
                      Tray · {trayStatusLabel[trays[r.id].status]}
                    </span>
                  )}
                  <span className="muted">{formatDateTime(r.created_at)}</span>
                </div>
                <div className="request-recipes">
                  {r.recipe_ids
                    .map((id) => recipes.find((x) => x.id === id)?.name ?? id)
                    .join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h3>{request ? 'Selected meal request' : 'New meal request'}</h3>
          {request && <button className="link" onClick={newRequest}>Start new</button>}
        </div>

        {!request && (
          <>
            <p className="muted">Pick recipes, then create a draft.</p>
            <ul className="recipe-list">
              {recipes.map((r) => {
                const picked = pickedRecipes.has(r.id)
                return (
                  <li key={r.id} className={`recipe ${picked ? 'recipe-picked' : ''}`} onClick={() => toggleRecipe(r.id)}>
                    <div className="recipe-top">
                      <input type="checkbox" checked={picked} readOnly />
                      <span className="recipe-name">{r.name}</span>
                    </div>
                    <div className="recipe-meta">
                      <span>Diets: {r.compatible_diets.map((d) => dietLabel[d]).join(', ') || '—'}</span>
                      <span>Allergens: {r.allergens.map((a) => allergenLabel[a]).join(', ') || 'none'}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="actions">
              <button className="primary" onClick={createDraft} disabled={busy || pickedRecipes.size === 0}>
                {busy ? 'Creating…' : `Create draft (${pickedRecipes.size})`}
              </button>
            </div>
          </>
        )}

        {request && (
          <div className="request-status">
            <div className={`status-badge status-${request.status.toLowerCase()}`}>{requestStatusLabel[request.status]}</div>
            <p className="muted">Request ID {request.id}</p>
            <ul className="recipe-summary">
              {request.recipe_ids.map((id) => {
                const r = recipes.find((x) => x.id === id)
                return <li key={id}>{r ? r.name : id}</li>
              })}
            </ul>
            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="banner-error">{request.rejection_reason}</div>
            )}
            {request.status === 'DRAFT' && (
              <div className="actions">
                <button className="primary" onClick={finalize} disabled={busy}>
                  {busy ? 'Finalizing…' : 'Finalize & send to kitchen'}
                </button>
              </div>
            )}
            {request.status === 'FINALIZED' && (
              <>
                <p className="muted">
                  Sent to kitchen {request.finalized_at ? `at ${formatDateTime(request.finalized_at)}` : ''}
                </p>
                {trays[request.id] && (
                  <div className="tray-state">
                    <span className="muted">Tray status</span>
                    <span className={`status-badge status-${trays[request.id].status.toLowerCase()}`}>
                      {trayStatusLabel[trays[request.id].status]}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
