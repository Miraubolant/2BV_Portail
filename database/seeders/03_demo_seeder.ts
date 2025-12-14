import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Client from '#models/client'
import Dossier from '#models/dossier'
import Evenement from '#models/evenement'
import Document from '#models/document'
import Note from '#models/note'
import Task from '#models/task'
import ActivityLog from '#models/activity_log'
import Admin from '#models/admin'
import { randomUUID } from 'node:crypto'
import dossierFolderService from '#services/microsoft/dossier_folder_service'
import calendarSyncService from '#services/google/calendar_sync_service'

/**
 * Seeder de demonstration complet
 * Cree des donnees realistes avec tous les liens possibles:
 * - Admins (super admin + admin regulier)
 * - Clients (particuliers et entreprises)
 * - Dossiers avec historique complet
 * - Documents (cabinet et client)
 * - Evenements (passes, en cours, futurs)
 * - Notes internes
 * - Taches avec differents statuts
 * - Historique d'activite (timeline)
 */
export default class DemoSeeder extends BaseSeeder {
  async run() {
    // Verifier si des clients demo existent deja (via email specifique)
    const existingDemoClient = await Client.findBy('email', 'jean-pierre.dupont@email.fr')

    if (existingDemoClient) {
      console.log('Donnees de demo deja presentes, seeder ignore')
      return
    }

    console.log('='.repeat(60))
    console.log('   CREATION DES DONNEES DE DEMONSTRATION')
    console.log('='.repeat(60))
    console.log('')

    // Recuperer ou creer les admins
    const { superAdmin, admin } = await this.createAdmins()

    // Creer les clients et leurs dossiers
    const clientsData = this.getClientsData()

    for (const [index, clientData] of clientsData.entries()) {
      console.log(`\n[${index + 1}/${clientsData.length}] Creation: ${clientData.prenom} ${clientData.nom}`)

      const client = await this.createClient(clientData, superAdmin, admin)
      const dossier = await this.createDossier(clientData, client, superAdmin, admin, index)

      // Creer le dossier OneDrive (si connecte)
      await this.syncDossierToOneDrive(dossier)

      // Creer les documents
      const documents = await this.createDocuments(dossier, superAdmin, client)
      console.log(`   - ${documents.length} documents crees`)

      // Creer les evenements
      const evenements = await this.createEvenements(dossier, superAdmin, index)
      console.log(`   - ${evenements.length} evenements crees`)

      // Synchroniser les evenements sur Google Calendar (si connecte)
      await this.syncEvenementsToGoogle(evenements)

      // Creer les notes
      const notes = await this.createNotes(dossier, superAdmin, admin)
      console.log(`   - ${notes.length} notes creees`)

      // Creer les taches
      const tasks = await this.createTasks(dossier, superAdmin, admin, index)
      console.log(`   - ${tasks.length} taches creees`)

      // Creer l'historique d'activite
      const activities = await this.createActivityHistory(
        dossier, client, superAdmin, admin, documents, evenements, notes, tasks
      )
      console.log(`   - ${activities.length} entrees timeline creees`)
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('   DONNEES DE DEMONSTRATION CREEES AVEC SUCCES')
    console.log('='.repeat(60))
    console.log('')
    console.log('Identifiants de connexion:')
    console.log('  Admin:    admin@cabinet.fr / Admin123!')
    console.log('  Clients:  [email]@... / Client123!')
    console.log('')
    console.log('IMPORTANT: Changez les mots de passe en production!')
  }

  /**
   * Creer ou recuperer les admins
   */
  private async createAdmins() {
    let superAdmin = await Admin.findBy('email', 'admin@cabinet.fr')
    if (!superAdmin) {
      superAdmin = await Admin.create({
        email: 'admin@cabinet.fr',
        password: 'Admin123!',
        nom: 'Durand',
        prenom: 'Pierre',
        role: 'super_admin',
        actif: true,
        totpEnabled: false,
      })
      console.log('Super admin cree: admin@cabinet.fr')
    }

    let admin = await Admin.findBy('email', 'avocat@cabinet.fr')
    if (!admin) {
      admin = await Admin.create({
        email: 'avocat@cabinet.fr',
        password: 'Admin123!',
        nom: 'Martin',
        prenom: 'Sophie',
        role: 'admin',
        actif: true,
        totpEnabled: false,
      })
      console.log('Admin cree: avocat@cabinet.fr')
    }

    return { superAdmin, admin }
  }

  /**
   * Donnees des clients de demonstration
   */
  private getClientsData() {
    return [
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
          description: 'Contentieux avec un fournisseur pour non-livraison de marchandises. Le client a passe une commande de 50 000 EUR qui na jamais ete livree malgre le paiement integral.',
          juridiction: 'Tribunal de Commerce de Paris',
          numeroRg: '2024/12345',
          adversaireNom: 'SARL TechnoPlus',
          adversaireAvocat: 'Me Martin',
          honorairesEstimes: 5000,
        },
      },
      {
        civilite: 'Mme',
        nom: 'Bernard',
        prenom: 'Marie',
        email: 'marie.bernard@email.fr',
        telephone: '06 23 45 67 89',
        adresseLigne1: '8 avenue des Champs-Elysees',
        codePostal: '75008',
        ville: 'Paris',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1982-07-22'),
        dossier: {
          intitule: 'Divorce Bernard/Leroy',
          typeAffaire: 'famille',
          description: 'Procedure de divorce par consentement mutuel. Deux enfants mineurs. Partage des biens immobiliers et mobiliers a organiser.',
          juridiction: 'JAF Paris',
          numeroRg: '2024/FAM/789',
          adversaireNom: 'M. Philippe Leroy',
          adversaireAvocat: 'Me Dubois',
          honorairesEstimes: 3500,
        },
      },
      {
        civilite: 'M.',
        nom: 'Garcia',
        prenom: 'Antoine',
        email: 'antoine.garcia@pro.fr',
        telephone: '06 34 56 78 90',
        adresseLigne1: '25 boulevard Haussmann',
        codePostal: '75009',
        ville: 'Paris',
        type: 'institutionnel' as const,
        societeNom: 'Garcia Consulting SARL',
        societeSiret: '12345678901234',
        societeFonction: 'Gerant',
        dossier: {
          intitule: 'Licenciement abusif - Dossier Garcia',
          typeAffaire: 'social',
          description: "Contestation d'un licenciement pour faute grave. Le salarie conteste les motifs invoques et demande des dommages et interets.",
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
        prenom: 'Catherine',
        email: 'catherine.petit@gmail.com',
        telephone: '06 45 67 89 01',
        adresseLigne1: '42 rue du Commerce',
        codePostal: '69001',
        ville: 'Lyon',
        type: 'particulier' as const,
        dateNaissance: DateTime.fromISO('1990-11-08'),
        dossier: {
          intitule: 'Accident de la circulation - Petit',
          typeAffaire: 'civil',
          description: 'Indemnisation suite a un accident de voiture avec blessures corporelles. ITT de 45 jours. Prejudice esthetique et professionnel.',
          juridiction: 'Tribunal Judiciaire de Lyon',
          numeroRg: '2024/CIV/321',
          adversaireNom: 'Assurance MutuelPlus',
          adversaireAvocat: 'Me Garnier',
          honorairesEstimes: 6000,
        },
      },
      {
        civilite: 'M.',
        nom: 'Moreau',
        prenom: 'Laurent',
        email: 'laurent.moreau@entreprise.com',
        telephone: '06 56 78 90 12',
        adresseLigne1: '10 place Bellecour',
        codePostal: '69002',
        ville: 'Lyon',
        type: 'institutionnel' as const,
        societeNom: 'Moreau Immobilier SAS',
        societeSiret: '98765432109876',
        societeFonction: 'President',
        dossier: {
          intitule: 'Bail commercial - Moreau Immo',
          typeAffaire: 'immobilier',
          description: 'Resiliation anticipee de bail commercial et recouvrement de loyers impayes. 6 mois de loyers en souffrance.',
          juridiction: 'Tribunal de Commerce de Lyon',
          numeroRg: '2024/BC/753',
          adversaireNom: 'SCI Les Terrasses',
          adversaireAvocat: null,
          honorairesEstimes: 8000,
        },
      },
    ]
  }

