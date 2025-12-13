/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import transmit from '@adonisjs/transmit/services/main'
import { middleware } from './kernel.js'

// Lazy load controllers
const HealthController = () => import('#controllers/health_controller')
const AdminAuthController = () => import('#controllers/auth/admin_auth_controller')
const ClientAuthController = () => import('#controllers/auth/client_auth_controller')
const AdminDashboardController = () => import('#controllers/admin/dashboard_controller')
const AdminClientsController = () => import('#controllers/admin/clients_controller')
const AdminDossiersController = () => import('#controllers/admin/dossiers_controller')
const AdminEvenementsController = () => import('#controllers/admin/evenements_controller')
const AdminDemandesRdvController = () => import('#controllers/admin/demandes_rdv_controller')
const AdminAdminsController = () => import('#controllers/admin/admins_controller')
const AdminParametresController = () => import('#controllers/admin/parametres_controller')
const ClientDashboardController = () => import('#controllers/client/dashboard_controller')
const ClientDossiersController = () => import('#controllers/client/dossiers_controller')
const ClientRdvController = () => import('#controllers/client/rdv_controller')
const AdminDocumentsController = () => import('#controllers/admin/documents_controller')
const ClientDocumentsController = () => import('#controllers/client/documents_controller')
const MicrosoftOAuthController = () => import('#controllers/admin/microsoft_oauth_controller')
const GoogleOAuthController = () => import('#controllers/admin/google_oauth_controller')
const AdminFavorisController = () => import('#controllers/admin/favoris_controller')
const AdminSearchController = () => import('#controllers/admin/search_controller')
const AdminNotificationsController = () => import('#controllers/admin/notifications_controller')
const AdminTimelineController = () => import('#controllers/admin/timeline_controller')
const AdminNotesController = () => import('#controllers/admin/notes_controller')
const AdminTasksController = () => import('#controllers/admin/tasks_controller')
const AdminIntegrationsController = () => import('#controllers/admin/integrations_controller')
const ClientSettingsController = () => import('#controllers/client/settings_controller')

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════
router.get('/health', [HealthController, 'index'])
router.get('/api/health', [HealthController, 'index'])

// ══════════════════════════════════════════════════════════════
// TRANSMIT (SSE) - Real-time updates
// ══════════════════════════════════════════════════════════════
transmit.registerRoutes()

// ══════════════════════════════════════════════════════════════
// AUTH - ADMIN
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Login avec rate limiting pour eviter les attaques brute force
  router.post('login', [AdminAuthController, 'login']).use(middleware.rateLimiter())
  router.post('verify-totp', [AdminAuthController, 'verifyTotp']).use(middleware.rateLimiter())
  router.post('logout', [AdminAuthController, 'logout']).use(middleware.adminAuth())
  router.get('me', [AdminAuthController, 'me']).use(middleware.adminAuth())
  router.put('notifications', [AdminAuthController, 'updateNotifications']).use(middleware.adminAuth())
  router.put('password', [AdminAuthController, 'changePassword']).use(middleware.adminAuth())
  router.post('setup-totp', [AdminAuthController, 'setupTotp']).use(middleware.adminAuth())
  router.post('confirm-totp', [AdminAuthController, 'confirmTotp']).use(middleware.adminAuth())
}).prefix('api/admin/auth')

