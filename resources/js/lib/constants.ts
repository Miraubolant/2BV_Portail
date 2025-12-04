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

// Client APIs
export const CLIENT_DASHBOARD_API = API_BASE_URL + 'client/dashboard'
export const CLIENT_DOSSIERS_API = API_BASE_URL + 'client/dossiers'
export const CLIENT_DEMANDES_RDV_API = API_BASE_URL + 'client/demandes-rdv'

// Currency formatter
export const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

// Date formatter
export const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
  }).format(new Date(date))
}

export const formatDateTime = (date: string | Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}
