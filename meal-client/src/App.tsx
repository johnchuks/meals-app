import { useEffect, useState } from 'react'
import { AUTH_EXPIRED_EVENT, auth } from './api'
import type { UserRole } from './types'
import { roleLabel } from './labels'
import Login from './views/Login'
import DietaryApp from './views/DietaryApp'
import KitchenApp from './views/KitchenApp'

export default function App() {
  const [role, setRole] = useState<UserRole | null>(auth.getRole())

  useEffect(() => {
    const handler = () => setRole(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, handler)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler)
  }, [])

  const onLogin = (r: UserRole) => setRole(r)
  const onLogout = () => {
    auth.clear()
    setRole(null)
  }

  if (!role) return <Login onLogin={onLogin} />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Meals</div>
        <div className="topbar-right">
          <span className="role-pill">{roleLabel[role]}</span>
          <button className="link" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="main">
        {role === 'DIETARY_STAFF' ? <DietaryApp /> : <KitchenApp />}
      </main>
    </div>
  )
}
