import vine from '@vinejs/vine'

export const createDossierValidator = vine.compile(
  vine.object({
    clientId: vine.string().uuid(),
    intitule: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
    typeAffaire: vine.string().optional(),
    statut: vine.string().optional(),
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
    typeAffaire: vine.string().optional(),
    statut: vine.string().optional(),
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
