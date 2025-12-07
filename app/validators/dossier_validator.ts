import vine from '@vinejs/vine'

const DOSSIER_STATUTS = [
  'nouveau',
  'en_cours',
  'en_attente',
  'audience_prevue',
  'en_delibere',
  'cloture_gagne',
  'cloture_perdu',
  'cloture_transaction',
  'archive',
] as const

const TYPE_AFFAIRES = [
  'civil',
  'penal',
  'commercial',
  'social',
  'famille',
  'administratif',
  'immobilier',
] as const

export const createDossierValidator = vine.compile(
  vine.object({
    clientId: vine.string().uuid(),
    intitule: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
    typeAffaire: vine.enum(TYPE_AFFAIRES).optional(),
    statut: vine.enum(DOSSIER_STATUTS).optional(),
    dateOuverture: vine.string().optional(),
    datePrescription: vine.string().optional(),
    honorairesEstimes: vine.number().optional(),
    juridiction: vine.string().optional(),
    numeroRg: vine.string().optional(),
    adversaireNom: vine.string().optional(),
    adversaireAvocat: vine.string().optional(),
    notesInternes: vine.string().optional(),
    assignedAdminId: vine.string().uuid().optional(),
  })
)

export const updateDossierValidator = vine.compile(
  vine.object({
    intitule: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().optional(),
    typeAffaire: vine.enum(TYPE_AFFAIRES).optional(),
    statut: vine.enum(DOSSIER_STATUTS).optional(),
    dateCloture: vine.string().optional(),
    datePrescription: vine.string().optional(),
    honorairesEstimes: vine.number().optional(),
    honorairesFactures: vine.number().optional(),
    honorairesPayes: vine.number().optional(),
    juridiction: vine.string().optional(),
    numeroRg: vine.string().optional(),
    adversaireNom: vine.string().optional(),
    adversaireAvocat: vine.string().optional(),
    notesInternes: vine.string().optional(),
    assignedAdminId: vine.string().uuid().optional(),
  })
)