  /**
   * Creer un client
   */
  private async createClient(data: any, superAdmin: Admin, admin: Admin) {
    const responsable = Math.random() > 0.5 ? superAdmin : admin

    return await Client.create({
      email: data.email,
      password: 'Client123!',
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
      responsableId: responsable.id,
      createdById: superAdmin.id,
    })
  }

  /**
   * Creer un dossier
   */
  private async createDossier(data: any, client: Client, superAdmin: Admin, admin: Admin, index: number) {
    const year = DateTime.now().year
    const refNumber = String(index + 1).padStart(4, '0')
    const reference = `DOS-${year}-${refNumber}`

    const statuts = ['ouvert', 'en_cours', 'en_attente', 'audience_prevue', 'en_cours']
    const assignedAdmin = Math.random() > 0.5 ? superAdmin : admin
    const joursOuverture = Math.floor(Math.random() * 60) + 15 // 15-75 jours

    return await Dossier.create({
      clientId: client.id,
      reference: reference,
      intitule: data.dossier.intitule,
      description: data.dossier.description,
      typeAffaire: data.dossier.typeAffaire,
      statut: statuts[index % statuts.length],
      dateOuverture: DateTime.now().minus({ days: joursOuverture }),
      juridiction: data.dossier.juridiction,
      numeroRg: data.dossier.numeroRg,
      adversaireNom: data.dossier.adversaireNom,
      adversaireAvocat: data.dossier.adversaireAvocat,
      honorairesEstimes: data.dossier.honorairesEstimes,
      honorairesFactures: Math.floor((data.dossier.honorairesEstimes || 0) * Math.random() * 0.6),
      honorairesPayes: Math.floor((data.dossier.honorairesEstimes || 0) * Math.random() * 0.3),
      createdById: superAdmin.id,
      assignedAdminId: assignedAdmin.id,
    })
  }

