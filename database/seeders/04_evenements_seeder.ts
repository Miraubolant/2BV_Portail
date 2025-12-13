import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Dossier from '#models/dossier'
import Evenement from '#models/evenement'
import Admin from '#models/admin'

export default class EvenementsSeeder extends BaseSeeder {
  async run() {
    const admin = await Admin.first()

    if (!admin) {
      console.log('Aucun admin trouve. Executez d\'abord le seeder admin.')
      return
    }

    // Recuperer tous les dossiers sans evenements
    const dossiers = await Dossier.query()
      .preload('client')
      .preload('evenements')

    const dossiersWithoutEvents = dossiers.filter((d) => d.evenements.length === 0)

    if (dossiersWithoutEvents.length === 0) {
      console.log('Tous les dossiers ont deja des evenements, seeder ignore')
      return
    }

    console.log(`Creation d'evenements pour ${dossiersWithoutEvents.length} dossier(s)...`)

    let totalEvents = 0

    for (let i = 0; i < dossiersWithoutEvents.length; i++) {
      const dossier = dossiersWithoutEvents[i]
      const clientName = dossier.client?.fullName || 'Client Inconnu'

      const evenementsData = getEvenementsForDossier(
        i,
        {
          intitule: dossier.intitule,
          juridiction: dossier.juridiction || 'Tribunal',
          typeAffaire: dossier.typeAffaire || 'civil',
        },
        dossier.id,
        admin.id
      )

      for (const evtData of evenementsData) {
        await Evenement.create(evtData)
      }

      totalEvents += evenementsData.length
      console.log(`  - ${dossier.reference} (${clientName}): ${evenementsData.length} evenements`)
    }

    console.log('')
    console.log(`${totalEvents} evenements crees pour ${dossiersWithoutEvents.length} dossiers!`)
  }
}

/**
 * Genere des evenements realistes pour un dossier
 */
