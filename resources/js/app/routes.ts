// Base routes
export const BASE_ROUTE = '/'

// Auth routes
export const AUTH_ADMIN_LOGIN = '/admin/login'
export const AUTH_ADMIN_TOTP = '/admin/totp'
export const AUTH_CLIENT_LOGIN = '/client/login'
export const AUTH_CLIENT_TOTP = '/client/totp'

// Admin routes
export const ADMIN_ROUTE = '/admin'
export const ADMIN_DASHBOARD = ADMIN_ROUTE + '/dashboard'
export const ADMIN_CLIENTS = ADMIN_ROUTE + '/clients'
export const ADMIN_CLIENT_DETAIL = ADMIN_ROUTE + '/clients/:id'
export const ADMIN_DOSSIERS = ADMIN_ROUTE + '/dossiers'
export const ADMIN_DOSSIER_DETAIL = ADMIN_ROUTE + '/dossiers/:id'
export const ADMIN_EVENEMENTS = ADMIN_ROUTE + '/evenements'
export const ADMIN_DEMANDES_RDV = ADMIN_ROUTE + '/demandes-rdv'
export const ADMIN_PARAMETRES = ADMIN_ROUTE + '/parametres'
export const ADMIN_ADMINS = ADMIN_ROUTE + '/admins'
export const ADMIN_PROFILE = ADMIN_ROUTE + '/profile'

// Client routes
export const CLIENT_ROUTE = '/espace-client'
export const CLIENT_DASHBOARD = CLIENT_ROUTE + '/dashboard'
export const CLIENT_DOSSIERS = CLIENT_ROUTE + '/dossiers'
export const CLIENT_DOSSIER_DETAIL = CLIENT_ROUTE + '/dossiers/:id'
export const CLIENT_DEMANDES_RDV = CLIENT_ROUTE + '/demandes-rdv'
export const CLIENT_PARAMETRES = CLIENT_ROUTE + '/parametres'
export const CLIENT_PROFILE = CLIENT_ROUTE + '/profile'
