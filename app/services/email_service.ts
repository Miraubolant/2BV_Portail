import { Resend } from 'resend'
import env from '#start/env'
import Parametre from '#models/parametre'
import Notification from '#models/notification'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface DocumentNotificationData {
  documentName: string
  dossierName: string
  dossierReference: string
  uploaderName: string
  recipientName: string
  portalUrl: string
}

class EmailService {
  private resend: Resend | null = null

  private getResendClient(): Resend | null {
    const apiKey = env.get('RESEND_API_KEY')
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not configured')
      return null
    }
    if (!this.resend) {
      this.resend = new Resend(apiKey)
    }
    return this.resend
  }

  /**
   * Get email configuration from parameters
   */
  async getEmailConfig(): Promise<{ enabled: boolean; fromEmail: string; fromName: string }> {
    const params = await Parametre.query().whereIn('cle', [
      'email_enabled',
      'email_from_address',
      'email_from_name',
    ])

    const config: Record<string, string | null> = {}
    for (const param of params) {
      config[param.cle] = param.valeur
    }

    return {
      enabled: config['email_enabled'] === 'true',
      fromEmail: config['email_from_address'] || env.get('EMAIL_FROM', 'noreply@cabinet.fr'),
      fromName: config['email_from_name'] || 'Cabinet',
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    const config = await this.getEmailConfig()

    if (!config.enabled) {
      logger.info('Email sending is disabled in parameters')
      return { success: false, error: 'Email disabled' }
    }

    const resend = this.getResendClient()
    if (!resend) {
      return { success: false, error: 'Resend not configured' }
    }

    try {
      await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      return { success: true }
    } catch (error) {
      logger.error({ err: error }, 'Error sending email')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create a notification record and optionally send email
   */
  async createNotification(data: {
    destinataireType: 'admin' | 'client'
    destinataireId: string
    type: string
    titre: string
    message: string
    lien?: string
    sendEmail: boolean
    emailTo?: string
  }): Promise<Notification> {
    const notification = await Notification.create({
      destinataireType: data.destinataireType,
      destinataireId: data.destinataireId,
      type: data.type,
      titre: data.titre,
      message: data.message,
      lien: data.lien || null,
      lu: false,
      emailEnvoye: false,
    })

    if (data.sendEmail && data.emailTo) {
      const result = await this.send({
        to: data.emailTo,
        subject: data.titre,
        html: this.wrapInTemplate(data.titre, data.message, data.lien),
      })

      if (result.success) {
        notification.emailEnvoye = true
        notification.emailEnvoyeAt = DateTime.now()
        await notification.save()
      }
    }

    return notification
  }

  /**
   * Notify client when admin uploads a document
   */
  async notifyClientNewDocument(
    clientEmail: string,
    clientId: string,
    _clientName: string,
    data: DocumentNotificationData
  ): Promise<void> {
    const message = `
      Un nouveau document a ete ajoute a votre dossier "${data.dossierName}" (Ref: ${data.dossierReference}).

      Document: ${data.documentName}
      Ajoute par: ${data.uploaderName}

      Connectez-vous a votre espace client pour le consulter.
    `.trim()

    await this.createNotification({
      destinataireType: 'client',
      destinataireId: clientId,
      type: 'document_added',
      titre: 'Nouveau document disponible',
      message,
      lien: `/client/dossiers/${data.dossierReference}`,
      sendEmail: true,
      emailTo: clientEmail,
    })
  }

  /**
   * Notify admin when client uploads a document
   */
  async notifyAdminClientUpload(
    adminEmail: string,
    adminId: string,
    _adminName: string,
    data: DocumentNotificationData
  ): Promise<void> {
    const message = `
      Le client ${data.uploaderName} a ajoute un nouveau document au dossier "${data.dossierName}" (Ref: ${data.dossierReference}).

      Document: ${data.documentName}

      Connectez-vous a votre espace administrateur pour le consulter.
    `.trim()

    await this.createNotification({
      destinataireType: 'admin',
      destinataireId: adminId,
      type: 'client_document_upload',
      titre: 'Nouveau document client',
      message,
      lien: `/admin/dossiers/${data.dossierReference}`,
      sendEmail: true,
      emailTo: adminEmail,
    })
  }

  /**
   * Wrap message in a simple HTML template
   */
  private wrapInTemplate(title: string, message: string, link?: string | null): string {
    const linkHtml = link
      ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acceder au portail</a></p>`
      : ''

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 30px;">
            <h1 style="color: #1e40af; margin-bottom: 20px; font-size: 24px;">${title}</h1>
            <div style="white-space: pre-line; margin-bottom: 20px;">
              ${message}
            </div>
            ${linkHtml}
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px; text-align: center;">
            Cet email a ete envoye automatiquement par le portail client.
          </p>
        </body>
      </html>
    `
  }
}

export default new EmailService()