  /**
   * Creer des documents pour un dossier
   */
  private async createDocuments(dossier: Dossier, admin: Admin, client: Client) {
    const documents: Document[] = []

    // Documents CABINET (non visibles par le client)
    const cabinetDocs = [
      { nom: 'Note strategie', type: 'note_interne', ext: 'docx', taille: 45000, sensible: true },
      { nom: 'Analyse juridique', type: 'analyse', ext: 'pdf', taille: 120000, sensible: true },
      { nom: 'Correspondance adverse', type: 'correspondance', ext: 'pdf', taille: 85000, sensible: false },
    ]

    for (const doc of cabinetDocs) {
      documents.push(await Document.create({
        dossierId: dossier.id,
        nom: doc.nom,
        nomOriginal: `${doc.nom}.${doc.ext}`,
        typeDocument: doc.type,
        tailleOctets: doc.taille,
        mimeType: doc.ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: doc.ext,
        sensible: doc.sensible,
        visibleClient: false,
        uploadedByClient: false,
        dossierLocation: 'cabinet',
        uploadedById: admin.id,
        uploadedByType: 'admin',
        description: `Document interne: ${doc.nom}`,
        dateDocument: DateTime.now().minus({ days: Math.floor(Math.random() * 30) }),
      }))
    }

    // Documents CLIENT (visibles par le client)
    const clientDocs = [
      { nom: 'Contrat initial', type: 'contrat', ext: 'pdf', taille: 250000 },
      { nom: 'Facture impayee', type: 'facture', ext: 'pdf', taille: 65000 },
      { nom: 'Courrier mise en demeure', type: 'correspondance', ext: 'pdf', taille: 35000 },
      { nom: 'Piece identite', type: 'piece_identite', ext: 'pdf', taille: 500000 },
    ]

    for (const doc of clientDocs) {
      documents.push(await Document.create({
        dossierId: dossier.id,
        nom: doc.nom,
        nomOriginal: `${doc.nom}.${doc.ext}`,
        typeDocument: doc.type,
        tailleOctets: doc.taille,
        mimeType: 'application/pdf',
        extension: doc.ext,
        sensible: false,
        visibleClient: true,
        uploadedByClient: false,
        dossierLocation: 'client',
        uploadedById: admin.id,
        uploadedByType: 'admin',
        description: `Document partage: ${doc.nom}`,
        dateDocument: DateTime.now().minus({ days: Math.floor(Math.random() * 45) }),
      }))
    }

    // Documents uploades par le client
    const clientUploadDocs = [
      { nom: 'Justificatif domicile', type: 'justificatif', ext: 'pdf', taille: 180000 },
      { nom: 'RIB', type: 'bancaire', ext: 'pdf', taille: 45000 },
    ]

    for (const doc of clientUploadDocs) {
      documents.push(await Document.create({
        dossierId: dossier.id,
        nom: doc.nom,
        nomOriginal: `${doc.nom}.${doc.ext}`,
        typeDocument: doc.type,
        tailleOctets: doc.taille,
        mimeType: 'application/pdf',
        extension: doc.ext,
        sensible: false,
        visibleClient: true,
        uploadedByClient: true,
        dossierLocation: 'client',
        uploadedById: client.id,
        uploadedByType: 'client',
        description: `Document fourni par le client`,
        dateDocument: DateTime.now().minus({ days: Math.floor(Math.random() * 20) }),
      }))
    }

    return documents
  }

