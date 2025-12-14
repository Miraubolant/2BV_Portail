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
    metadata: {
      documentName: string
      documentType: string | null
      mimeType: string | null
      dossierLocation?: 'cabinet' | 'client'
    },
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
    metadata: { documentName: string; dossierLocation?: 'cabinet' | 'client' },
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

  /**
   * Log la creation d'une tache
   */
  static async logTaskCreated(
    taskId: string,
    dossierId: string,
    adminId: string,
    metadata: { titre: string; priorite?: string; assignedTo?: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'task.created',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la modification d'une tache
   */
  static async logTaskUpdated(
    taskId: string,
    dossierId: string,
    adminId: string,
    metadata: { titre: string; changes?: string[] },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'task.updated',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log le completion d'une tache
   */
  static async logTaskCompleted(
    taskId: string,
    dossierId: string,
    adminId: string,
    metadata: { titre: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'task.completed',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la reouverture d'une tache
   */
  static async logTaskReopened(
    taskId: string,
    dossierId: string,
    adminId: string,
    metadata: { titre: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'task.reopened',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log la suppression d'une tache
   */
  static async logTaskDeleted(
    taskId: string,
    dossierId: string,
    adminId: string,
    metadata: { titre: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'task.deleted',
      resourceType: 'task',
      resourceId: taskId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  // ============================================
  // EVENTS ONEDRIVE SYNC
  // ============================================

  /**
   * Log l'import d'un document depuis OneDrive (sync)
   */
  static async logDocumentImportedFromOneDrive(
    documentId: string,
    dossierId: string,
    metadata: {
      documentName: string
      documentType?: string | null
      mimeType?: string | null
      dossierLocation: 'cabinet' | 'client'
      onedriveFileId: string
      source: 'sync' | 'manual'
    }
  ) {
    return this.log({
      userId: null,
      userType: 'system',
      action: 'document.imported_onedrive',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
    })
  }

  /**
   * Log la mise à jour d'un document depuis OneDrive (sync)
   */
  static async logDocumentSyncedFromOneDrive(
    documentId: string,
    dossierId: string,
    metadata: {
      documentName: string
      onedriveFileId: string
      changes?: string[]
    }
  ) {
    return this.log({
      userId: null,
      userType: 'system',
      action: 'document.synced_onedrive',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
    })
  }

  /**
   * Log la détection d'un fichier supprimé sur OneDrive (sync)
   */
  static async logDocumentRemovedFromOneDrive(
    documentId: string,
    dossierId: string,
    metadata: {
      documentName: string
      onedriveFileId: string
    }
  ) {
    return this.log({
      userId: null,
      userType: 'system',
      action: 'document.removed_onedrive',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
    })
  }

  /**
   * Log une synchronisation OneDrive sur un dossier
   */
  static async logOneDriveSync(
    dossierId: string,
    adminId: string | null,
    metadata: {
      mode: 'manual' | 'auto'
      imported: number
      updated: number
      deleted: number
      errors: number
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: adminId ? 'admin' : 'system',
      action: 'onedrive.sync',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log le liage d'un dossier OneDrive
   */
  static async logDossierOneDriveLinked(
    dossierId: string,
    adminId: string,
    metadata: {
      onedriveFolderId: string
      onedriveFolderPath: string
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.onedrive_linked',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  // ============================================
  // EVENTS GOOGLE CALENDAR SYNC
  // ============================================

  /**
   * Log l'import d'un événement depuis Google Calendar
   */
  static async logEvenementImportedFromGoogle(
    evenementId: string,
    dossierId: string | null,
    metadata: {
      titre: string
      googleEventId: string
      googleCalendarId?: string
      googleCalendarName?: string
      source: 'sync' | 'manual'
    }
  ) {
    return this.log({
      userId: null,
      userType: 'system',
      action: 'evenement.imported_google',
      resourceType: 'evenement',
      resourceId: evenementId,
      metadata: dossierId ? { ...metadata, dossierId } : metadata,
    })
  }

  /**
   * Log la synchronisation d'un événement vers Google Calendar
   */
  static async logEvenementSyncedToGoogle(
    evenementId: string,
    adminId: string | null,
    metadata: {
      titre: string
      googleEventId: string
      googleCalendarId?: string
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: adminId ? 'admin' : 'system',
      action: 'evenement.synced_google',
      resourceType: 'evenement',
      resourceId: evenementId,
      metadata,
      ctx,
    })
  }

  /**
   * Log une synchronisation Google Calendar sur un dossier
   */
  static async logGoogleCalendarSync(
    dossierId: string,
    adminId: string | null,
    metadata: {
      mode: 'manual' | 'auto'
      imported: number
      updated: number
      errors: number
      calendarName?: string
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: adminId ? 'admin' : 'system',
      action: 'google_calendar.sync',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  // ============================================
  // EVENTS NOTE SUPPLEMENTAIRES
  // ============================================

  /**
   * Log la suppression d'une note
   */
  static async logNoteDeleted(
    noteId: string,
    dossierId: string,
    adminId: string,
    metadata: { preview?: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'note.deleted',
      resourceType: 'note',
      resourceId: noteId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log l'épinglage d'une note
   */
  static async logNotePinned(
    noteId: string,
    dossierId: string,
    adminId: string,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'note.pinned',
      resourceType: 'note',
      resourceId: noteId,
      metadata: { dossierId },
      ctx,
    })
  }

  /**
   * Log le désépinglage d'une note
   */
  static async logNoteUnpinned(
    noteId: string,
    dossierId: string,
    adminId: string,
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'note.unpinned',
      resourceType: 'note',
      resourceId: noteId,
      metadata: { dossierId },
      ctx,
    })
  }

  // ============================================
  // EVENTS DOSSIER SUPPLEMENTAIRES
  // ============================================

  /**
   * Log le changement de responsable d'un dossier
   */
  static async logDossierResponsableChanged(
    dossierId: string,
    adminId: string,
    metadata: {
      oldResponsable?: { id: string; nom: string }
      newResponsable: { id: string; nom: string }
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.responsable_changed',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log le changement de client d'un dossier
   */
  static async logDossierClientChanged(
    dossierId: string,
    adminId: string,
    metadata: {
      oldClient?: { id: string; nom: string }
      newClient: { id: string; nom: string }
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.client_changed',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log l'archivage d'un dossier
   */
  static async logDossierArchived(
    dossierId: string,
    adminId: string,
    metadata: { reference: string; intitule: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.archived',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  /**
   * Log la réouverture d'un dossier archivé
   */
  static async logDossierReopened(
    dossierId: string,
    adminId: string,
    metadata: { reference: string; intitule: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'dossier.reopened',
      resourceType: 'dossier',
      resourceId: dossierId,
      metadata,
      ctx,
    })
  }

  // ============================================
  // EVENTS DOCUMENT SUPPLEMENTAIRES
  // ============================================

  /**
   * Log le changement de visibilité d'un document
   */
  static async logDocumentVisibilityChanged(
    documentId: string,
    dossierId: string,
    adminId: string,
    metadata: {
      documentName: string
      oldVisibility: boolean
      newVisibility: boolean
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'document.visibility_changed',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log le déplacement d'un document entre dossiers OneDrive
   */
  static async logDocumentMoved(
    documentId: string,
    dossierId: string,
    adminId: string,
    metadata: {
      documentName: string
      oldLocation: 'cabinet' | 'client'
      newLocation: 'cabinet' | 'client'
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'document.moved',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log le renommage d'un document
   */
  static async logDocumentRenamed(
    documentId: string,
    dossierId: string,
    adminId: string,
    metadata: {
      oldName: string
      newName: string
    },
    ctx?: HttpContext
  ) {
    return this.log({
      userId: adminId,
      userType: 'admin',
      action: 'document.renamed',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }

  /**
   * Log le téléchargement d'un document par un client
   */
  static async logDocumentDownloaded(
    documentId: string,
    dossierId: string,
    userId: string,
    userType: 'admin' | 'client',
    metadata: { documentName: string },
    ctx?: HttpContext
  ) {
    return this.log({
      userId,
      userType,
      action: 'document.downloaded',
      resourceType: 'document',
      resourceId: documentId,
      metadata: { ...metadata, dossierId },
      ctx,
    })
  }
}
