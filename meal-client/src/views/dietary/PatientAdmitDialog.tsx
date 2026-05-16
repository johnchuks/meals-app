import { useState } from 'react'
import { api } from '../../api'
import type { DietType, Patient } from '../../types'
import { DIET_TYPES } from '../../types'
import { dietLabel } from '../../labels'

interface PatientAdmitDialogProps {
  onClose: () => void
  onAdmitted: (patient: Patient) => void
  onError: (message: string) => void
}

interface AdmitFormState {
  first_name: string
  last_name: string
  date_of_birth: string
  mrn: string
  diet: DietType
}

const EMPTY_ADMIT_FORM: AdmitFormState = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  mrn: '',
  diet: 'REGULAR',
}

export default function PatientAdmitDialog({
  onClose,
  onAdmitted,
  onError,
}: PatientAdmitDialogProps) {
  const [admitForm, setAdmitForm] = useState<AdmitFormState>(EMPTY_ADMIT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitAdmitForm(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const admittedPatient = await api<Patient>('/patients', {
        method: 'POST',
        body: JSON.stringify(admitForm),
      })
      onAdmitted(admittedPatient)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to admit patient')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submitAdmitForm}>
        <h3>Admit patient</h3>
        <div className="row">
          <label className="field">
            <span>First name</span>
            <input
              value={admitForm.first_name}
              onChange={(e) => setAdmitForm({ ...admitForm, first_name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Last name</span>
            <input
              value={admitForm.last_name}
              onChange={(e) => setAdmitForm({ ...admitForm, last_name: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="row">
          <label className="field">
            <span>Date of birth</span>
            <input
              type="date"
              value={admitForm.date_of_birth}
              onChange={(e) => setAdmitForm({ ...admitForm, date_of_birth: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>MRN</span>
            <input
              value={admitForm.mrn}
              onChange={(e) => setAdmitForm({ ...admitForm, mrn: e.target.value })}
              required
            />
          </label>
        </div>
        <label className="field">
          <span>Diet</span>
          <select
            value={admitForm.diet}
            onChange={(e) => setAdmitForm({ ...admitForm, diet: e.target.value as DietType })}
          >
            {DIET_TYPES.map((diet) => (
              <option key={diet} value={diet}>{dietLabel[diet]}</option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Admitting…' : 'Admit'}
          </button>
        </div>
      </form>
    </div>
  )
}
