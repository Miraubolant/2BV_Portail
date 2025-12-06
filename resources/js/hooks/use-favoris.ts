import { useEffect, useCallback } from 'react'

const FAVORIS_UPDATED_EVENT = 'favoris-updated'

/**
 * Dispatch an event to notify that favorites have been updated
 */
export function emitFavorisUpdated() {
  window.dispatchEvent(new CustomEvent(FAVORIS_UPDATED_EVENT))
}

/**
 * Hook to listen for favorites updates
 * @param callback Function to call when favorites are updated
 */
export function useFavorisUpdates(callback: () => void) {
  const handleUpdate = useCallback(() => {
    callback()
  }, [callback])

  useEffect(() => {
    window.addEventListener(FAVORIS_UPDATED_EVENT, handleUpdate)
    return () => {
      window.removeEventListener(FAVORIS_UPDATED_EVENT, handleUpdate)
    }
  }, [handleUpdate])
}