  /**
   * Creer des evenements pour un dossier
   */
  private async createEvenements(dossier: Dossier, admin: Admin, index: number) {
    const now = DateTime.now()
    const evenements: Evenement[] = []

    // RDV initial (passe)
    const rdvInitialDate = now.minus({ days: 20 + Math.floor(Math.random() * 20) })
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: 'RDV initial client',
      description: 'Premier rendez-vous pour etudier le dossier et definir la strategie',
      type: 'rdv_client',
      dateDebut: rdvInitialDate.set({ hour: 10, minute: 0 }),
      dateFin: rdvInitialDate.set({ hour: 11, minute: 0 }),
      journeeEntiere: false,
      lieu: 'Cabinet',
      statut: 'termine',
      syncGoogle: false,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: true,
      createdById: admin.id,
    }))

    // Echeance passee
    const echeancePasseeDate = now.minus({ days: 5 + index })
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: 'Echeance depot conclusions',
      description: 'Date limite pour le depot des conclusions',
      type: 'echeance',
      dateDebut: echeancePasseeDate.set({ hour: 0, minute: 0 }),
      dateFin: echeancePasseeDate.set({ hour: 23, minute: 59 }),
      journeeEntiere: true,
      statut: 'termine',
      syncGoogle: false,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: true,
      createdById: admin.id,
    }))

    // RDV suivi (recent passe ou tres proche)
    const rdvSuiviDate = now.minus({ days: 2 - index })
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: 'RDV suivi dossier',
      description: "Point sur l'avancement du dossier",
      type: 'rdv_client',
      dateDebut: rdvSuiviDate.set({ hour: 14 + (index % 3), minute: 0 }),
      dateFin: rdvSuiviDate.set({ hour: 15 + (index % 3), minute: 0 }),
      journeeEntiere: false,
      lieu: 'Cabinet',
      statut: rdvSuiviDate < now ? 'termine' : 'confirme',
      syncGoogle: true,
      rappelJ7: false,
      rappelJ1: true,
      rappelEnvoye: rdvSuiviDate < now,
      createdById: admin.id,
    }))

    // Audience (futur)
    const audienceDate = now.plus({ days: 10 + index * 7 })
    const audienceHour = 9 + (index % 4) * 2
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: `Audience - ${dossier.juridiction}`,
      description: `Audience de plaidoirie devant ${dossier.juridiction}`,
      type: 'audience',
      dateDebut: audienceDate.set({ hour: audienceHour, minute: 0 }),
      dateFin: audienceDate.set({ hour: audienceHour + 2, minute: 0 }),
      journeeEntiere: false,
      lieu: dossier.juridiction,
      adresse: this.getAdresseJuridiction(dossier.juridiction || ''),
      statut: 'confirme',
      syncGoogle: true,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: admin.id,
    }))

    // Echeance future
    const echeanceFutureDate = now.plus({ days: 5 + index * 3 })
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: 'Echeance pieces adverses',
      description: "Date limite pour reception des pieces de la partie adverse",
      type: 'echeance',
      dateDebut: echeanceFutureDate.set({ hour: 0, minute: 0 }),
      dateFin: echeanceFutureDate.set({ hour: 23, minute: 59 }),
      journeeEntiere: true,
      statut: 'en_attente',
      syncGoogle: true,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: admin.id,
    }))

    // RDV preparation audience (futur)
    const rdvPrepDate = audienceDate.minus({ days: 3 })
    evenements.push(await Evenement.create({
      dossierId: dossier.id,
      titre: 'Preparation audience',
      description: "Rendez-vous de preparation avant l'audience",
      type: 'rdv_client',
      dateDebut: rdvPrepDate.set({ hour: 16, minute: 0 }),
      dateFin: rdvPrepDate.set({ hour: 17, minute: 30 }),
      journeeEntiere: false,
      lieu: 'Cabinet',
      statut: 'confirme',
      syncGoogle: true,
      rappelJ7: true,
      rappelJ1: true,
      rappelEnvoye: false,
      createdById: admin.id,
    }))

    return evenements
  }

  /**
   * Creer des notes pour un dossier
   */
  private async createNotes(dossier: Dossier, superAdmin: Admin, admin: Admin) {
    const notes: Note[] = []

    notes.push(await Note.create({
      dossierId: dossier.id,
      createdById: superAdmin.id,
      contenu: `**Premiere analyse du dossier**\n\nLe client presente un cas solide. Points forts:\n- Documentation complete\n- Temoins disponibles\n- Jurisprudence favorable\n\nPoints a surveiller:\n- Delai de prescription\n- Competence territoriale`,
      isPinned: true,
    }))

    notes.push(await Note.create({
      dossierId: dossier.id,
      createdById: admin.id,
      contenu: `Appel telephonique avec le client - ${DateTime.now().minus({ days: 10 }).toFormat('dd/MM/yyyy')}\n\nLe client confirme les elements du dossier. Il souhaite privilegier une solution amiable si possible avant de poursuivre en justice.`,
      isPinned: false,
    }))

    notes.push(await Note.create({
      dossierId: dossier.id,
      createdById: superAdmin.id,
      contenu: `A faire:\n- [ ] Verifier les pieces manquantes\n- [x] Contacter le confrere adverse\n- [ ] Preparer les conclusions`,
      isPinned: false,
    }))

    notes.push(await Note.create({
      dossierId: dossier.id,
      createdById: admin.id,
      contenu: `Retour du confrere adverse: ils sont ouverts a la negociation. Proposition de mediation a soumettre au client.`,
      isPinned: true,
    }))

    return notes
  }

  /**
   * Creer des taches pour un dossier
   */
  private async createTasks(dossier: Dossier, superAdmin: Admin, admin: Admin, index: number) {
    const now = DateTime.now()
    const tasks: Task[] = []

    // Tache terminee
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: superAdmin.id,
      assignedToId: admin.id,
      titre: 'Analyser les pieces du dossier',
      description: 'Effectuer une premiere analyse des documents fournis par le client',
      priorite: 'haute',
      statut: 'terminee',
      dateEcheance: now.minus({ days: 15 }),
      completedAt: now.minus({ days: 14 }),
      rappelEnvoye: true,
    }))

    // Tache terminee
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: admin.id,
      assignedToId: admin.id,
      titre: 'Rediger la mise en demeure',
      description: 'Preparer et envoyer une mise en demeure a la partie adverse',
      priorite: 'haute',
      statut: 'terminee',
      dateEcheance: now.minus({ days: 10 }),
      completedAt: now.minus({ days: 9 }),
      rappelEnvoye: true,
    }))

    // Tache en cours
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: superAdmin.id,
      assignedToId: superAdmin.id,
      titre: 'Preparer les conclusions',
      description: 'Rediger les conclusions pour le tribunal',
      priorite: 'haute',
      statut: 'en_cours',
      dateEcheance: now.plus({ days: 5 }),
      rappelDate: now.plus({ days: 3 }),
      rappelEnvoye: false,
    }))

    // Tache a faire urgente
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: admin.id,
      assignedToId: superAdmin.id,
      titre: 'Contacter le client pour signature',
      description: 'Faire signer le mandat mis a jour',
      priorite: 'urgente',
      statut: 'a_faire',
      dateEcheance: now.plus({ days: 2 }),
      rappelDate: now.plus({ days: 1 }),
      rappelEnvoye: false,
    }))

    // Tache a faire normale
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: superAdmin.id,
      assignedToId: admin.id,
      titre: 'Rassembler les pieces justificatives',
      description: 'Demander au client les justificatifs manquants',
      priorite: 'normale',
      statut: 'a_faire',
      dateEcheance: now.plus({ days: 10 + index }),
      rappelEnvoye: false,
    }))

    // Tache basse priorite
    tasks.push(await Task.create({
      dossierId: dossier.id,
      createdById: admin.id,
      assignedToId: null,
      titre: 'Archiver les anciens echanges',
      description: 'Classer les emails et courriers echanges',
      priorite: 'basse',
      statut: 'a_faire',
      dateEcheance: now.plus({ days: 30 }),
      rappelEnvoye: false,
    }))

    return tasks
  }

  /**
   * Creer l'historique d'activite (timeline)
   */
  private async createActivityHistory(
    dossier: Dossier,
    client: Client,
    superAdmin: Admin,
    admin: Admin,
    documents: Document[],
    evenements: Evenement[],
    notes: Note[],
    tasks: Task[]
  ) {
    const activities: ActivityLog[] = []
    const now = DateTime.now()

    // Creation du dossier (il y a quelques semaines)
    activities.push(await ActivityLog.create({
      id: randomUUID(),
      userId: superAdmin.id,
      userType: 'admin',
      action: 'dossier.created',
      resourceType: 'dossier',
      resourceId: dossier.id,
      metadata: {
        reference: dossier.reference,
        intitule: dossier.intitule,
        clientNom: `${client.prenom} ${client.nom}`
      },
      createdAt: now.minus({ days: 45 }),
    }))

    // Changements de statut
    activities.push(await ActivityLog.create({
      id: randomUUID(),
      userId: superAdmin.id,
      userType: 'admin',
      action: 'dossier.statut_changed',
      resourceType: 'dossier',
      resourceId: dossier.id,
      metadata: { oldStatut: 'ouvert', newStatut: 'en_cours' },
      createdAt: now.minus({ days: 40 }),
    }))

    // Upload de documents
    for (const [i, doc] of documents.entries()) {
      const isClientUpload = doc.uploadedByType === 'client'
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: isClientUpload ? client.id : (i % 2 === 0 ? superAdmin.id : admin.id),
        userType: isClientUpload ? 'client' : 'admin',
        action: 'document.uploaded',
        resourceType: 'document',
        resourceId: doc.id,
        metadata: {
          documentName: doc.nom,
          documentType: doc.typeDocument,
          dossierLocation: doc.dossierLocation,
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 35 - i * 3 }),
      }))
    }

    // Creation des evenements
    for (const [i, evt] of evenements.entries()) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: superAdmin.id,
        userType: 'admin',
        action: 'evenement.created',
        resourceType: 'evenement',
        resourceId: evt.id,
        metadata: {
          titre: evt.titre,
          type: evt.type,
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 30 - i * 2 }),
      }))
    }

    // Creation des notes
    for (const [i, note] of notes.entries()) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: note.createdById,
        userType: 'admin',
        action: 'note.created',
        resourceType: 'note',
        resourceId: note.id,
        metadata: {
          preview: note.contenu.substring(0, 100),
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 25 - i * 4 }),
      }))
    }

    // Epinglage de note
    const pinnedNote = notes.find(n => n.isPinned)
    if (pinnedNote) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: superAdmin.id,
        userType: 'admin',
        action: 'note.pinned',
        resourceType: 'note',
        resourceId: pinnedNote.id,
        metadata: { dossierId: dossier.id },
        createdAt: now.minus({ days: 20 }),
      }))
    }

    // Creation des taches
    for (const [i, task] of tasks.entries()) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: task.createdById,
        userType: 'admin',
        action: 'task.created',
        resourceType: 'task',
        resourceId: task.id,
        metadata: {
          titre: task.titre,
          priorite: task.priorite,
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 20 - i * 2 }),
      }))
    }

    // Completion des taches terminees
    const completedTasks = tasks.filter(t => t.statut === 'terminee')
    for (const task of completedTasks) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: task.assignedToId || task.createdById,
        userType: 'admin',
        action: 'task.completed',
        resourceType: 'task',
        resourceId: task.id,
        metadata: {
          titre: task.titre,
          dossierId: dossier.id
        },
        createdAt: task.completedAt || now.minus({ days: 10 }),
      }))
    }

    // Telechargement document par le client
    const visibleDocs = documents.filter(d => d.visibleClient)
    if (visibleDocs.length > 0) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: client.id,
        userType: 'client',
        action: 'document.downloaded',
        resourceType: 'document',
        resourceId: visibleDocs[0].id,
        metadata: {
          documentName: visibleDocs[0].nom,
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 5 }),
      }))
    }

    // Modification recente du dossier
    activities.push(await ActivityLog.create({
      id: randomUUID(),
      userId: admin.id,
      userType: 'admin',
      action: 'dossier.updated',
      resourceType: 'dossier',
      resourceId: dossier.id,
      metadata: {
        changes: ['honorairesFactures', 'description'],
        dossierId: dossier.id
      },
      createdAt: now.minus({ days: 2 }),
    }))

    // Evenement termine
    const pastEvents = evenements.filter(e => e.statut === 'termine')
    if (pastEvents.length > 0) {
      activities.push(await ActivityLog.create({
        id: randomUUID(),
        userId: superAdmin.id,
        userType: 'admin',
        action: 'evenement.updated',
        resourceType: 'evenement',
        resourceId: pastEvents[0].id,
        metadata: {
          titre: pastEvents[0].titre,
          changes: ['statut: termine'],
          dossierId: dossier.id
        },
        createdAt: now.minus({ days: 1 }),
      }))
    }

    return activities
  }

  /**
   * Retourne une adresse fictive pour une juridiction
   */
  private getAdresseJuridiction(juridiction: string): string {
    if (juridiction.includes('Paris')) {
      return '4 boulevard du Palais, 75001 Paris'
    } else if (juridiction.includes('Lyon')) {
      return '67 rue Servient, 69003 Lyon'
    } else if (juridiction.includes('Marseille')) {
      return '6 rue Joseph Autran, 13006 Marseille'
    } else if (juridiction.includes('Toulouse')) {
      return '2 allee Jules Guesde, 31000 Toulouse'
    }
    return 'Palais de Justice'
  }

  /**
   * Synchroniser un dossier avec OneDrive (creer la structure de dossiers)
   */
  private async syncDossierToOneDrive(dossier: Dossier) {
    try {
      const result = await dossierFolderService.createDossierFolder(dossier.id)
      if (result.success) {
        console.log(`   - Dossier OneDrive cree: ${result.folderPath}`)
      } else if (result.error?.includes('not connected')) {
        console.log(`   - OneDrive non connecte (dossier non cree sur OneDrive)`)
      } else {
        console.log(`   - Erreur OneDrive: ${result.error}`)
      }
    } catch (error) {
      console.log(`   - OneDrive non disponible`)
    }
  }

  /**
   * Synchroniser les evenements avec Google Calendar
   */
  private async syncEvenementsToGoogle(evenements: Evenement[]) {
    const eventsToSync = evenements.filter((e) => e.syncGoogle)
    if (eventsToSync.length === 0) return

    let synced = 0
    let skipped = 0

    for (const evt of eventsToSync) {
      try {
        const result = await calendarSyncService.syncEventToGoogle(evt.id)
        if (result.success) {
          synced++
        } else if (result.error?.includes('not connected')) {
          skipped++
        }
      } catch {
        skipped++
      }
    }

    if (synced > 0) {
      console.log(`   - ${synced} evenements synchronises sur Google Calendar`)
    } else if (skipped > 0) {
      console.log(`   - Google Calendar non connecte (${skipped} evenements non synchronises)`)
    }
  }
}