// ══════════════════════════════════════════════════════════════
// AUTH - CLIENT
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Login avec rate limiting pour eviter les attaques brute force
  router.post('login', [ClientAuthController, 'login']).use(middleware.rateLimiter())
  router.get('totp-status', [ClientAuthController, 'totpStatus']).use(middleware.clientAuth())
  router.post('setup-totp', [ClientAuthController, 'setupTotp']).use(middleware.clientAuth())
  router.post('confirm-totp', [ClientAuthController, 'confirmTotp']).use(middleware.clientAuth())
  router.post('verify-totp', [ClientAuthController, 'verifyTotp']).use([middleware.clientAuth(), middleware.rateLimiter()])
  router.post('logout', [ClientAuthController, 'logout']).use(middleware.clientAuth())
  router.get('me', [ClientAuthController, 'me']).use([middleware.clientAuth(), middleware.totpVerified()])
}).prefix('api/client/auth')

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES (Admin + Super Admin)
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Dashboard
  router.get('dashboard', [AdminDashboardController, 'index'])

  // Clients
  router.get('clients', [AdminClientsController, 'index'])
  router.post('clients', [AdminClientsController, 'store'])
  router.get('clients/:id', [AdminClientsController, 'show'])
  router.put('clients/:id', [AdminClientsController, 'update'])
  router.delete('clients/:id', [AdminClientsController, 'destroy'])
  router.post('clients/:id/reset-password', [AdminClientsController, 'resetPassword'])
  router.get('clients/:id/dossiers', [AdminDossiersController, 'byClient'])

  // Dossiers
  router.get('dossiers', [AdminDossiersController, 'index'])
  router.post('dossiers', [AdminDossiersController, 'store'])
  router.get('dossiers/:id', [AdminDossiersController, 'show'])
  router.put('dossiers/:id', [AdminDossiersController, 'update'])
  router.delete('dossiers/:id', [AdminDossiersController, 'destroy'])
  router.get('dossiers/:id/evenements', [AdminEvenementsController, 'byDossier'])
  router.get('dossiers/:id/timeline', [AdminTimelineController, 'index'])

  // Notes
  router.get('dossiers/:dossierId/notes', [AdminNotesController, 'index'])
  router.post('dossiers/:dossierId/notes', [AdminNotesController, 'store'])
  router.put('notes/:id', [AdminNotesController, 'update'])
  router.delete('notes/:id', [AdminNotesController, 'destroy'])
  router.post('notes/:id/pin', [AdminNotesController, 'togglePin'])

  // Tasks
  router.get('tasks/my', [AdminTasksController, 'myTasks'])
  router.get('dossiers/:dossierId/tasks', [AdminTasksController, 'index'])
  router.post('dossiers/:dossierId/tasks', [AdminTasksController, 'store'])
  router.put('tasks/:id', [AdminTasksController, 'update'])
  router.delete('tasks/:id', [AdminTasksController, 'destroy'])
  router.post('tasks/:id/complete', [AdminTasksController, 'complete'])
  router.post('tasks/:id/reopen', [AdminTasksController, 'reopen'])

  // Documents
  router.get('dossiers/:dossierId/documents', [AdminDocumentsController, 'index'])
  router.post('dossiers/:dossierId/documents', [AdminDocumentsController, 'store'])
  router.post('dossiers/:dossierId/documents/upload', [AdminDocumentsController, 'upload'])
  router.get('documents/:id/download', [AdminDocumentsController, 'download'])
  router.get('documents/:id/url', [AdminDocumentsController, 'getDownloadUrl'])
  router.get('documents/:id/thumbnail', [AdminDocumentsController, 'thumbnail'])
  router.put('documents/:id', [AdminDocumentsController, 'update'])
  router.delete('documents/:id', [AdminDocumentsController, 'destroy'])
  router.post('documents/:id/move', [AdminDocumentsController, 'moveLocation'])

  // Evenements
  router.get('evenements', [AdminEvenementsController, 'index'])
  router.post('evenements', [AdminEvenementsController, 'store'])
  router.get('evenements/:id', [AdminEvenementsController, 'show'])
  router.put('evenements/:id', [AdminEvenementsController, 'update'])
  router.delete('evenements/:id', [AdminEvenementsController, 'destroy'])

  // Demandes RDV
  router.get('demandes-rdv', [AdminDemandesRdvController, 'index'])
  router.get('demandes-rdv/filters', [AdminDemandesRdvController, 'filters'])
  router.get('demandes-rdv/:id', [AdminDemandesRdvController, 'show'])
  router.post('demandes-rdv/:id/accepter', [AdminDemandesRdvController, 'accepter'])
  router.post('demandes-rdv/:id/refuser', [AdminDemandesRdvController, 'refuser'])

  // Liste des responsables (pour les dropdowns)
  router.get('responsables', [AdminAdminsController, 'responsables'])

  // Favoris
  router.get('favoris', [AdminFavorisController, 'index'])
  router.post('favoris', [AdminFavorisController, 'store'])
  router.delete('favoris/:id', [AdminFavorisController, 'destroy'])
  router.post('favoris/toggle', [AdminFavorisController, 'toggle'])
  router.get('favoris/check', [AdminFavorisController, 'check'])

  // Recherche globale
  router.get('search', [AdminSearchController, 'search'])

  // Notifications
  router.get('notifications', [AdminNotificationsController, 'index'])
  router.get('notifications/unread-count', [AdminNotificationsController, 'unreadCount'])
  router.post('notifications/:id/read', [AdminNotificationsController, 'markAsRead'])
  router.post('notifications/read-all', [AdminNotificationsController, 'markAllAsRead'])
  router.delete('notifications/:id', [AdminNotificationsController, 'destroy'])

  // Integrations health & monitoring
  router.get('integrations/health', [AdminIntegrationsController, 'health'])
  router.get('integrations/sync-history', [AdminIntegrationsController, 'syncHistory'])
  router.get('integrations/statistics', [AdminIntegrationsController, 'statistics'])
  router.post('integrations/health-check', [AdminIntegrationsController, 'performHealthCheck'])

}).prefix('api/admin').use(middleware.adminAuth())

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN ROUTES
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Gestion admins
  router.get('admins', [AdminAdminsController, 'index'])
  router.post('admins', [AdminAdminsController, 'store'])
  router.get('admins/:id', [AdminAdminsController, 'show'])
  router.put('admins/:id', [AdminAdminsController, 'update'])
  router.delete('admins/:id', [AdminAdminsController, 'destroy'])
  router.post('admins/:id/toggle-status', [AdminAdminsController, 'toggleStatus'])
  router.post('admins/:id/reset-password', [AdminAdminsController, 'resetPassword'])

  // Parametres
  router.get('parametres', [AdminParametresController, 'index'])
  router.get('parametres/value/:cle', [AdminParametresController, 'getValue'])
  router.get('parametres/:categorie', [AdminParametresController, 'byCategorie'])
  router.put('parametres', [AdminParametresController, 'update'])

}).prefix('api/admin').use([middleware.adminAuth(), middleware.superAdmin()])

