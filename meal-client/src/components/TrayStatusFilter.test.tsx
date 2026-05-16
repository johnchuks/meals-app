import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrayStatusFilter from './TrayStatusFilter'
import { TRAY_STATUS_PIPELINE } from '../domain/trayWorkflow'

describe('TrayStatusFilter', () => {
  it('renders an option for ALL plus every pipeline status', () => {
    render(<TrayStatusFilter value="ALL" onChange={() => {}} />)
    const allOptions = screen.getAllByRole('option')
    expect(allOptions).toHaveLength(TRAY_STATUS_PIPELINE.length + 1)
    expect(screen.getByRole('option', { name: /all statuses/i })).toBeInTheDocument()
  })

  it('marks the current value as selected', () => {
    render(<TrayStatusFilter value="EN_ROUTE" onChange={() => {}} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('EN_ROUTE')
  })

  it('calls onChange with the selected status', async () => {
    const onChange = vi.fn()
    render(<TrayStatusFilter value="ALL" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DELIVERED')
    expect(onChange).toHaveBeenCalledWith('DELIVERED')
  })
})
