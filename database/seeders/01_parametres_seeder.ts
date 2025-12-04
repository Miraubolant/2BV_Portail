import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Parametre from '#models/parametre'

export default class ParametresSeeder extends BaseSeeder {
  async run() {
    const parametres = [
      // General
      { cle: 'cabinet_nom', valeur: "Cabinet d'Avocats", type: 'string', categorie: 'general', description: 'Nom du cabinet' },
      { cle: 'cabinet_email', valeur: '', type: 'string', categorie: 'general', description: 'Email principal' },
      { cle: 'cabinet_telephone', valeur: '', type: 'string', categorie: 'general', description: 'Telephone' },
      { cle: 'cabinet_fax', valeur: '', type: 'string', categorie: 'general', description: 'Fax' },
      { cle: 'cabinet_adresse', valeur: '', type: 'string', categorie: 'general', description: 'Adresse' },

      // OneDrive
      { cle: 'onedrive_enabled', valeur: 'false', type: 'boolean', categorie: 'onedrive', description: 'Activer OneDrive' },
      { cle: 'onedrive_root_folder', valeur: '/Clients', type: 'string', categorie: 'onedrive', description: 'Dossier racine' },
      { cle: 'onedrive_auto_sync', valeur: 'true', type: 'boolean', categorie: 'onedrive', description: 'Sync automatique' },
      { cle: 'onedrive_sync_interval', valeur: '15', type: 'number', categorie: 'onedrive', description: 'Intervalle (min)' },
      { cle: 'onedrive_create_folder_on_dossier', valeur: 'true', type: 'boolean', categorie: 'onedrive', description: 'Creer dossier auto' },
      { cle: 'onedrive_folder_structure', valeur: '["Actes", "Pieces", "Correspondances", "Factures"]', type: 'json', categorie: 'onedrive', description: 'Sous-dossiers' },

      // Google Calendar
      { cle: 'google_calendar_enabled', valeur: 'false', type: 'boolean', categorie: 'google', description: 'Activer Google Calendar' },
      { cle: 'google_calendar_id', valeur: 'primary', type: 'string', categorie: 'google', description: 'ID du calendrier' },
      { cle: 'google_auto_sync', valeur: 'true', type: 'boolean', categorie: 'google', description: 'Sync automatique' },
      { cle: 'google_sync_interval', valeur: '10', type: 'number', categorie: 'google', description: 'Intervalle (min)' },
      { cle: 'google_default_reminder', valeur: '60', type: 'number', categorie: 'google', description: 'Rappel defaut (min)' },
      { cle: 'google_event_color', valeur: '9', type: 'string', categorie: 'google', description: 'Couleur evenements' },

      // Email
      { cle: 'email_enabled', valeur: 'true', type: 'boolean', categorie: 'email', description: 'Activer emails' },
      { cle: 'email_from_name', valeur: 'Cabinet', type: 'string', categorie: 'email', description: 'Nom expediteur' },
      { cle: 'email_from_address', valeur: '', type: 'string', categorie: 'email', description: 'Email expediteur' },
      { cle: 'email_notif_document', valeur: 'true', type: 'boolean', categorie: 'email', description: 'Notif nouveau document' },
      { cle: 'email_notif_evenement', valeur: 'true', type: 'boolean', categorie: 'email', description: 'Notif evenement' },
      { cle: 'email_rappel_j7', valeur: 'true', type: 'boolean', categorie: 'email', description: 'Rappel J-7' },
      { cle: 'email_rappel_j1', valeur: 'true', type: 'boolean', categorie: 'email', description: 'Rappel J-1' },

      // Securite
      { cle: '2fa_obligatoire_client', valeur: 'true', type: 'boolean', categorie: 'securite', description: '2FA clients' },
      { cle: '2fa_obligatoire_admin', valeur: 'false', type: 'boolean', categorie: 'securite', description: '2FA admins' },
      { cle: 'session_timeout', valeur: '60', type: 'number', categorie: 'securite', description: 'Timeout (min)' },
      { cle: 'max_login_attempts', valeur: '5', type: 'number', categorie: 'securite', description: 'Tentatives max' },
      { cle: 'password_min_length', valeur: '8', type: 'number', categorie: 'securite', description: 'Longueur mdp min' },

      // Clients (defauts creation)
      { cle: 'client_default_peut_uploader', valeur: 'true', type: 'boolean', categorie: 'clients', description: 'Upload par defaut' },
      { cle: 'client_default_peut_rdv', valeur: 'true', type: 'boolean', categorie: 'clients', description: 'RDV par defaut' },
      { cle: 'client_password_auto', valeur: 'true', type: 'boolean', categorie: 'clients', description: 'Generer mdp auto' },
      { cle: 'client_send_welcome_email', valeur: 'true', type: 'boolean', categorie: 'clients', description: 'Email bienvenue' },

      // Dossiers
      { cle: 'dossier_reference_format', valeur: 'YYYY-NNN-NOM', type: 'string', categorie: 'dossiers', description: 'Format reference' },
      { cle: 'dossier_types_affaire', valeur: '["divorce","succession","penal","civil","commercial","immobilier","travail","autre"]', type: 'json', categorie: 'dossiers', description: 'Types affaire' },
      { cle: 'dossier_statuts', valeur: '["nouveau","en_cours","en_attente","audience_prevue","en_delibere","cloture_gagne","cloture_perdu","cloture_accord","archive"]', type: 'json', categorie: 'dossiers', description: 'Statuts' },
    ]

    for (const param of parametres) {
      await Parametre.updateOrCreate(
        { cle: param.cle },
        param
      )
    }

    console.log('Parametres initialises avec succes')
  }
}