// ══════════════════════════════════════════════════════════════
// MICROSOFT OAUTH (OneDrive)
// ══════════════════════════════════════════════════════════════
// Callback route (public - called by Microsoft)
router.get('/api/admin/microsoft/callback', [MicrosoftOAuthController, 'callback'])

// Protected Microsoft routes (Super Admin only)
router.group(() => {
  router.get('status', [MicrosoftOAuthController, 'status'])
  router.get('authorize', [MicrosoftOAuthController, 'authorize'])
  router.post('disconnect', [MicrosoftOAuthController, 'disconnect'])
  router.get('test', [MicrosoftOAuthController, 'test'])
  // Sync routes
  router.post('sync', [MicrosoftOAuthController, 'syncAll'])
  router.post('sync/:dossierId', [MicrosoftOAuthController, 'syncDossier'])
  router.post('initialize', [MicrosoftOAuthController, 'initialize'])
  router.get('sync-history', [MicrosoftOAuthController, 'syncHistory'])
}).prefix('api/admin/microsoft').use([middleware.adminAuth(), middleware.superAdmin()])

// ══════════════════════════════════════════════════════════════
// GOOGLE OAUTH (Calendar)
// ══════════════════════════════════════════════════════════════
// Callback route (public - called by Google)
router.get('/api/admin/google/callback', [GoogleOAuthController, 'callback'])

// Protected Google routes (Super Admin only)
router.group(() => {
  router.get('status', [GoogleOAuthController, 'status'])
  router.get('authorize', [GoogleOAuthController, 'authorize'])
  router.post('disconnect', [GoogleOAuthController, 'disconnect'])
  router.get('test', [GoogleOAuthController, 'test'])
  // Calendar selection
  router.get('calendars', [GoogleOAuthController, 'listCalendars'])
  router.post('select-calendar', [GoogleOAuthController, 'selectCalendar'])
  // Sync routes
  router.post('sync', [GoogleOAuthController, 'syncAll'])
  router.get('sync-history', [GoogleOAuthController, 'syncHistory'])
  router.post('sync-mode', [GoogleOAuthController, 'updateSyncMode'])
}).prefix('api/admin/google').use([middleware.adminAuth(), middleware.superAdmin()])

