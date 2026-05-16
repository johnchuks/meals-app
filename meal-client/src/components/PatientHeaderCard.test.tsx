import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PatientHeaderCard from './PatientHeaderCard'
import type { Patient } from '../types'

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    date_of_birth: '1990-01-01',
    mrn: 'MRN-1',
    diet: 'REGULAR',
    admitted_at: '2024-01-15T10:00:00Z',
    current_clinical_state: 'ADMITTED',
    allergies: [],
    ...overrides,
  }
}

describe('PatientHeaderCard', () => {
  it('renders the patient name, MRN and DOB', () => {
    render(<PatientHeaderCard patient={makePatient()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ada Lovelace')
    expect(screen.getByText(/MRN MRN-1/)).toBeInTheDocument()
    expect(screen.getByText(/DOB 1990-01-01/)).toBeInTheDocument()
  })

  it('renders the clinical state badge with a state-* class', () => {
    const { container } = render(
      <PatientHeaderCard patient={makePatient({ current_clinical_state: 'DISCHARGED' })} />,
    )
    const badge = container.querySelector('.status-badge')
    expect(badge).not.toBeNull()
    expect(badge?.className).toContain('state-discharged')
    expect(badge).toHaveTextContent(/discharged/i)
  })
})
