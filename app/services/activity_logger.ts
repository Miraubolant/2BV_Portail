import ActivityLog from '#models/activity_log'
import type { HttpContext } from '@adonisjs/core/http'

interface LogParams {
  userId: string | null
  userType: 'admin' | 'client' | 'system'
  action: string
  resourceType: string
  resourceId: string
  metadata?: Record<string, any>
  ctx?: HttpContext
}

/**
 * Service pour logger les activites de maniere coherente
 * Utilise pour alimenter la timeline des dossiers
 */
export default class ActivityLogger {
  /**
   * Log une activite
   */
  static async log(params: LogParams): Promise<ActivityLog> {
    return await ActivityLog.create({
      userId: params.userId,
      userType: params.userType,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      ipAddress: params.ctx?.request.ip() || null,
      userAgent: params.ctx?.request.header('user-agent') || null,
    })
  }

  /**
   * Log la creation d'un dossier
   */
  static async logDossierCreated(
    dossierId: string,
    adminId: string,
    metadata: Record<string, any>,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.created',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log la modification du statut d'un dossier
   */
  static async logDossierStatutChanged(
    dossierId: string,
    adminId: string,
    oldStatut: string,
    newStatut: string,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.statut_changed',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata: { oldStatut, newStatut },
      ctx,
    })
  }

  /**
   * Log la modification d'un dossier
   */
  static async logDossierUpdated(
    dossierId: string,
    adminId: string,
    metadata: Record<string, any>,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.updated',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log l'upload d'un document
   */
  static async logDocumentUploaded(
    documentId: string,
    dossierId: string,
    userId: string,
    userType: 'admin' | 'client',
    metadata: { documentName: string; documentType: string | null; mimeType: string | null },
    ctx?: HttpContext
  ) {
    return this.log({
      userId,
      userType,
      action: 'document.uploaded',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la suppression d'un document
   */
  static async logDocumentDeleted(
    documentId: string,
    dossierId: string,
    adminId: string,
    metadata: { documentName: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'document.deleted',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la creation d'un evenement
   */
  static async logEvenementCreated(
    evenementId: string,
    adminId: string,
    metadata: Record<string, any>,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'evenement.created',
      resourceType: 'evenement',
      resourceId: evenementId,
      metadata,
      ctx,
    })
  }

  /**
   * Log la modification d'un evenement
   */
  static async logEvenementUpdated(
    evenementId: string,
    adminId: string,
    metadata: Record<string, any>,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'evenement.updated',
      resourceType: 'evenement',
      resourceId: evenementId,
      metadata,
      ctx,
    })
  }

  /**
   * Log la suppression d'un evenement
   */
  static async logEvenementDeleted(
    evenementId: string,
    adminId: string,
    metadata: Record<string, any>,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'evenement.deleted',
      resourceType: 'evenement',
      resourceId: evenementId,
      metadata,
      ctx,
    })
  }

  /**
   * Log l'ajout d'une note
   */
  static async logNoteCreated(
    noteId: string,
    dossierId: string,
    adminId: string,
    metadata: { preview: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'note.created',
      resourceType: 'note',
      resourceId: noteId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la modification d'une note
   */
  static async logNoteUpdated(
    noteId: string,
    dossierId: string,
    adminId: string,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'note.updated',
      resourceType: 'note',
      resourceId: noteId,
      metadata: { dossierId },
      ctx,
    })
  }
}
