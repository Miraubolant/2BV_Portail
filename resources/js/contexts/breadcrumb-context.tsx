import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbItem[]
  setBreadcrumbs: (crumbs: BreadcrumbItem[]) => void
  clearBreadcrumbs: () => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([])

  const setBreadcrumbs = useCallback((crumbs: BreadcrumbItem[]) => {
    setBreadcrumbsState(crumbs)
  }, [])

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbsState([])
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, clearBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}
