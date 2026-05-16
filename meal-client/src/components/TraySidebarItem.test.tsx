import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TraySidebarItem from './TraySidebarItem'
import type { Recipe, Tray } from '../types'
import type { TrayPatientContext } from '../hooks/useTrayPatientContexts'

function makeTray(overrides: Partial<Tray> = {}): Tray {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    meal_request_id: '22222222-2222-2222-2222-222222222222',
    status: 'CREATED',
    created_at: '2024-01-01T00:00:00Z',
    preparation_started_at: null,
    accuracy_validated_at: null,
    en_route_at: null,
    delivered_at: null,
    retrieved_at: null,
    ...overrides,
  }
}

function makeRecipeById(): Record<string, Recipe> {
  return {
    'recipe-1': {
      id: 'recipe-1',
      name: 'Soup',
      description: '',
      active: true,
      created_at: '',
      allergens: [],
      compatible_diets: ['REGULAR'],
    },
  }
}

function makeContext(): TrayPatientContext {
  return {
    mealRequest: {
      id: 'm1',
      patient_id: 'p1',
      status: 'FINALIZED',
      rejection_reason: null,
      finalized_at: null,
      created_at: '',
      updated_at: '',
      recipe_ids: ['recipe-1'],
    },
    patient: {
      id: 'p1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      date_of_birth: '1990-01-01',
      mrn: 'MRN-1',
      diet: 'VEGAN',
      admitted_at: '',
      current_clinical_state: 'ADMITTED',
      allergies: [],
    },
  }
}

const ulWrap = (child: React.ReactNode) => (
  <ul>{child}</ul>
)

describe('TraySidebarItem', () => {
  it('falls back to a tray id snippet when no patient context is loaded', () => {
    const tray = makeTray()
    render(
      ulWrap(
        <TraySidebarItem
          tray={tray}
          patientContext={undefined}
          recipeById={makeRecipeById()}
          isSelected={false}
          onSelect={() => {}}
        />,
      ),
    )
    expect(screen.getByText(/^Tray 11111111$/)).toBeInTheDocument()
  })

  it('shows patient name, diet, and recipe names when context is present', () => {
    render(
      ulWrap(
        <TraySidebarItem
          tray={makeTray()}
          patientContext={makeContext()}
          recipeById={makeRecipeById()}
          isSelected={false}
          onSelect={() => {}}
        />,
      ),
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Diet: Vegan')).toBeInTheDocument()
    expect(screen.getByText('Soup')).toBeInTheDocument()
  })

  it('applies the selected class when isSelected is true', () => {
    const { container } = render(
      ulWrap(
        <TraySidebarItem
          tray={makeTray()}
          patientContext={undefined}
          recipeById={{}}
          isSelected={true}
          onSelect={() => {}}
        />,
      ),
    )
    expect(container.querySelector('li.selected')).not.toBeNull()
  })

  it('calls onSelect when the item is clicked', async () => {
    const onSelect = vi.fn()
    render(
      ulWrap(
        <TraySidebarItem
          tray={makeTray()}
          patientContext={makeContext()}
          recipeById={makeRecipeById()}
          isSelected={false}
          onSelect={onSelect}
        />,
      ),
    )
    await userEvent.click(screen.getByText('Ada Lovelace'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
