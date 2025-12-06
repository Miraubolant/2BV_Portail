export const USER_KEY = 'portail_cabinet.user'
export const API_BASE_URL = '/api/'

// Auth Admin (prefix: api/admin/auth)
const AUTH_ADMIN = API_BASE_URL + 'admin/auth/'
export const ADMIN_LOGIN_API = AUTH_ADMIN + 'login'
export const ADMIN_LOGOUT_API = AUTH_ADMIN + 'logout'
export const ADMIN_ME_API = AUTH_ADMIN + 'me'
export const ADMIN_TOTP_SETUP_API = AUTH_ADMIN + 'setup-totp'
export const ADMIN_TOTP_VERIFY_API = AUTH_ADMIN + 'verify-totp'

// Auth Client (prefix: api/client/auth)
const AUTH_CLIENT = API_BASE_URL + 'client/auth/'
export const CLIENT_LOGIN_API = AUTH_CLIENT + 'login'
export const CLIENT_LOGOUT_API = AUTH_CLIENT + 'logout'
export const CLIENT_ME_API = AUTH_CLIENT + 'me'
export const CLIENT_TOTP_STATUS_API = AUTH_CLIENT + 'totp-status'
export const CLIENT_TOTP_SETUP_API = AUTH_CLIENT + 'setup-totp'
export const CLIENT_TOTP_CONFIRM_API = AUTH_CLIENT + 'confirm-totp'
export const CLIENT_TOTP_VERIFY_API = AUTH_CLIENT + 'verify-totp'

// Admin APIs
export const ADMIN_DASHBOARD_API = API_BASE_URL + 'admin/dashboard'
export const ADMIN_CLIENTS_API = API_BASE_URL + 'admin/clients'
export const ADMIN_DOSSIERS_API = API_BASE_URL + 'admin/dossiers'
export const ADMIN_EVENEMENTS_API = API_BASE_URL + 'admin/evenements'
export const ADMIN_DEMANDES_RDV_API = API_BASE_URL + 'admin/demandes-rdv'
export const ADMIN_PARAMETRES_API = API_BASE_URL + 'admin/parametres'
export const ADMIN_ADMINS_API = API_BASE_URL + 'admin/admins'
export const ADMIN_RESPONSABLES_API = API_BASE_URL + 'admin/responsables'
export const ADMIN_FAVORIS_API = API_BASE_URL + 'admin/favoris'
export const ADMIN_SEARCH_API = API_BASE_URL + 'admin/search'
export const ADMIN_NOTIFICATIONS_API = API_BASE_URL + 'admin/notifications'
export const ADMIN_TIMELINE_API = (dossierId: string) => API_BASE_URL + 'admin/dossiers/' + dossierId + '/timeline'
export const ADMIN_NOTES_API = (dossierId: string) => API_BASE_URL + 'admin/dossiers/' + dossierId + '/notes'
export const ADMIN_NOTE_API = (noteId: string) => API_BASE_URL + 'admin/notes/' + noteId

// Client APIs
export const CLIENT_DASHBOARD_API = API_BASE_URL + 'client/dashboard'
export const CLIENT_DOSSIERS_API = API_BASE_URL + 'client/dossiers'
export const CLIENT_DEMANDES_RDV_API = API_BASE_URL + 'client/demandes-rdv'

// Microsoft/OneDrive APIs
const MICROSOFT_API = API_BASE_URL + 'admin/microsoft/'
export const MICROSOFT_STATUS_API = MICROSOFT_API + 'status'
export const MICROSOFT_AUTHORIZE_API = MICROSOFT_API + 'authorize'
export const MICROSOFT_DISCONNECT_API = MICROSOFT_API + 'disconnect'
export const MICROSOFT_TEST_API = MICROSOFT_API + 'test'
export const MICROSOFT_SYNC_API = MICROSOFT_API + 'sync'
export const MICROSOFT_SYNC_DOSSIER_API = (dossierId: string) => MICROSOFT_API + 'sync/' + dossierId
export const MICROSOFT_INITIALIZE_API = MICROSOFT_API + 'initialize'
export const MICROSOFT_SYNC_HISTORY_API = MICROSOFT_API + 'sync-history'

// Google Calendar APIs
const GOOGLE_API = API_BASE_URL + 'admin/google/'
export const GOOGLE_STATUS_API = GOOGLE_API + 'status'
export const GOOGLE_AUTHORIZE_API = GOOGLE_API + 'authorize'
export const GOOGLE_DISCONNECT_API = GOOGLE_API + 'disconnect'
export const GOOGLE_TEST_API = GOOGLE_API + 'test'
export const GOOGLE_CALENDARS_API = GOOGLE_API + 'calendars'
export const GOOGLE_SELECT_CALENDAR_API = GOOGLE_API + 'select-calendar'
export const GOOGLE_SYNC_API = GOOGLE_API + 'sync'
export const GOOGLE_SYNC_HISTORY_API = GOOGLE_API + 'sync-history'
export const GOOGLE_SYNC_MODE_API = GOOGLE_API + 'sync-mode'

// Currency formatter
export const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

// Date formatter
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(d)
  } catch {
    return '-'
  }
}

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return '-'
  }
}