function getEvenementsForDossier(
  index: number,
  dossierData: { intitule: string; juridiction: string; typeAffaire: string },
  dossierId: string,
  adminId: string
) {
  const now = DateTime.now()
  const evenements: Array<{
    dossierId: string
    titre: string
    description: string | null
    type: string
    dateDebut: DateTime
    dateFin: DateTime
    journeeEntiere: boolean
    lieu: string | null
    adresse: string | null
    statut: string
    syncGoogle: boolean
    rappelJ7: boolean
    rappelJ1: boolean
    rappelEnvoye: boolean
    createdById: string
  }> = []

  // Evenement passe: RDV client initial (il y a 2-4 semaines)
  const rdvInitialDate = now.minus({ days: 14 + Math.floor(Math.random() * 14) })
  evenements.push({
    dossierId,
    titre: `RDV initial - ${dossierData.intitule.split(' - ')[0]}`,
    description: 'Premier rendez-vous pour etudier le dossier et definir la strategie',
    type: 'rdv_client',
    dateDebut: rdvInitialDate.set({ hour: 10, minute: 0 }),
    dateFin: rdvInitialDate.set({ hour: 11, minute: 0 }),
    journeeEntiere: false,
    lieu: 'Cabinet',
    adresse: null,
    statut: 'termine',
    syncGoogle: false,
    rappelJ7: true,
    rappelJ1: true,
    rappelEnvoye: true,
    createdById: adminId,
  })

  // Evenement passe ou proche: Echeance procedure
  const echeanceDate = now.plus({ days: -3 + index })
  evenements.push({
    dossierId,
    titre: `Echeance conclusions`,
    description: `Date limite pour le depot des conclusions`,
    type: 'echeance',
    dateDebut: echeanceDate.set({ hour: 0, minute: 0 }),
    dateFin: echeanceDate.set({ hour: 23, minute: 59 }),
    journeeEntiere: true,
    lieu: null,
    adresse: null,
    statut: echeanceDate < now ? 'termine' : 'confirme',
    syncGoogle: false,
    rappelJ7: true,
    rappelJ1: true,
    rappelEnvoye: echeanceDate < now,
    createdById: adminId,
  })

  // Evenement futur: Audience
  const audienceDate = now.plus({ days: 7 + index * 5 })
  const audienceHour = 9 + (index % 4) * 2
  evenements.push({
    dossierId,
    titre: `Audience - ${dossierData.juridiction}`,
    description: `Audience de plaidoirie devant ${dossierData.juridiction}`,
    type: 'audience',
    dateDebut: audienceDate.set({ hour: audienceHour, minute: 0 }),
    dateFin: audienceDate.set({ hour: audienceHour + 2, minute: 0 }),
    journeeEntiere: false,
    lieu: dossierData.juridiction,
    adresse: getAdresseJuridiction(dossierData.juridiction),
    statut: 'confirme',
    syncGoogle: true,
    rappelJ7: true,
    rappelJ1: true,
    rappelEnvoye: false,
    createdById: adminId,
  })

  // Evenement futur: RDV client de suivi
  const rdvSuiviDate = now.plus({ days: 3 + Math.floor(Math.random() * 7) })
  evenements.push({
    dossierId,
    titre: `RDV suivi dossier`,
    description: 'Point sur l\'avancement du dossier et preparation de l\'audience',
    type: 'rdv_client',
    dateDebut: rdvSuiviDate.set({ hour: 14 + (index % 4), minute: index % 2 === 0 ? 0 : 30 }),
    dateFin: rdvSuiviDate.set({ hour: 15 + (index % 4), minute: index % 2 === 0 ? 0 : 30 }),
    journeeEntiere: false,
    lieu: 'Cabinet',
    adresse: null,
    statut: 'confirme',
    syncGoogle: true,
    rappelJ7: false,
    rappelJ1: true,
    rappelEnvoye: false,
    createdById: adminId,
  })

  // Evenement specifique selon le type d'affaire
  if (dossierData.typeAffaire === 'famille') {
    const mediationDate = now.plus({ days: 20 + index * 3 })
    evenements.push({
      dossierId,
      titre: 'Seance de mediation',
      description: 'Mediation familiale pour tenter un accord amiable',
      type: 'mediation',
      dateDebut: mediationDate.set({ hour: 14, minute: 0 }),
      dateFin: mediationDate.set({ hour: 16, minute: 0 }),
      journeeEntiere: false,
      lieu: 'Centre de mediation',
      adresse: null,
      statut: 'en_attente',
      syncGoogle: true,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: adminId,
    })
  } else if (dossierData.typeAffaire === 'social') {
    const conciliationDate = now.plus({ days: 15 + index * 2 })
    evenements.push({
      dossierId,
      titre: 'Audience de conciliation',
      description: 'Tentative de conciliation devant le bureau de conciliation',
      type: 'audience',
      dateDebut: conciliationDate.set({ hour: 9, minute: 30 }),
      dateFin: conciliationDate.set({ hour: 10, minute: 30 }),
      journeeEntiere: false,
      lieu: 'Conseil de Prud\'hommes',
      adresse: null,
      statut: 'confirme',
      syncGoogle: true,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: adminId,
    })
  } else if (dossierData.typeAffaire === 'penal') {
    const expertiseDate = now.plus({ days: 10 + index })
    evenements.push({
      dossierId,
      titre: 'Audition commissariat',
      description: 'Audition dans le cadre de l\'enquete',
      type: 'autre',
      dateDebut: expertiseDate.set({ hour: 10, minute: 0 }),
      dateFin: expertiseDate.set({ hour: 12, minute: 0 }),
      journeeEntiere: false,
      lieu: 'Commissariat',
      adresse: null,
      statut: 'confirme',
      syncGoogle: false,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: adminId,
    })
  }

  return evenements
}

function getAdresseJuridiction(juridiction: string): string {
  if (juridiction.includes('Paris')) {
    return '4 boulevard du Palais, 75001 Paris'
  } else if (juridiction.includes('Lyon')) {
    return '67 rue Servient, 69003 Lyon'
  } else if (juridiction.includes('Marseille')) {
    return '6 rue Joseph Autran, 13006 Marseille'
  } else if (juridiction.includes('Toulouse')) {
    return '2 allee Jules Guesde, 31000 Toulouse'
  } else if (juridiction.includes('Lille')) {
    return '1 place du Palais de Justice, 59000 Lille'
  } else if (juridiction.includes('Bordeaux')) {
    return '30 rue des Freres Bonie, 33000 Bordeaux'
  } else if (juridiction.includes('Nantes')) {
    return '2 quai Francois Mitterrand, 44000 Nantes'
  }
  return 'Palais de Justice'
}
