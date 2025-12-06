import { useState, useEffect, useCallback } from 'react'

interface AdminUser {
  id: string
  email: string
  nom: string
  prenom: string
  username: string | null
  role: 'super_admin' | 'admin'
  totpEnabled: boolean
  notifEmailDocument: boolean
  emailNotification: string | null
  filterByResponsable: boolean
}

interface AdminAuthState {
  user: AdminUser | null
  loading: boolean
  error: string | null
}

// Cache global pour eviter des requetes multiples
let cachedUser: AdminUser | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: cachedUser,
    loading: !cachedUser,
    error: null,
  })

  const fetchUser = useCallback(async (force = false) => {
    // Utiliser le cache si valide
    if (!force && cachedUser && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setState({ user: cachedUser, loading: false, error: null })
      return
    }

    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        if (result.user) {
          cachedUser = result.user
          cacheTimestamp = Date.now()
          setState({ user: result.user, loading: false, error: null })
        } else {
          setState({ user: null, loading: false, error: 'Non authentifie' })
        }
      } else {
        setState({ user: null, loading: false, error: 'Erreur de chargement' })
      }
    } catch (error) {
      console.error('Error fetching admin auth:', error)
      setState({ user: null, loading: false, error: 'Erreur de connexion' })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Fonction pour invalider le cache et recharger
  const refresh = useCallback(() => {
    cachedUser = null
    cacheTimestamp = 0
    fetchUser(true)
  }, [fetchUser])

  return {
    ...state,
    refresh,
    isSuperAdmin: state.user?.role === 'super_admin',
    filterByResponsable: state.user?.filterByResponsable ?? false,
    adminId: state.user?.id ?? null,
  }
}

// Fonction utilitaire pour invalider le cache depuis l'exterieur
export function invalidateAdminAuthCache() {
  cachedUser = null
  cacheTimestamp = 0
}
