import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { MealRequest, Patient, Recipe, Tray, TrayHistory, TrayStatus } from '../types'
import { dietLabel, trayStatusLabel } from '../labels'

const STATUSES: TrayStatus[] = [
  'CREATED',
  'PREPARATION_STARTED',
  'ACCURACY_VALIDATED',
  'EN_ROUTE',
  'DELIVERED',
  'RETRIEVED',
]

const NEXT_ACTION: Record<TrayStatus, { label: string; path: string; next: TrayStatus } | null> = {
  CREATED: { label: 'Start preparation', path: 'start-preparation', next: 'PREPARATION_STARTED' },
  PREPARATION_STARTED: { label: 'Validate accuracy', path: 'validate-accuracy', next: 'ACCURACY_VALIDATED' },
  ACCURACY_VALIDATED: { label: 'Dispatch', path: 'dispatch', next: 'EN_ROUTE' },
  EN_ROUTE: { label: 'Mark delivered', path: 'deliver', next: 'DELIVERED' },
  DELIVERED: { label: 'Mark retrieved', path: 'retrieve', next: 'RETRIEVED' },
  RETRIEVED: null,
}

interface TrayContext {
  request: MealRequest
  patient: Patient
}

export default function KitchenApp() {
  const [trays, setTrays] = useState<Tray[]>([])
  const [filter, setFilter] = useState<TrayStatus | 'ALL'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<TrayHistory[]>([])
  const [recipeMap, setRecipeMap] = useState<Record<string, Recipe>>({})
  const [contexts, setContexts] = useState<Record<string, TrayContext>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const recs = await api<Recipe[]>('/recipes')
        if (!alive) return
        const map: Record<string, Recipe> = {}
        for (const r of recs) map[r.id] = r
        setRecipeMap(map)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load recipes')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function loadTrays() {
    setLoading(true)
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`
      const list = await api<Tray[]>(`/trays${qs}`)
      setTrays(list)
      const missing = list.filter((t) => !contexts[t.id])
      if (missing.length) {
        const loaded = await Promise.all(
          missing.map(async (t): Promise<[string, TrayContext] | null> => {
            try {
              const request = await api<MealRequest>(`/meal-requests/${t.meal_request_id}`)
              const patient = await api<Patient>(`/patients/${request.patient_id}`)
              return [t.id, { request, patient }]
            } catch {
              return null
            }
          }),
        )
        setContexts((prev) => {
          const next = { ...prev }
          for (const entry of loaded) if (entry) next[entry[0]] = entry[1]
          return next
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trays')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function selectTray(id: string) {
    setSelectedId(id)
    try {
      const h = await api<TrayHistory[]>(`/trays/${id}/status-history`)
      setHistory(h)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history')
    }
  }

  async function transition(tray: Tray) {
    const action = NEXT_ACTION[tray.status]
    if (!action) return
    setBusy(true)
    try {
      const updated = await api<Tray>(`/trays/${tray.id}/${action.path}`, { method: 'POST' })
      setTrays((list) => list.map((t) => (t.id === updated.id ? updated : t)))
      if (selectedId === tray.id) {
        const h = await api<TrayHistory[]>(`/trays/${tray.id}/status-history`)
        setHistory(h)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transition failed')
    } finally {
      setBusy(false)
    }
  }

  const selected = trays.find((t) => t.id === selectedId) ?? null
  const selectedCtx = selected ? contexts[selected.id] : null

  function trayLabel(tray: Tray): { primary: string; diet: string | null; recipes: string | null } {
    const ctx = contexts[tray.id]
    if (!ctx) return { primary: `Tray ${tray.id.slice(0, 8)}`, diet: null, recipes: null }
    const patientName = `${ctx.patient.first_name} ${ctx.patient.last_name}`
    const recipes = ctx.request.recipe_ids
      .map((id) => recipeMap[id]?.name)
      .filter(Boolean)
      .join(', ')
    return { primary: patientName, diet: dietLabel[ctx.patient.diet], recipes: recipes || null }
  }

  const recipeNames = useMemo(() => {
    if (!selectedCtx) return []
    return selectedCtx.request.recipe_ids.map((id) => recipeMap[id]?.name ?? id)
  }, [selectedCtx, recipeMap])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-head">
          <h2>Trays</h2>
          <button className="link small" onClick={loadTrays}>Refresh</button>
        </div>
        <div className="filter-row">
          <select value={filter} onChange={(e) => setFilter(e.target.value as TrayStatus | 'ALL')}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{trayStatusLabel[s]}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="muted small-pad">Loading…</p>
        ) : trays.length === 0 ? (
          <p className="muted small-pad">No trays.</p>
        ) : (
          <ul className="patient-list">
            {trays.map((t) => {
              const label = trayLabel(t)
              return (
                <li
                  key={t.id}
                  className={t.id === selectedId ? 'selected' : ''}
                  onClick={() => selectTray(t.id)}
                >
                  <div className="patient-name">{label.primary}</div>
                  {label.diet && (
                    <div className="patient-meta">Diet: {label.diet}</div>
                  )}
                  {label.recipes && (
                    <div className="patient-meta">{label.recipes}</div>
                  )}
                  <div className="patient-meta">
                    <span className={`status-dot status-${t.status.toLowerCase()}`} /> {trayStatusLabel[t.status]}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className="content">
        {error && <div className="banner-error" onClick={() => setError(null)}>{error}</div>}
        {!selected ? (
          <div className="empty"><p>Select a tray to manage.</p></div>
        ) : (
          <div className="detail">
            <header className="detail-head">
              <div>
                <h2>
                  {selectedCtx
                    ? `${selectedCtx.patient.first_name} ${selectedCtx.patient.last_name}`
                    : `Tray ${selected.id.slice(0, 8)}`}
                </h2>
                {selectedCtx && (
                  <p className="muted">
                    MRN {selectedCtx.patient.mrn} · Diet {dietLabel[selectedCtx.patient.diet]}
                  </p>
                )}
              </div>
              <div className={`status-badge status-${selected.status.toLowerCase()}`}>{trayStatusLabel[selected.status]}</div>
            </header>

            {selectedCtx && (
              <section className="card">
                <h3>Recipes</h3>
                {recipeNames.length === 0 ? (
                  <p className="muted">None.</p>
                ) : (
                  <ul className="recipe-summary">
                    {recipeNames.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                )}
              </section>
            )}

            <section className="card">
              <h3>Lifecycle</h3>
              <ol className="lifecycle">
                {STATUSES.map((s) => {
                  const idx = STATUSES.indexOf(selected.status)
                  const here = STATUSES.indexOf(s)
                  const state = here < idx ? 'done' : here === idx ? 'current' : 'pending'
                  return <li key={s} className={`step step-${state}`}>{trayStatusLabel[s]}</li>
                })}
              </ol>
              {NEXT_ACTION[selected.status] && (
                <div className="actions">
                  <button className="primary" onClick={() => transition(selected)} disabled={busy}>
                    {busy ? 'Working…' : NEXT_ACTION[selected.status]!.label}
                  </button>
                </div>
              )}
            </section>

            <section className="card">
              <h3>History</h3>
              {history.length === 0 ? (
                <p className="muted">No transitions yet.</p>
              ) : (
                <ul className="history">
                  {history.map((h, i) => (
                    <li key={i}>
                      <span className="history-time">{new Date(h.transitioned_at).toLocaleString()}</span>
                      <span>{h.from_status ? trayStatusLabel[h.from_status] : '—'} → <strong>{trayStatusLabel[h.to_status]}</strong></span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
