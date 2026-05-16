import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrayLifecycleProgress from './TrayLifecycleProgress'

describe('TrayLifecycleProgress', () => {
  it('renders one step per pipeline status and classifies them against current', () => {
    const { container } = render(
      <TrayLifecycleProgress
        currentStatus="EN_ROUTE"
        isAdvancing={false}
        onAdvanceToNextStatus={() => {}}
      />,
    )
    expect(container.querySelectorAll('.step-done')).toHaveLength(3)
    expect(container.querySelectorAll('.step-current')).toHaveLength(1)
    expect(container.querySelectorAll('.step-pending')).toHaveLength(2)
  })

  it('shows the advance button labeled with the next transition', () => {
    render(
      <TrayLifecycleProgress
        currentStatus="CREATED"
        isAdvancing={false}
        onAdvanceToNextStatus={() => {}}
      />,
    )
    expect(
      screen.getByRole('button', { name: /start preparation/i }),
    ).toBeInTheDocument()
  })

  it('hides the advance button at the terminal status', () => {
    render(
      <TrayLifecycleProgress
        currentStatus="RETRIEVED"
        isAdvancing={false}
        onAdvanceToNextStatus={() => {}}
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows Working… and disables the button while advancing', () => {
    render(
      <TrayLifecycleProgress
        currentStatus="CREATED"
        isAdvancing={true}
        onAdvanceToNextStatus={() => {}}
      />,
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/working/i)
  })

  it('calls onAdvanceToNextStatus when clicked', async () => {
    const onAdvance = vi.fn()
    render(
      <TrayLifecycleProgress
        currentStatus="CREATED"
        isAdvancing={false}
        onAdvanceToNextStatus={onAdvance}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })
})
