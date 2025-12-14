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
import GoogleCalendar from '#models/google_calendar'
import { randomUUID } from 'node:crypto'
import { cuid } from '@adonisjs/core/helpers'
import dossierFolderService from '#services/microsoft/dossier_folder_service'
import calendarSyncService from '#services/google/calendar_sync_service'
import oneDriveService from '#services/microsoft/onedrive_service'

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

      // Recuperer le premier calendrier Google actif pour la sync
      const activeCalendar = await GoogleCalendar.query().where('is_active', true).first()

      // Creer les evenements (avec googleCalendarId si disponible)
      const evenements = await this.createEvenements(dossier, superAdmin, index, activeCalendar?.id || null)
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
   * Creer des documents pour un dossier (avec upload OneDrive si connecte)
   */
  private async createDocuments(dossier: Dossier, admin: Admin, client: Client) {
    const documents: Document[] = []
    const isOneDriveReady = await oneDriveService.isReady()

    // Charger le dossier avec le client pour avoir le nom complet
    await dossier.load('client')

    // Documents CABINET (non visibles par le client)
    const cabinetDocs = [
      { nom: 'Note strategie', type: 'note_interne', ext: 'txt', sensible: true },
      { nom: 'Analyse juridique', type: 'analyse', ext: 'txt', sensible: true },
      { nom: 'Correspondance adverse', type: 'correspondance', ext: 'txt', sensible: false },
    ]

    for (const doc of cabinetDocs) {
      const content = this.generateDocumentContent(doc.nom, doc.type, dossier, client)
      const document = await this.createAndUploadDocument(
        dossier,
        doc,
        content,
        'cabinet',
        false,
        admin.id,
        'admin',
        isOneDriveReady
      )
      documents.push(document)
    }

    // Documents CLIENT (visibles par le client)
    const clientDocs = [
      { nom: 'Contrat initial', type: 'contrat', ext: 'txt', sensible: false },
      { nom: 'Facture impayee', type: 'facture', ext: 'txt', sensible: false },
      { nom: 'Courrier mise en demeure', type: 'correspondance', ext: 'txt', sensible: false },
      { nom: 'Piece identite', type: 'piece_identite', ext: 'txt', sensible: false },
    ]

    for (const doc of clientDocs) {
      const content = this.generateDocumentContent(doc.nom, doc.type, dossier, client)
      const document = await this.createAndUploadDocument(
        dossier,
        doc,
        content,
        'client',
        true,
        admin.id,
        'admin',
        isOneDriveReady
      )
      documents.push(document)
    }

    // Documents uploades par le client
    const clientUploadDocs = [
      { nom: 'Justificatif domicile', type: 'justificatif', ext: 'txt', sensible: false },
      { nom: 'RIB', type: 'bancaire', ext: 'txt', sensible: false },
    ]

    for (const doc of clientUploadDocs) {
      const content = this.generateDocumentContent(doc.nom, doc.type, dossier, client)
      const document = await this.createAndUploadDocument(
        dossier,
        doc,
        content,
        'client',
        true,
        client.id,
        'client',
        isOneDriveReady
      )
      documents.push(document)
    }

    return documents
  }

  /**
   * Creer un document et l'uploader sur OneDrive si disponible
   */
  private async createAndUploadDocument(
    dossier: Dossier,
    docInfo: { nom: string; type: string; ext: string; sensible: boolean },
    content: string,
    location: 'cabinet' | 'client',
    visibleClient: boolean,
    uploadedById: string,
    uploadedByType: 'admin' | 'client',
    isOneDriveReady: boolean
  ): Promise<Document> {
    const contentBuffer = Buffer.from(content, 'utf-8')
    let onedriveFileId: string | null = null
    let onedriveWebUrl: string | null = null
    let onedriveDownloadUrl: string | null = null

    // Upload sur OneDrive si disponible
    if (isOneDriveReady) {
      const folderId =
        location === 'cabinet' ? dossier.onedriveCabinetFolderId : dossier.onedriveClientFolderId

      if (folderId) {
        const fileName = `${docInfo.nom}_${cuid()}.${docInfo.ext}`
        const uploadResult = await oneDriveService.uploadFile(
          folderId,
          fileName,
          contentBuffer,
          'text/plain'
        )

        if (uploadResult.success) {
          onedriveFileId = uploadResult.fileId || null
          onedriveWebUrl = uploadResult.webUrl || null
          onedriveDownloadUrl = uploadResult.downloadUrl || null
        }
      }
    }

    return await Document.create({
      dossierId: dossier.id,
      nom: docInfo.nom,
      nomOriginal: `${docInfo.nom}.${docInfo.ext}`,
      typeDocument: docInfo.type,
      tailleOctets: contentBuffer.length,
      mimeType: 'text/plain',
      extension: docInfo.ext,
      sensible: docInfo.sensible,
      visibleClient,
      uploadedByClient: uploadedByType === 'client',
      dossierLocation: location,
      uploadedById,
      uploadedByType,
      description: visibleClient ? `Document partage: ${docInfo.nom}` : `Document interne: ${docInfo.nom}`,
      dateDocument: DateTime.now().minus({ days: Math.floor(Math.random() * 30) }),
      onedriveFileId,
      onedriveWebUrl,
      onedriveDownloadUrl,
    })
  }

  /**
   * Generer le contenu d'un document de demonstration
   */
  private generateDocumentContent(
    nom: string,
    type: string,
    dossier: Dossier,
    client: Client
  ): string {
    const date = DateTime.now().toFormat('dd/MM/yyyy')
    const clientNom = `${client.civilite} ${client.prenom} ${client.nom}`

    const templates: Record<string, string> = {
      note_interne: `
================================================================================
                            NOTE INTERNE - CABINET
================================================================================

Dossier: ${dossier.reference} - ${dossier.intitule}
Client: ${clientNom}
Date: ${date}

--------------------------------------------------------------------------------
                              STRATEGIE JURIDIQUE
--------------------------------------------------------------------------------

1. ANALYSE DE LA SITUATION
   Le client nous a confie son dossier concernant ${dossier.intitule}.
   Type d'affaire: ${dossier.typeAffaire}
   Juridiction competente: ${dossier.juridiction}

2. POINTS FORTS DU DOSSIER
   - Documentation fournie complete
   - Temoins potentiels identifies
   - Jurisprudence favorable recente

3. POINTS DE VIGILANCE
   - Verifier les delais de prescription
   - Confirmer la competence territoriale
   - Preparer les pieces adverses

4. STRATEGIE RECOMMANDEE
   Nous recommandons une approche en deux temps:
   a) Tentative de resolution amiable
   b) Preparation du contentieux en parallele

--------------------------------------------------------------------------------
Document interne - Ne pas communiquer au client
================================================================================
`,
      analyse: `
================================================================================
                         ANALYSE JURIDIQUE DETAILLEE
================================================================================

Reference: ${dossier.reference}
Affaire: ${dossier.intitule}
Client: ${clientNom}
Redige le: ${date}

--------------------------------------------------------------------------------
                              FAITS ET CONTEXTE
--------------------------------------------------------------------------------

${dossier.description || 'Description du dossier non renseignee.'}

Partie adverse: ${dossier.adversaireNom || 'Non identifie'}
Avocat adverse: ${dossier.adversaireAvocat || 'Non constitue'}

--------------------------------------------------------------------------------
                           FONDEMENTS JURIDIQUES
--------------------------------------------------------------------------------

1. TEXTES APPLICABLES
   - Code civil: articles relatifs a la responsabilite contractuelle
   - Code de procedure civile: competence et delais

2. JURISPRUDENCE PERTINENTE
   - Cour de cassation, Civ. 1ere, 15 mars 2023
   - Cour d'appel de Paris, 12 janvier 2024

3. CONCLUSIONS
   Au vu des elements du dossier, les chances de succes sont evaluees
   a environ 70% en premiere instance.

--------------------------------------------------------------------------------
Document confidentiel - Cabinet uniquement
================================================================================
`,
      correspondance: `
================================================================================
                    CORRESPONDANCE AVEC LA PARTIE ADVERSE
================================================================================

Dossier: ${dossier.reference}
Date: ${date}

--------------------------------------------------------------------------------

De: Cabinet d'Avocats
A: ${dossier.adversaireAvocat || 'Partie adverse'}
Objet: Dossier ${dossier.reference} - ${dossier.intitule}

Cher Confrere,

Suite a notre entretien telephonique du ${DateTime.now().minus({ days: 7 }).toFormat('dd/MM/yyyy')},
je vous confirme que mon client, ${clientNom}, maintient sa position
concernant le litige qui l'oppose a votre client.

Nous restons neanmoins ouverts a toute proposition de resolution amiable
qui pourrait intervenir avant l'audience prevue.

Dans l'attente de votre retour, je vous prie d'agreer, cher Confrere,
l'expression de mes sentiments les meilleurs.

Cabinet d'Avocats

--------------------------------------------------------------------------------
================================================================================
`,
      contrat: `
================================================================================
                              CONTRAT INITIAL
================================================================================

Reference dossier: ${dossier.reference}
Client: ${clientNom}
Date du document: ${DateTime.now().minus({ days: 90 }).toFormat('dd/MM/yyyy')}

--------------------------------------------------------------------------------
                           CONVENTION D'HONORAIRES
--------------------------------------------------------------------------------

ENTRE LES SOUSSIGNES:

Le Cabinet d'Avocats, ci-apres denomme "l'Avocat"

ET

${clientNom}
${client.adresseLigne1 || ''}
${client.codePostal || ''} ${client.ville || ''}

Ci-apres denomme "le Client"

IL A ETE CONVENU CE QUI SUIT:

ARTICLE 1 - OBJET
L'Avocat s'engage a assister et representer le Client dans le cadre
du dossier: ${dossier.intitule}

ARTICLE 2 - HONORAIRES
Les honoraires sont fixes comme suit:
- Honoraires estimes: ${dossier.honorairesEstimes || 0} EUR HT
- Provision a la signature: ${Math.floor((dossier.honorairesEstimes || 0) * 0.3)} EUR HT

ARTICLE 3 - DUREE
La presente convention est conclue pour la duree de la procedure.

Fait en deux exemplaires originaux.

--------------------------------------------------------------------------------
================================================================================
`,
      facture: `
================================================================================
                                  FACTURE
================================================================================

CABINET D'AVOCATS
Facture N°: FAC-${dossier.reference}-001
Date: ${date}

--------------------------------------------------------------------------------

Client: ${clientNom}
Dossier: ${dossier.reference} - ${dossier.intitule}

--------------------------------------------------------------------------------
                                 PRESTATIONS
--------------------------------------------------------------------------------

Description                                              Montant HT
----------------------------------------------------------------------
Consultation initiale et analyse du dossier                  500,00 EUR
Redaction de conclusions                                   1 500,00 EUR
Correspondances et suivi                                     300,00 EUR
----------------------------------------------------------------------
                                            TOTAL HT:      2 300,00 EUR
                                            TVA 20%:         460,00 EUR
                                            TOTAL TTC:     2 760,00 EUR

--------------------------------------------------------------------------------

Conditions de paiement: 30 jours date de facture
RIB: FR76 XXXX XXXX XXXX XXXX XXXX XXX

================================================================================
`,
      piece_identite: `
================================================================================
                     COPIE DE PIECE D'IDENTITE
================================================================================

[Document de demonstration - Simulation]

Type de document: Carte Nationale d'Identite
Nom: ${client.nom}
Prenom: ${client.prenom}
Date de naissance: ${client.dateNaissance?.toFormat('dd/MM/yyyy') || 'Non renseignee'}
Nationalite: ${client.nationalite || 'Francaise'}

--------------------------------------------------------------------------------
Ce document est une simulation pour demonstration uniquement.
Il ne constitue pas un document officiel.
--------------------------------------------------------------------------------

================================================================================
`,
      justificatif: `
================================================================================
                      JUSTIFICATIF DE DOMICILE
================================================================================

[Document de demonstration - Simulation]

ATTESTATION DE DOMICILE

Je soussigne(e), ${clientNom},
atteste sur l'honneur resider a l'adresse suivante:

${client.adresseLigne1 || 'Adresse non renseignee'}
${client.codePostal || ''} ${client.ville || ''}

Cette attestation est etablie pour servir et valoir ce que de droit.

Fait a ${client.ville || 'Paris'}, le ${date}

Signature: [Signature electronique]

--------------------------------------------------------------------------------
Document fourni par le client
================================================================================
`,
      bancaire: `
================================================================================
                    RELEVE D'IDENTITE BANCAIRE (RIB)
================================================================================

[Document de demonstration - Simulation]

Titulaire du compte: ${clientNom}

Banque: Banque Nationale
Code banque: XXXX
Code guichet: XXXXX
Numero de compte: XXXXXXXXXXX
Cle RIB: XX

IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX
BIC: BNPAFRPPXXX

--------------------------------------------------------------------------------
Document fourni par le client pour le reglement des factures
================================================================================
`,
    }

    return templates[type] || `
================================================================================
                              DOCUMENT ${nom.toUpperCase()}
================================================================================

Dossier: ${dossier.reference}
Client: ${clientNom}
Date: ${date}

--------------------------------------------------------------------------------

Contenu du document de demonstration.

Ce fichier a ete genere automatiquement par le seeder de demonstration
du Portail Cabinet d'Avocats.

--------------------------------------------------------------------------------
================================================================================
`
  }

  /**
   * Creer des evenements pour un dossier
   * @param googleCalendarId - ID du calendrier Google actif (optionnel)
   */
  private async createEvenements(dossier: Dossier, admin: Admin, index: number, googleCalendarId: string | null) {
    const now = DateTime.now()
    const evenements: Evenement[] = []

    // RDV initial (passe) - pas de sync Google (passe)
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
      syncGoogle: !!googleCalendarId,
      googleCalendarId: googleCalendarId,
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
      syncGoogle: !!googleCalendarId,
      googleCalendarId: googleCalendarId,
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
      syncGoogle: !!googleCalendarId,
      googleCalendarId: googleCalendarId,
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
      syncGoogle: !!googleCalendarId,
      googleCalendarId: googleCalendarId,
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
