/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
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

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════
router.get('/api/health', [HealthController, 'index'])

// ══════════════════════════════════════════════════════════════
// AUTH - ADMIN
// ══════════════════════════════════════════════════════════════
router.group(() => {
  router.post('login', [AdminAuthController, 'login'])
  router.post('verify-totp', [AdminAuthController, 'verifyTotp'])
  router.post('logout', [AdminAuthController, 'logout']).use(middleware.adminAuth())
  router.get('me', [AdminAuthController, 'me']).use(middleware.adminAuth())
  router.post('setup-totp', [AdminAuthController, 'setupTotp']).use(middleware.adminAuth())
  router.post('confirm-totp', [AdminAuthController, 'confirmTotp']).use(middleware.adminAuth())
}).prefix('api/admin/auth')

// ══════════════════════════════════════════════════════════════
// AUTH - CLIENT
// ══════════════════════════════════════════════════════════════
router.group(() => {
  router.post('login', [ClientAuthController, 'login'])
  router.get('totp-status', [ClientAuthController, 'totpStatus']).use(middleware.clientAuth())
  router.post('setup-totp', [ClientAuthController, 'setupTotp']).use(middleware.clientAuth())
  router.post('confirm-totp', [ClientAuthController, 'confirmTotp']).use(middleware.clientAuth())
  router.post('verify-totp', [ClientAuthController, 'verifyTotp']).use(middleware.clientAuth())
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

  // Evenements
  router.get('evenements', [AdminEvenementsController, 'index'])
  router.post('evenements', [AdminEvenementsController, 'store'])
  router.get('evenements/:id', [AdminEvenementsController, 'show'])
  router.put('evenements/:id', [AdminEvenementsController, 'update'])
  router.delete('evenements/:id', [AdminEvenementsController, 'destroy'])

  // Demandes RDV
  router.get('demandes-rdv', [AdminDemandesRdvController, 'index'])
  router.get('demandes-rdv/:id', [AdminDemandesRdvController, 'show'])
  router.post('demandes-rdv/:id/accepter', [AdminDemandesRdvController, 'accepter'])
  router.post('demandes-rdv/:id/refuser', [AdminDemandesRdvController, 'refuser'])

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

  // Parametres
  router.get('parametres', [AdminParametresController, 'index'])
  router.get('parametres/:categorie', [AdminParametresController, 'byCategorie'])
  router.put('parametres', [AdminParametresController, 'update'])
  router.get('parametres/value/:cle', [AdminParametresController, 'getValue'])

}).prefix('api/admin').use([middleware.adminAuth(), middleware.superAdmin()])

// ══════════════════════════════════════════════════════════════
// CLIENT ROUTES
// ══════════════════════════════════════════════════════════════
router.group(() => {
  // Dashboard
  router.get('dashboard', [ClientDashboardController, 'index'])

  // Mes dossiers
  router.get('dossiers', [ClientDossiersController, 'index'])
  router.get('dossiers/:id', [ClientDossiersController, 'show'])

  // Demandes RDV
  router.get('demandes-rdv', [ClientRdvController, 'index'])
  router.post('demande-rdv', [ClientRdvController, 'store'])
  router.get('demandes-rdv/:id', [ClientRdvController, 'show'])

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
}).use([middleware.clientAuth(), middleware.totpVerified()])