// ══════════════════════════════════════════════════════════════
// CLIENT ROUTES
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Dashboard
  router.get('dashboard', [ClientDashboardController, 'index'])

  // Mes dossiers
  router.get('dossiers', [ClientDossiersController, 'index'])
  router.get('dossiers/:id', [ClientDossiersController, 'show'])

  // Documents
  router.get('dossiers/:dossierId/documents', [ClientDocumentsController, 'index'])
  router.post('dossiers/:dossierId/documents', [ClientDocumentsController, 'store'])
  router.post('dossiers/:dossierId/documents/upload', [ClientDocumentsController, 'upload'])
  router.get('documents/:id/download', [ClientDocumentsController, 'download'])
  router.get('documents/:id/thumbnail', [ClientDocumentsController, 'thumbnail'])

  // Demandes RDV
  router.get('demandes-rdv', [ClientRdvController, 'index'])
  router.post('demande-rdv', [ClientRdvController, 'store'])
  router.get('demandes-rdv/:id', [ClientRdvController, 'show'])

  // Parametres client
  router.get('settings', [ClientSettingsController, 'index'])
  router.post('settings/change-password', [ClientSettingsController, 'changePassword'])
  router.post('settings/enable-totp', [ClientSettingsController, 'enableTotp'])
  router.post('settings/confirm-totp', [ClientSettingsController, 'confirmTotp'])
  router.post('settings/disable-totp', [ClientSettingsController, 'disableTotp'])
  router.put('settings/notifications', [ClientSettingsController, 'updateNotifications'])

}).prefix('api/client').use([middleware.clientAuth(), middleware.totpVerified()])

// ══════════════════════════════════════════════════════════════
// WEB ROUTES (Inertia)
// ══════════════════════════════════════════════════════════════

// Accueil - redirect vers login client
router.on('/').renderInertia('client/auth/login').as('home')

// ─────────────────────────────────────────────────────────────
// ADMIN - Auth Pages (sans middleware)
// ─────────────────────────────────────────────────────────────
router.on('/admin/login').renderInertia('admin/auth/login').as('admin.login')
router.on('/admin/totp').renderInertia('admin/auth/totp').as('admin.totp')

// ─────────────────────────────────────────────────────────────
// ADMIN - Protected Pages
// ─────────────────────────────────────────────────────────────
router.group(() => {
  router.on('/admin/dashboard').renderInertia('admin/dashboard/index').as('admin.dashboard')
  router.on('/admin/clients').renderInertia('admin/clients/index').as('admin.clients')
  router.on('/admin/clients/:id').renderInertia('admin/clients/show').as('admin.clients.show')
  router.on('/admin/dossiers').renderInertia('admin/dossiers/index').as('admin.dossiers')
  router.on('/admin/dossiers/:id').renderInertia('admin/dossiers/show').as('admin.dossiers.show')
  router.on('/admin/evenements').renderInertia('admin/evenements/index').as('admin.evenements')
  router.on('/admin/demandes-rdv').renderInertia('admin/demandes-rdv/index').as('admin.demandes-rdv')
  router.on('/admin/parametres').renderInertia('admin/parametres/index').as('admin.parametres')
  router.on('/admin/admins').renderInertia('admin/admins/index').as('admin.admins')
}).use(middleware.adminAuth())

// ─────────────────────────────────────────────────────────────
// CLIENT - Auth Pages (sans middleware)
// ─────────────────────────────────────────────────────────────
router.on('/client/login').renderInertia('client/auth/login').as('client.login')
router.on('/client/totp').renderInertia('client/auth/totp').as('client.totp')

// ─────────────────────────────────────────────────────────────
// CLIENT - Protected Pages
// ─────────────────────────────────────────────────────────────
router.group(() => {
  router.on('/espace-client/dashboard').renderInertia('client/dashboard/index').as('client.dashboard')
  router.on('/espace-client/dossiers').renderInertia('client/dossiers/index').as('client.dossiers')
  router.on('/espace-client/dossiers/:id').renderInertia('client/dossiers/show').as('client.dossiers.show')
  router.on('/espace-client/demandes-rdv').renderInertia('client/demandes-rdv/index').as('client.demandes-rdv')
  router.on('/espace-client/parametres').renderInertia('client/parametres/index').as('client.parametres')
}).use([middleware.clientAuth(), middleware.totpVerified()])
