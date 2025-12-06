import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { UnifiedAddModal } from '@/components/admin/unified-add-modal'

interface UnifiedModalContextType {
  openModal: (options?: {
    tab?: 'client' | 'dossier' | 'evenement'
    clientId?: string
    dossierId?: string
  }) => void
  closeModal: () => void
}

const UnifiedModalContext = createContext<UnifiedModalContextType | null>(null)

export function UnifiedModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<'client' | 'dossier' | 'evenement'>('client')
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>()
  const [preselectedDossierId, setPreselectedDossierId] = useState<string | undefined>()

  const openModal = useCallback((options?: {
    tab?: 'client' | 'dossier' | 'evenement'
    clientId?: string
    dossierId?: string
  }) => {
    if (options?.tab) {
      setDefaultTab(options.tab)
    }
    if (options?.clientId) {
      setPreselectedClientId(options.clientId)
    }
    if (options?.dossierId) {
      setPreselectedDossierId(options.dossierId)
    }
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    // Reset states after close
    setTimeout(() => {
      setDefaultTab('client')
      setPreselectedClientId(undefined)
      setPreselectedDossierId(undefined)
    }, 200)
  }, [])

  const handleSuccess = useCallback((type: 'client' | 'dossier' | 'evenement', _data: any) => {
    // Can emit events or refresh data here if needed
    console.log(`Created ${type}:`, _data)
  }, [])

  return (
    <UnifiedModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <UnifiedAddModal
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
        defaultTab={defaultTab}
        preselectedClientId={preselectedClientId}
        preselectedDossierId={preselectedDossierId}
        onSuccess={handleSuccess}
      />
    </UnifiedModalContext.Provider>
  )
}

export function useUnifiedModal() {
  const context = useContext(UnifiedModalContext)
  if (!context) {
    throw new Error('useUnifiedModal must be used within UnifiedModalProvider')
  }
  return context
}
