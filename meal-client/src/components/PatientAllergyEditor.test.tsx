import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatientAllergyEditor from './PatientAllergyEditor'
import type { Allergy } from '../types'

function makeAllergy(overrides: Partial<Allergy> = {}): Allergy {
  return {
    id: 'a-1',
    allergen: 'PEANUTS',
    severity: 'SEVERE',
    recorded_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('PatientAllergyEditor', () => {
  it('shows an empty-state message when no allergies are recorded', () => {
    render(
      <PatientAllergyEditor
        allergies={[]}
        onAddAllergy={() => {}}
        onRemoveAllergy={() => {}}
      />,
    )
    expect(screen.getByText(/none recorded/i)).toBeInTheDocument()
  })

  it('renders one tag per recorded allergy with the severity', () => {
    render(
      <PatientAllergyEditor
        allergies={[makeAllergy()]}
        onAddAllergy={() => {}}
        onRemoveAllergy={() => {}}
      />,
    )
    expect(screen.getByText(/peanuts \(severe\)/i)).toBeInTheDocument()
  })

  it('excludes already-recorded allergens from the picker dropdown', () => {
    render(
      <PatientAllergyEditor
        allergies={[makeAllergy({ allergen: 'PEANUTS' })]}
        onAddAllergy={() => {}}
        onRemoveAllergy={() => {}}
      />,
    )
    const select = screen.getByRole('combobox')
    const optionLabels = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(optionLabels).not.toContain('Peanuts')
  })

  it('calls onAddAllergy with the selected allergen and severity', async () => {
    const onAddAllergy = vi.fn()
    render(
      <PatientAllergyEditor
        allergies={[]}
        onAddAllergy={onAddAllergy}
        onRemoveAllergy={() => {}}
      />,
    )
    await userEvent.selectOptions(screen.getByRole('combobox'), 'MILK')
    await userEvent.type(screen.getByPlaceholderText(/severity/i), 'MILD')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onAddAllergy).toHaveBeenCalledWith('MILK', 'MILD')
  })

  it('passes null severity when the severity field is left blank', async () => {
    const onAddAllergy = vi.fn()
    render(
      <PatientAllergyEditor
        allergies={[]}
        onAddAllergy={onAddAllergy}
        onRemoveAllergy={() => {}}
      />,
    )
    await userEvent.selectOptions(screen.getByRole('combobox'), 'MILK')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onAddAllergy).toHaveBeenCalledWith('MILK', null)
  })

  it('calls onRemoveAllergy with the allergy id when the remove button is clicked', async () => {
    const onRemoveAllergy = vi.fn()
    render(
      <PatientAllergyEditor
        allergies={[makeAllergy({ id: 'a-42' })]}
        onAddAllergy={() => {}}
        onRemoveAllergy={onRemoveAllergy}
      />,
    )
    await userEvent.click(screen.getByLabelText(/remove/i))
    expect(onRemoveAllergy).toHaveBeenCalledWith('a-42')
  })
})
