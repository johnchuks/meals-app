import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Recipe, Tray, TrayHistory } from '../types'
import SidebarContentLayout from '../components/SidebarContentLayout'
import { NEXT_TRANSITION_BY_STATUS } from '../domain/trayWorkflow'
import { useTrayPatientContexts } from '../hooks/useTrayPatientContexts'
import TrayStatusFilter, { type TrayStatusFilterValue } from './kitchen/TrayStatusFilter'
import TraySidebarItem from './kitchen/TraySidebarItem'
import TrayDetailPanel from './kitchen/TrayDetailPanel'

export default function KitchenApp() {
  const [trays, setTrays] = useState<Tray[]>([])
  const [statusFilter, setStatusFilter] = useState<TrayStatusFilterValue>('ALL')
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null)
  const [selectedTrayHistory, setSelectedTrayHistory] = useState<TrayHistory[]>([])
  const [recipeById, setRecipeById] = useState<Record<string, Recipe>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoadingTrays, setIsLoadingTrays] = useState(true)
  const [isAdvancingTray, setIsAdvancingTray] = useState(false)

  const { contextsByTrayId, ensureContextsLoaded } = useTrayPatientContexts()

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const recipes = await api<Recipe[]>('/recipes')
        if (!isMounted) return
        const byId: Record<string, Recipe> = {}
        for (const recipe of recipes) byId[recipe.id] = recipe
        setRecipeById(byId)
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load recipes')
        }
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  async function fetchTraysForCurrentFilter() {
    setIsLoadingTrays(true)
    try {
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`
      const fetchedTrays = await api<Tray[]>(`/trays${query}`)
      setTrays(fetchedTrays)
      await ensureContextsLoaded(fetchedTrays)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load trays')
    } finally {
      setIsLoadingTrays(false)
    }
  }

  useEffect(() => {
    fetchTraysForCurrentFilter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function selectTrayAndLoadHistory(trayId: string) {
    setSelectedTrayId(trayId)
    try {
      const history = await api<TrayHistory[]>(`/trays/${trayId}/status-history`)
      setSelectedTrayHistory(history)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load history')
    }
  }

  async function advanceTrayToNextStatus(tray: Tray) {
    const transition = NEXT_TRANSITION_BY_STATUS[tray.status]
    if (!transition) return
    setIsAdvancingTray(true)
    try {
      const updatedTray = await api<Tray>(`/trays/${tray.id}/${transition.apiPath}`, {
        method: 'POST',
      })
      setTrays((list) => list.map((t) => (t.id === updatedTray.id ? updatedTray : t)))
      if (selectedTrayId === tray.id) {
        const refreshedHistory = await api<TrayHistory[]>(`/trays/${tray.id}/status-history`)
        setSelectedTrayHistory(refreshedHistory)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Transition failed')
    } finally {
      setIsAdvancingTray(false)
    }
  }

  const selectedTray = trays.find((t) => t.id === selectedTrayId) ?? null
  const selectedTrayContext = selectedTray ? contextsByTrayId[selectedTray.id] : undefined

  const sidebar = (
    <>
      <div className="sidebar-head">
        <h2>Trays</h2>
        <button className="link small" onClick={fetchTraysForCurrentFilter}>Refresh</button>
      </div>
      <TrayStatusFilter value={statusFilter} onChange={setStatusFilter} />

      {isLoadingTrays ? (
        <p className="muted small-pad">Loading…</p>
      ) : trays.length === 0 ? (
        <p className="muted small-pad">No trays.</p>
      ) : (
        <ul className="patient-list">
          {trays.map((tray) => (
            <TraySidebarItem
              key={tray.id}
              tray={tray}
              patientContext={contextsByTrayId[tray.id]}
              recipeById={recipeById}
              isSelected={tray.id === selectedTrayId}
              onSelect={() => selectTrayAndLoadHistory(tray.id)}
            />
          ))}
        </ul>
      )}
    </>
  )

  const content = !selectedTray ? (
    <div className="empty"><p>Select a tray to manage.</p></div>
  ) : (
    <TrayDetailPanel
      tray={selectedTray}
      patientContext={selectedTrayContext}
      recipeById={recipeById}
      transitionHistory={selectedTrayHistory}
      isAdvancing={isAdvancingTray}
      onAdvanceToNextStatus={() => advanceTrayToNextStatus(selectedTray)}
    />
  )

  return (
    <SidebarContentLayout
      sidebar={sidebar}
      content={content}
      errorMessage={errorMessage}
      onDismissError={() => setErrorMessage(null)}
    />
  )
}
