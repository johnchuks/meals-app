import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrayTransitionHistory from './TrayTransitionHistory'

describe('TrayTransitionHistory', () => {
  it('shows an empty-state message when there are no transitions', () => {
    render(<TrayTransitionHistory transitions={[]} />)
    expect(screen.getByText(/no transitions yet/i)).toBeInTheDocument()
  })

  it('renders an entry per transition and shows the new status in bold', () => {
    render(
      <TrayTransitionHistory
        transitions={[
          {
            from_status: null,
            to_status: 'CREATED',
            transitioned_at: '2024-01-01T10:00:00Z',
          },
          {
            from_status: 'CREATED',
            to_status: 'PREPARATION_STARTED',
            transitioned_at: '2024-01-01T10:05:00Z',
          },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    // The most recent transition mentions the new status as a <strong>.
    expect(screen.getByText('In preparation')).toBeInTheDocument()
  })
})
