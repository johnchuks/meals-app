import { useEffect, useState } from 'react'
import { AUTH_EXPIRED_EVENT, auth, type SignedInSession } from './api'
import { roleLabel } from './labels'
import Login from './views/Login'
import DietaryApp from './views/DietaryApp'
import KitchenApp from './views/KitchenApp'

export default function App() {
  const [session, setSession] = useState<SignedInSession | null>(auth.getSession())

  useEffect(() => {
    const handler = () => setSession(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler)
  }, [])

  const onLogin = (signedIn: SignedInSession) => setSession(signedIn)
  const onLogout = () => {
    auth.clear()
    setSession(null)
  }

  if (!session) return <Login onLogin={onLogin} />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Meals</div>
        <div className="topbar-right">
          <span className="user-name">{session.username}</span>
          <span className="role-pill">{roleLabel[session.role]}</span>
          <button className="link" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="main">
        {session.role === 'DIETARY_STAFF' ? <DietaryApp /> : <KitchenApp />}
      </main>
    </div>
  )
}
