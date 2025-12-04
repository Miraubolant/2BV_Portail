import { Transmit } from '@adonisjs/transmit-client'
import { useEffect, useRef } from 'react'

// Singleton instance for the Transmit client
let transmitInstance: Transmit | null = null

function getTransmit(): Transmit {
  if (!transmitInstance) {
    transmitInstance = new Transmit({
      baseUrl: window.location.origin,
    })
  }
  return transmitInstance
}

interface ClientData {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string | null
  type: string
  actif: boolean
  peutUploader: boolean
  peutDemanderRdv: boolean
  responsableId: string | null
  responsable: {
    id: string
    username: string | null
    nom: string
    prenom: string
  } | null
  createdAt: string
}

interface ClientUpdateEvent {
  type: 'client:updated'
  client: ClientData
}

/**
 * Hook pour ecouter les mises a jour des clients en temps reel
 */
export function useClientUpdates(
  onClientUpdated: (client: ClientData) => void
) {
  const subscriptionRef = useRef<ReturnType<Transmit['subscription']> | null>(null)

  useEffect(() => {
    const transmit = getTransmit()
    const subscription = transmit.subscription('admin/clients')
    subscriptionRef.current = subscription

    subscription.create()

    subscription.onMessage((data: ClientUpdateEvent) => {
      if (data.type === 'client:updated') {
        onClientUpdated(data.client)
      }
    })

    return () => {
      subscription.delete()
    }
  }, [onClientUpdated])
}
