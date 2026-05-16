import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MealRequestComposer from './MealRequestComposer'
import type { Recipe } from '../types'

function makeRecipe(id: string, name: string): Recipe {
  return {
    id,
    name,
    description: '',
    active: true,
    created_at: '',
    allergens: [],
    compatible_diets: ['REGULAR'],
  }
}

describe('MealRequestComposer', () => {
  it('renders one entry per recipe with its name', () => {
    render(
      <MealRequestComposer
        recipes={[makeRecipe('r1', 'Soup'), makeRecipe('r2', 'Salad')]}
        pickedRecipeIds={new Set()}
        isCreatingDraft={false}
        onToggleRecipe={() => {}}
        onCreateDraft={() => {}}
      />,
    )
    expect(screen.getByText('Soup')).toBeInTheDocument()
    expect(screen.getByText('Salad')).toBeInTheDocument()
  })

  it('disables the create-draft button when no recipes are picked', () => {
    render(
      <MealRequestComposer
        recipes={[makeRecipe('r1', 'Soup')]}
        pickedRecipeIds={new Set()}
        isCreatingDraft={false}
        onToggleRecipe={() => {}}
        onCreateDraft={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /create draft/i })).toBeDisabled()
  })

  it('enables the button and shows the picked count when recipes are picked', () => {
    render(
      <MealRequestComposer
        recipes={[makeRecipe('r1', 'Soup')]}
        pickedRecipeIds={new Set(['r1'])}
        isCreatingDraft={false}
        onToggleRecipe={() => {}}
        onCreateDraft={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /create draft \(1\)/i })
    expect(button).toBeEnabled()
  })

  it('calls onToggleRecipe with the recipe id when its row is clicked', async () => {
    const onToggleRecipe = vi.fn()
    render(
      <MealRequestComposer
        recipes={[makeRecipe('r1', 'Soup')]}
        pickedRecipeIds={new Set()}
        isCreatingDraft={false}
        onToggleRecipe={onToggleRecipe}
        onCreateDraft={() => {}}
      />,
    )
    await userEvent.click(screen.getByText('Soup'))
    expect(onToggleRecipe).toHaveBeenCalledWith('r1')
  })

  it('shows the busy label while a draft is being created', () => {
    render(
      <MealRequestComposer
        recipes={[makeRecipe('r1', 'Soup')]}
        pickedRecipeIds={new Set(['r1'])}
        isCreatingDraft={true}
        onToggleRecipe={() => {}}
        onCreateDraft={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: /creating/i })
    expect(button).toBeDisabled()
  })
})
