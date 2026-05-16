import type { ReactNode } from 'react'
import ErrorBanner from './ErrorBanner'

interface SidebarContentLayoutProps {
  sidebar: ReactNode
  content: ReactNode
  errorMessage: string | null
  onDismissError: () => void
}

export default function SidebarContentLayout({
  sidebar,
  content,
  errorMessage,
  onDismissError,
}: SidebarContentLayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">{sidebar}</aside>
      <section className="content">
        <ErrorBanner message={errorMessage} onDismiss={onDismissError} />
        {content}
      </section>
    </div>
  )
}
