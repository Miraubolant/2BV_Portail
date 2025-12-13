import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Client from '#models/client'
import Dossier from '#models/dossier'
import Evenement from '#models/evenement'
import Admin from '#models/admin'

export default class ClientsDossiersSeeder extends BaseSeeder {
  async run() {
    // Trouver un admin existant pour les relations
    const admin = await Admin.first()

    if (!admin) {
      console.log("Aucun admin trouve. Executez d'abord le seeder admin.")
      return
    }

    // Verifier si des clients existent deja
    const existingClients = await Client.query().count('* as total')
    const clientCount = Number(existingClients[0].$extras.total)

    if (clientCount >= 10) {
      console.log(`${clientCount} clients existent deja, seeder ignore`)
      return
    }

    console.log('Creation de 10 clients et dossiers de demonstration...')

    // Donnees de clients fictifs realistes
    const clientsData = [
      {
        civilite: 'M.',
        nom: 'Dupont',
        prenom: 'Jean-Pierre',
        email: 'jean-pierre.dupont@email.fr',
        telephone: '06 12 34 56 78',
        adresseLigne1: '15 rue de la Paix',
        codePostal: '75002',
        ville: 'Paris',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1975-03-15'),
        dossier: {
          intitule: 'Litige commercial SCI Dupont',
          typeAffaire: 'commercial',
          description: 'Contentieux avec un fournisseur pour non-livraison de marchandises',
          juridiction: 'Tribunal de Commerce de Paris',
          numeroRg: '2024/12345',
          adversaireNom: 'SARL TechnoPlus',
          adversaireAvocat: 'Me Martin',
          honorairesEstimes: 5000,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@email.fr',
        telephone: '06 23 45 67 89',
        adresseLigne1: '8 avenue des Champs-Elysees',
        codePostal: '75008',
        ville: 'Paris',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1982-07-22'),
        dossier: {
          intitule: 'Divorce Martin/Leroy',
          typeAffaire: 'famille',
          description: 'Procedure de divorce par consentement mutuel',
          juridiction: 'JAF Paris',
          numeroRg: '2024/FAM/789',
          adversaireNom: 'M. Philippe Leroy',
          adversaireAvocat: 'Me Dubois',
          honorairesEstimes: 3500,
        },
      },
      {
        civilite: 'M.',
        nom: 'Bernard',
        prenom: 'Michel',
        email: 'michel.bernard@entreprise.com',
        telephone: '06 34 56 78 90',
        adresseLigne1: '25 boulevard Haussmann',
        codePostal: '75009',
        ville: 'Paris',
        type: 'institutionnel' as const,
        societeNom: 'Bernard Consulting SARL',
        societeSiret: '12345678901234',
        societeFonction: 'Gerant',
        dossier: {
          intitule: 'Licenciement abusif - Dossier Bernard',
          typeAffaire: 'social',
          description: "Contestation d'un licenciement pour faute grave",
          juridiction: "Conseil de Prud'hommes Paris",
          numeroRg: '2024/PRH/456',
          adversaireNom: 'Groupe Industria SA',
          adversaireAvocat: 'Cabinet Lefebvre',
          honorairesEstimes: 4500,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Petit',
        prenom: 'Marie',
        email: 'marie.petit@gmail.com',
        telephone: '06 45 67 89 01',
        adresseLigne1: '42 rue du Commerce',
        codePostal: '69001',
        ville: 'Lyon',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1990-11-08'),
        dossier: {
          intitule: 'Accident de la circulation - Petit',
          typeAffaire: 'civil',
          description: 'Indemnisation suite a un accident de voiture avec blessures',
          juridiction: 'Tribunal Judiciaire de Lyon',
          numeroRg: '2024/CIV/321',
          adversaireNom: 'Assurance MutuelPlus',
          adversaireAvocat: 'Me Garnier',
          honorairesEstimes: 6000,
        },
      },
      {
        civilite: 'M.',
        nom: 'Lefevre',
        prenom: 'Thomas',
        email: 'thomas.lefevre@outlook.fr',
        telephone: '06 56 78 90 12',
        adresseLigne1: '10 place Bellecour',
        codePostal: '69002',
        ville: 'Lyon',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1988-04-30'),
        dossier: {
          intitule: 'Succession Lefevre',
          typeAffaire: 'civil',
          description: 'Reglement de succession contestee entre heritiers',
          juridiction: 'Tribunal Judiciaire de Lyon',
          numeroRg: '2024/SUC/159',
          adversaireNom: 'Mme Claire Lefevre',
          adversaireAvocat: 'Me Rousseau',
          honorairesEstimes: 8000,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Moreau',
        prenom: 'Catherine',
        email: 'catherine.moreau@wanadoo.fr',
        telephone: '06 67 89 01 23',
        adresseLigne1: '5 rue de la Republique',
        codePostal: '13001',
        ville: 'Marseille',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1970-09-12'),
        dossier: {
          intitule: 'Bail commercial - Moreau',
          typeAffaire: 'immobilier',
          description: 'Resiliation anticipee de bail commercial et recouvrement de loyers',
          juridiction: 'Tribunal de Commerce de Marseille',
          numeroRg: '2024/BC/753',
          adversaireNom: 'SCI Les Terrasses',
          adversaireAvocat: null,
          honorairesEstimes: 3000,
        },
      },
      {
        civilite: 'M.',
        nom: 'Garcia',
        prenom: 'Antoine',
        email: 'antoine.garcia@pro.fr',
        telephone: '06 78 90 12 34',
        adresseLigne1: '18 avenue Jean Jaures',
        codePostal: '31000',
        ville: 'Toulouse',
        type: 'institutionnel' as const,
        societeNom: 'Garcia & Associes',
        societeSiret: '98765432109876',
        societeFonction: 'Directeur',
        dossier: {
          intitule: 'Contrefacon marque - Garcia',
          typeAffaire: 'propriete_intellectuelle',
          description: 'Action en contrefacon de marque deposee',
          juridiction: 'Tribunal Judiciaire de Toulouse',
          numeroRg: '2024/PI/852',
          adversaireNom: 'ImportExport Ltd',
          adversaireAvocat: 'Me Chen',
          honorairesEstimes: 12000,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Roux',
        prenom: 'Isabelle',
        email: 'isabelle.roux@free.fr',
        telephone: '06 89 01 23 45',
        adresseLigne1: '30 rue Nationale',
        codePostal: '59000',
        ville: 'Lille',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1985-01-25'),
        dossier: {
          intitule: 'Vice cache immobilier - Roux',
          typeAffaire: 'immobilier',
          description: 'Action pour vices caches apres achat immobilier',
          juridiction: 'Tribunal Judiciaire de Lille',
          numeroRg: '2024/IMM/963',
          adversaireNom: 'M. et Mme Durand',
          adversaireAvocat: 'Me Fontaine',
          honorairesEstimes: 4000,
        },
      },
      {
        civilite: 'M.',
        nom: 'Simon',
        prenom: 'Philippe',
        email: 'philippe.simon@yahoo.fr',
        telephone: '06 90 12 34 56',
        adresseLigne1: '22 quai des Chartrons',
        codePostal: '33000',
        ville: 'Bordeaux',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1978-06-18'),
        dossier: {
          intitule: 'Diffamation - Simon',
          typeAffaire: 'penal',
          description: 'Plainte pour diffamation sur reseaux sociaux',
          juridiction: 'Tribunal Correctionnel de Bordeaux',
          numeroRg: '2024/PEN/147',
          adversaireNom: 'M. Julien Mercier',
          adversaireAvocat: null,
          honorairesEstimes: 2500,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Laurent',
        prenom: 'Nathalie',
        email: 'nathalie.laurent@hotmail.fr',
        telephone: '06 01 23 45 67',
        adresseLigne1: '7 rue de Strasbourg',
        codePostal: '44000',
        ville: 'Nantes',
        type: 'institutionnel' as const,
        societeNom: 'Laurent Immobilier SAS',
        societeSiret: '45678901234567',
        societeFonction: 'Presidente',
        dossier: {
          intitule: 'Recouvrement creances - Laurent Immo',
          typeAffaire: 'commercial',
          description: 'Procedure de recouvrement de factures impayees',
          juridiction: 'Tribunal de Commerce de Nantes',
          numeroRg: '2024/REC/258',
          adversaireNom: 'Construction Plus SARL',
          adversaireAvocat: 'Me Olivier',
          honorairesEstimes: 7500,
        },
      },
    ]

    // Statuts possibles pour varier les dossiers
    const statuts = ['ouvert', 'en_cours', 'en_attente', 'audience_prevue', 'ouvert']

    let createdCount = 0

    for (const [i, data] of clientsData.entries()) {
      // Verifier si le client existe deja
      const existingClient = await Client.findBy('email', data.email)
      if (existingClient) {
        console.log(`Client ${data.email} existe deja, ignore`)
        continue
      }

      // Creer le client
      const client = await Client.create({
        email: data.email,
        password: 'Client123!', // Mot de passe par defaut
        civilite: data.civilite,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        adresseLigne1: data.adresseLigne1,
        codePostal: data.codePostal,
        ville: data.ville,
        pays: 'France',
        nationalite: 'Francaise',
        type: data.type,
        dateNaissance: data.dateNaissance || null,
        societeNom: data.societeNom || null,
        societeSiret: data.societeSiret || null,
        societeFonction: data.societeFonction || null,
        actif: true,
        peutUploader: true,
        peutDemanderRdv: true,
        accesDocumentsSensibles: false,
        notifEmailDocument: true,
        notifEmailEvenement: true,
        totpEnabled: false,
        responsableId: admin.id,
        createdById: admin.id,
      })

      // Generer une reference unique pour le dossier
      const year = DateTime.now().year
      const refNumber = String(i + 1).padStart(4, '0')
      const reference = `DOS-${year}-${refNumber}`

      // Creer le dossier associe
      const dossier = await Dossier.create({
        clientId: client.id,
        reference: reference,
        intitule: data.dossier.intitule,
        description: data.dossier.description,
        typeAffaire: data.dossier.typeAffaire,
        statut: statuts[i % statuts.length],
        dateOuverture: DateTime.now().minus({ days: Math.floor(Math.random() * 90) + 1 }),
        juridiction: data.dossier.juridiction,
        numeroRg: data.dossier.numeroRg,
        adversaireNom: data.dossier.adversaireNom,
        adversaireAvocat: data.dossier.adversaireAvocat,
        honorairesEstimes: data.dossier.honorairesEstimes,
        honorairesFactures: Math.floor((data.dossier.honorairesEstimes || 0) * Math.random() * 0.5),
        honorairesPayes: 0,
        createdById: admin.id,
        assignedAdminId: admin.id,
      })

      // Creer des evenements pour ce dossier
      const evenementsData = getEvenementsForDossier(i, data.dossier, dossier.id, admin.id)
      for (const evtData of evenementsData) {
        await Evenement.create(evtData)
      }

      createdCount++
      console.log(`  - Client: ${data.prenom} ${data.nom} (${data.email})`)
      console.log(`    Dossier: ${reference} - ${data.dossier.intitule}`)
      console.log(`    Evenements: ${evenementsData.length} crees`)
    }

    console.log('')
    console.log(`${createdCount} clients, dossiers et evenements crees avec succes!`)
    console.log('')
    console.log('Identifiants de connexion pour tous les clients:')
    console.log('Mot de passe: Client123!')
    console.log('')
    console.log('IMPORTANT: Changez les mots de passe en production!')
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

  // Evenement passe ou proche: Echeance procedure (il y a quelques jours ou dans quelques jours)
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

  // Evenement futur: Audience (dans 1-8 semaines selon l'index)
  const audienceDate = now.plus({ days: 7 + index * 5 })
  const audienceHour = 9 + (index % 4) * 2 // 9h, 11h, 13h ou 15h
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

  // Evenement futur: RDV client de suivi (dans 3-10 jours)
  const rdvSuiviDate = now.plus({ days: 3 + Math.floor(Math.random() * 7) })
  evenements.push({
    dossierId,
    titre: `RDV suivi dossier`,
    description: "Point sur l'avancement du dossier et preparation de l'audience",
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

  // Ajouter un evenement specifique selon le type d'affaire
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
      lieu: "Conseil de Prud'hommes",
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
      description: "Audition dans le cadre de l'enquete",
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

/**
 * Retourne une adresse fictive pour une juridiction
 */
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
