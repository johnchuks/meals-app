import type { Patient } from '../types'
import { clinicalStateLabel } from '../labels'
import { formatIsoAsLocalDateTime } from '../utils/datetime'

interface PatientHeaderCardProps {
  patient: Patient
}

export default function PatientHeaderCard({ patient }: PatientHeaderCardProps) {
  return (
    <header className="detail-head">
      <div>
        <h2>{patient.first_name} {patient.last_name}</h2>
        <p className="muted">MRN {patient.mrn} · DOB {patient.date_of_birth}</p>
        <p className="muted">Admitted {formatIsoAsLocalDateTime(patient.admitted_at)}</p>
      </div>
      <div className={`status-badge state-${patient.current_clinical_state.toLowerCase()}`}>
        {clinicalStateLabel[patient.current_clinical_state]}
      </div>
    </header>
  )
}
