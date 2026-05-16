import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorBanner message={null} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('displays the message text when given a message', () => {
    render(<ErrorBanner message="Something failed" onDismiss={() => {}} />)
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('calls onDismiss when the banner is clicked', async () => {
    const onDismiss = vi.fn()
    render(<ErrorBanner message="Click me" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByText('Click me'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
