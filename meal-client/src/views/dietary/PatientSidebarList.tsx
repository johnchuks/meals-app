import { useState } from 'react'
import type { Patient } from '../../types'
import { clinicalStateLabel, dietLabel } from '../../labels'
import PatientAdmitDialog from './PatientAdmitDialog'

interface PatientSidebarListProps {
  patients: Patient[]
  selectedPatientId: string | null
  onSelectPatient: (patientId: string) => void
  onPatientAdmitted: (patient: Patient) => void
  onError: (message: string) => void
}

export default function PatientSidebarList({
  patients,
  selectedPatientId,
  onSelectPatient,
  onPatientAdmitted,
  onError,
}: PatientSidebarListProps) {
  const [isAdmitDialogOpen, setIsAdmitDialogOpen] = useState(false)

  return (
    <>
      <div className="sidebar-head">
        <h2>Patients</h2>
        <button className="primary small" onClick={() => setIsAdmitDialogOpen(true)}>
          + Admit
        </button>
      </div>

      {patients.length === 0 ? (
        <p className="muted small-pad">No patients yet. Admit one to get started.</p>
      ) : (
        <ul className="patient-list">
          {patients.map((patient) => (
            <li
              key={patient.id}
              className={patient.id === selectedPatientId ? 'selected' : ''}
              onClick={() => onSelectPatient(patient.id)}
            >
              <div className="patient-name">{patient.first_name} {patient.last_name}</div>
              <div className="patient-meta">
                MRN {patient.mrn} · {dietLabel[patient.diet]}
              </div>
              <div className="patient-meta">
                {clinicalStateLabel[patient.current_clinical_state]}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmitDialogOpen && (
        <PatientAdmitDialog
          onClose={() => setIsAdmitDialogOpen(false)}
          onAdmitted={(admittedPatient) => {
            onPatientAdmitted(admittedPatient)
            setIsAdmitDialogOpen(false)
          }}
          onError={onError}
        />
      )}
    </>
  )
}
