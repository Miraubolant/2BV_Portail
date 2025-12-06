import type { HttpContext } from '@adonisjs/core/http'
import Dossier from '#models/dossier'
import Client from '#models/client'
import { createDossierValidator, updateDossierValidator } from '#validators/dossier_validator'
import { DateTime } from 'luxon'
import dossierFolderService from '#services/microsoft/dossier_folder_service'
import ActivityLogger from '#services/activity_logger'

export default class DossiersController {
  /**
   * Genere une reference unique pour un dossier
   */
  private async generateReference(clientNom: string): Promise<string> {
    const year = DateTime.now().year
    const count = await Dossier.query()
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .count('* as total')
    
    const num = String(Number(count[0].$extras.total) + 1).padStart(3, '0')
    const nom = clientNom.substring(0, 3).toUpperCase()
    
    return year + '-' + num + '-' + nom
  }

  /**
   * GET /api/admin/dossiers
   * Liste des dossiers
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search', '')
    const statut = request.input('statut', '')
    const clientId = request.input('clientId', '')
    const responsableId = request.input('responsableId', '')

    let query = Dossier.query()
      .preload('client', (clientQuery) => clientQuery.preload('responsable'))
      .preload('assignedAdmin')
      .orderBy('created_at', 'desc')

    if (search) {
      query = query.where((builder) => {
        builder
          .whereILike('reference', '%' + search + '%')
          .orWhereILike('intitule', '%' + search + '%')
      })
    }

    if (statut) {
      query = query.where('statut', statut)
    }

    if (clientId) {
      query = query.where('client_id', clientId)
    }

    // Filter by client's responsable
    if (responsableId) {
      if (responsableId === 'none') {
        query = query.whereHas('client', (clientQuery) => {
          clientQuery.whereNull('responsable_id')
        })
      } else {
        query = query.whereHas('client', (clientQuery) => {
          clientQuery.where('responsable_id', responsableId)
        })
      }
    }

    const dossiers = await query.paginate(page, limit)

    return response.ok(dossiers)
  }

  /**
   * GET /api/admin/dossiers/:id
   * Detail d'un dossier
   */
  async show({ params, response }: HttpContext) {
    const dossier = await Dossier.query()
      .where('id', params.id)
      .preload('client')
      .preload('assignedAdmin')
      .preload('documents')
      .preload('evenements')
      .firstOrFail()

    return response.ok(dossier)
  }

  /**
   * POST /api/admin/dossiers
   * Creer un dossier
   */
  async store(ctx: HttpContext) {
    const { request, auth, response } = ctx
    const data = await request.validateUsing(createDossierValidator)
    const admin = auth.use('admin').user!

    // Verifier que le client existe
    const client = await Client.findOrFail(data.clientId)

    // Generer la reference
    const reference = await this.generateReference(client.nom)

    // Extraire les dates pour conversion
    const { dateOuverture, datePrescription, ...restData } = data

    const dossier = await Dossier.create({
      ...restData,
      reference,
      createdById: admin.id,
      dateOuverture: dateOuverture ? DateTime.fromISO(dateOuverture) : DateTime.now(),
      datePrescription: datePrescription ? DateTime.fromISO(datePrescription) : null,
    })

    // Recharger avec les relations
    await dossier.load('client')

    // Logger la creation du dossier
    await ActivityLogger.logDossierCreated(dossier.id, admin.id, {
      reference: dossier.reference,
      intitule: dossier.intitule,
      clientId: dossier.clientId,
      clientNom: client.nom,
    }, ctx)

    // Creer automatiquement le dossier OneDrive (en arriere-plan, sans bloquer)
    dossierFolderService.createDossierFolder(dossier.id).catch((err) => {
      console.error('Error creating OneDrive folder for dossier:', err)
    })

    return response.created(dossier)
  }

  /**
   * PUT /api/admin/dossiers/:id
   * Modifier un dossier
   */
  async update(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const dossier = await Dossier.findOrFail(params.id)
    const data = await request.validateUsing(updateDossierValidator)
    const admin = auth.use('admin').user!

    // Sauvegarder l'ancien statut pour detecter les changements
    const oldStatut = dossier.statut

    // Extraire les dates pour conversion
    const { dateCloture, datePrescription, ...restData } = data

    // Convertir les dates si presentes
    if (dateCloture !== undefined) {
      dossier.dateCloture = dateCloture ? DateTime.fromISO(dateCloture) : null
    }
    if (datePrescription !== undefined) {
      dossier.datePrescription = datePrescription ? DateTime.fromISO(datePrescription) : null
    }

    // Detecter les champs modifies
    const changedFields: string[] = []
    for (const [key, value] of Object.entries(restData)) {
      if (dossier.$attributes[key] !== value) {
        changedFields.push(key)
      }
    }

    dossier.merge(restData)
    await dossier.save()
    await dossier.load('client')

    // Logger le changement de statut si applicable
    if (data.statut && oldStatut !== data.statut) {
      await ActivityLogger.logDossierStatutChanged(dossier.id, admin.id, oldStatut, data.statut, ctx)
    } else if (changedFields.length > 0) {
      // Logger la modification generale
      await ActivityLogger.logDossierUpdated(dossier.id, admin.id, { changes: changedFields }, ctx)
    }

    return response.ok(dossier)
  }

  /**
   * DELETE /api/admin/dossiers/:id
   * Supprimer un dossier
   */
  async destroy({ params, response }: HttpContext) {
    const dossier = await Dossier.findOrFail(params.id)
    await dossier.delete()

    return response.ok({ message: 'Dossier supprime' })
  }

  /**
   * GET /api/admin/clients/:id/dossiers
   * Dossiers d'un client
   */
  async byClient({ params, response }: HttpContext) {
    const dossiers = await Dossier.query()
      .where('client_id', params.id)
      .preload('assignedAdmin')
      .orderBy('created_at', 'desc')

    return response.ok(dossiers)
  }
}
