import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react'
import { UnifiedAddModal } from '@/components/admin/unified-add-modal'

type CreationType = 'client' | 'dossier' | 'evenement'
type CreationCallback = (type: CreationType, data: any) => void

interface UnifiedModalContextType {
  openModal: (options?: {
    tab?: CreationType
    clientId?: string
    dossierId?: string
  }) => void
  closeModal: () => void
  subscribeToCreation: (callback: CreationCallback) => () => void
}

const UnifiedModalContext = createContext<UnifiedModalContextType | null>(null)

export function UnifiedModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<CreationType>('client')
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>()
  const [preselectedDossierId, setPreselectedDossierId] = useState<string | undefined>()
  const subscribersRef = useRef<Set<CreationCallback>>(new Set())

  const openModal = useCallback((options?: {
    tab?: CreationType
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

  const subscribeToCreation = useCallback((callback: CreationCallback) => {
    subscribersRef.current.add(callback)
    return () => {
      subscribersRef.current.delete(callback)
    }
  }, [])

  const handleSuccess = useCallback((type: CreationType, data: any) => {
    // Notify all subscribers
    subscribersRef.current.forEach((callback) => {
      callback(type, data)
    })
  }, [])

  return (
    <UnifiedModalContext.Provider value={{ openModal, closeModal, subscribeToCreation }}>
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
