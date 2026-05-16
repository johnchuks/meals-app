import { useState } from 'react'
import { api } from '../api'
import type { DietType, Patient } from '../types'
import { DIET_TYPES } from '../types'
import { clinicalStateLabel, dietLabel } from '../labels'

interface Props {
  patients: Patient[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreated: (p: Patient) => void
  onError: (msg: string) => void
}

export default function PatientList({ patients, selectedId, onSelect, onCreated, onError }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="sidebar-head">
        <h2>Patients</h2>
        <button className="primary small" onClick={() => setOpen(true)}>+ Admit</button>
      </div>

      {patients.length === 0 ? (
        <p className="muted small-pad">No patients yet. Admit one to get started.</p>
      ) : (
        <ul className="patient-list">
          {patients.map((p) => (
            <li
              key={p.id}
              className={p.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(p.id)}
            >
              <div className="patient-name">{p.first_name} {p.last_name}</div>
              <div className="patient-meta">MRN {p.mrn} · {dietLabel[p.diet]}</div>
              <div className="patient-meta">{clinicalStateLabel[p.current_clinical_state]}</div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <AdmitDialog
          onClose={() => setOpen(false)}
          onCreated={(p) => {
            onCreated(p)
            setOpen(false)
          }}
          onError={onError}
        />
      )}
    </>
  )
}

function AdmitDialog({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void
  onCreated: (p: Patient) => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    mrn: '',
    diet: 'REGULAR' as DietType,
  })
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const p = await api<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      onCreated(p)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to admit patient')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Admit patient</h3>
        <div className="row">
          <label className="field">
            <span>First name</span>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          </label>
          <label className="field">
            <span>Last name</span>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          </label>
        </div>
        <div className="row">
          <label className="field">
            <span>Date of birth</span>
            <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required />
          </label>
          <label className="field">
            <span>MRN</span>
            <input value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} required />
          </label>
        </div>
        <label className="field">
          <span>Diet</span>
          <select value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value as DietType })}>
            {DIET_TYPES.map((d) => <option key={d} value={d}>{dietLabel[d]}</option>)}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Admitting…' : 'Admit'}</button>
        </div>
      </form>
    </div>
  )
}
