interface ErrorBannerProps {
  message: string | null
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null
  return (
    <div className="banner-error" onClick={onDismiss}>
      {message}
    </div>
  )
}
