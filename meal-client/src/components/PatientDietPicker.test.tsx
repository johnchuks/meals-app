import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PatientDietPicker from './PatientDietPicker'
import { DIET_TYPES } from '../types'

describe('PatientDietPicker', () => {
  it('renders a chip per diet and highlights the current one', () => {
    render(<PatientDietPicker currentDiet="VEGAN" onSelectDiet={() => {}} />)
    const chips = screen.getAllByRole('button')
    expect(chips).toHaveLength(DIET_TYPES.length)
    const activeChips = chips.filter((c) => c.className.includes('chip-active'))
    expect(activeChips).toHaveLength(1)
    expect(activeChips[0]).toHaveTextContent(/vegan/i)
  })

  it('calls onSelectDiet when picking a different diet', async () => {
    const onSelectDiet = vi.fn()
    render(<PatientDietPicker currentDiet="REGULAR" onSelectDiet={onSelectDiet} />)
    await userEvent.click(screen.getByRole('button', { name: /vegan/i }))
    expect(onSelectDiet).toHaveBeenCalledWith('VEGAN')
  })

  it('does not call onSelectDiet when clicking the already-selected diet', async () => {
    const onSelectDiet = vi.fn()
    render(<PatientDietPicker currentDiet="VEGAN" onSelectDiet={onSelectDiet} />)
    await userEvent.click(screen.getByRole('button', { name: /vegan/i }))
    expect(onSelectDiet).not.toHaveBeenCalled()
  })
})
