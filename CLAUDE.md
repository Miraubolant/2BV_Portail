# Guide Claude - Portail Cabinet d'Avocats 2BV

Ce document fournit le contexte technique complet du projet pour Claude.

## Stack Technologique

| Couche | Technologie |
|--------|-------------|
| **Backend** | AdonisJS v6 + TypeScript |
| **Frontend** | React 19 + TypeScript + Inertia.js |
| **Base de donnees** | PostgreSQL 16 |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Auth** | Session-based (2 guards: admin/client) + TOTP 2FA |
| **Temps reel** | Transmit SSE |
| **Emails** | Resend |
| **Cloud Storage** | Microsoft OneDrive (Graph API) |
| **Calendrier** | Google Calendar API (multi-comptes/calendriers) |
| **Deploiement** | Docker + Coolify |

---

## Structure du Projet

```
app/
├── controllers/           # 25 controllers
│   ├── auth/              # admin_auth, client_auth
│   ├── admin/             # 17 controllers (dashboard, clients, dossiers, etc.)
│   └── client/            # 5 controllers (dashboard, dossiers, documents, etc.)
├── models/                # 18 modeles Lucid ORM
├── services/              # 13 services metier
│   ├── microsoft/         # OneDrive (5 services)
│   ├── google/            # Calendar (3 services)
│   └── ...                # email, activity_logger, health, retry
├── middleware/            # 10 middlewares
├── validators/            # VineJS validators
└── exceptions/

resources/js/
├── pages/                 # 21 pages
│   ├── admin/             # 11 pages (dashboard, clients, dossiers, etc.)
│   ├── client/            # 7 pages
│   └── errors/            # 2 pages
├── components/            # 60+ composants
│   ├── layout/            # admin-layout, client-layout
│   ├── sidebar/           # admin-sidebar, client-sidebar
│   ├── admin/             # composants specifiques admin
│   ├── ui/                # 37 composants shadcn/ui
│   └── common/            # composants partages
├── hooks/                 # 5 hooks (use-mobile, use-transmit, etc.)
├── contexts/              # 2 contextes (breadcrumb, unified-modal)
└── lib/
    └── constants.ts       # Endpoints API

database/migrations/       # 31 migrations
commands/                  # 3 commandes ACE
config/                    # 14 fichiers config
start/routes.ts            # ~80 routes
```

---

## Modeles de Donnees (18 modeles)

### Modeles Principaux

**Admin**
```typescript
{
  id: UUID, email, password, nom, prenom, username,
  role: 'super_admin' | 'admin',
  totpSecret, totpEnabled, actif,
  notifEmailDocument, emailNotification, filterByResponsable,
  createdById, lastLoginAt
}
// Relations: hasMany(AdminToken), belongsTo(Admin - createdBy)
```

**Client**
```typescript
{
  id: UUID, email, password, civilite, nom, prenom,
  dateNaissance, lieuNaissance, nationalite,
  telephone, telephoneSecondaire, adresse, codePostal, ville, pays,
  type: 'particulier' | 'institutionnel',
  societeNom, societeSiret, societeFonction,
  totpSecret, totpEnabled,
  peutUploader, peutDemanderRdv, accesDocumentsSensibles,
  notifEmailDocument, notifEmailEvenement,
  notesInternes, tags[], sourceAcquisition,
  responsableId, createdById
}
// Relations: hasMany(Dossier), belongsTo(Admin - responsable)
```

**Dossier**
```typescript
{
  id: UUID, clientId, reference, intitule, description,
  typeAffaire, statut,
  dateOuverture, dateCloture, datePrescription,
  honorairesEstimes, honorairesFactures, honorairesPayes,
  juridiction, numeroRg, adversaireNom, adversaireAvocat,
  notesInternes,
  // OneDrive
  onedriveFolderId, onedriveFolderPath,
  onedriveCabinetFolderId, onedriveClientFolderId, onedriveLastSync,
  createdById, assignedAdminId
}
// Relations: belongsTo(Client), hasMany(Document, Evenement, Note, Task)
// Reference auto: YYYY-NNN-CODE (ex: 2025-001-MIR)
```

**Document**
```typescript
{
  id: UUID, dossierId, nom, nomOriginal, typeDocument,
  tailleOctets, mimeType, extension,
  sensible, visibleClient, uploadedByClient,
  dossierLocation: 'cabinet' | 'client',
  onedriveFileId, onedriveWebUrl, onedriveDownloadUrl,
  uploadedById, uploadedByType: 'admin' | 'client',
  description, dateDocument
}
```

**Evenement**
```typescript
{
  id: UUID, dossierId (nullable), titre, description, type,
  dateDebut, dateFin, journeeEntiere,
  lieu, adresse, salle,
  syncGoogle, googleEventId, googleCalendarId, googleLastSync,
  rappelEnvoye, rappelJ7, rappelJ1, statut,
  createdById
}
// Relations: belongsTo(Dossier), belongsTo(GoogleCalendar)
```

**DemandeRdv**
```typescript
{
  id: UUID, clientId, dossierId (nullable),
  dateSouhaitee, creneau, motif, urgence,
  statut: 'en_attente' | 'accepte' | 'refuse',
  reponseAdmin, evenementId, traiteParId, traiteAt
}
```

**Note** & **Task**
```typescript
// Note
{ id, dossierId, createdById, contenu, isPinned }

// Task
{
  id, dossierId, createdById, assignedToId,
  titre, description,
  priorite: 'basse' | 'normale' | 'haute' | 'urgente',
  statut: 'a_faire' | 'en_cours' | 'terminee' | 'annulee',
  dateEcheance, rappelDate, rappelEnvoye, completedAt
}
```

### Modeles Integration

**GoogleToken** (Multi-comptes)
```typescript
{
  id: UUID, service, adminId (nullable),
  accessToken, refreshToken, expiresAt,
  accountEmail, accountName, scopes,
  selectedCalendarId, selectedCalendarName,
  syncMode: 'auto' | 'manual'
}
// Relations: hasMany(GoogleCalendar)
```

**GoogleCalendar** (Multi-calendriers)
```typescript
{
  id: UUID, googleTokenId,
  calendarId, calendarName, calendarColor,
  isActive
}
// Unique constraint: (googleTokenId, calendarId)
```

**MicrosoftToken**
```typescript
{
  id: UUID, service, accessToken, refreshToken,
  expiresAt, accountEmail, accountName, scopes
}
```

### Modeles Support

```typescript
// Notification
{ id, destinataireType, destinataireId, type, titre, message, lien, lu, emailEnvoye }

// SyncLog
{ id, type, mode, statut, elementsTraites/Crees/Modifies/Supprimes/Erreur, message, details, dureeMs }

// ActivityLog
{ id, userType, userId, action, resourceType, resourceId, ipAddress, userAgent, metadata }

// Parametre
{ id, cle, valeur, type, categorie, description }

// AdminFavori
{ id, adminId, favoriType, favoriId, ordre }
```

---

## Routes API (~80 routes)

### Auth Admin
```
POST /api/admin/auth/login              # Rate limited
POST /api/admin/auth/verify-totp        # Rate limited
POST /api/admin/auth/logout
GET  /api/admin/auth/me
PUT  /api/admin/auth/notifications
PUT  /api/admin/auth/password
POST /api/admin/auth/setup-totp
POST /api/admin/auth/confirm-totp
```

### Auth Client
```
POST /api/client/auth/login             # Rate limited
GET  /api/client/auth/totp-status
POST /api/client/auth/setup-totp
POST /api/client/auth/confirm-totp
POST /api/client/auth/verify-totp
POST /api/client/auth/logout
GET  /api/client/auth/me
```

### Admin API (require adminAuth)
```
# Dashboard
GET  /api/admin/dashboard

# Clients
GET/POST       /api/admin/clients
GET/PUT/DELETE /api/admin/clients/:id
POST           /api/admin/clients/:id/reset-password

# Dossiers
GET/POST       /api/admin/dossiers
GET/PUT/DELETE /api/admin/dossiers/:id
GET            /api/admin/dossiers/:id/evenements
GET            /api/admin/dossiers/:id/timeline

# Documents
GET/POST       /api/admin/dossiers/:dossierId/documents
POST           /api/admin/documents/upload
GET/DELETE     /api/admin/documents/:id
PUT            /api/admin/documents/:id
POST           /api/admin/documents/:id/move

# Evenements
GET/POST       /api/admin/evenements
GET/PUT/DELETE /api/admin/evenements/:id

# Demandes RDV
GET  /api/admin/demandes-rdv
GET  /api/admin/demandes-rdv/filters
GET  /api/admin/demandes-rdv/:id
POST /api/admin/demandes-rdv/:id/accepter
POST /api/admin/demandes-rdv/:id/refuser

# Notes
GET/POST       /api/admin/dossiers/:dossierId/notes
PUT/DELETE     /api/admin/notes/:id
POST           /api/admin/notes/:id/pin

# Tasks
GET            /api/admin/tasks/my
GET/POST       /api/admin/dossiers/:dossierId/tasks
PUT/DELETE     /api/admin/tasks/:id
POST           /api/admin/tasks/:id/complete
POST           /api/admin/tasks/:id/reopen

# Favoris
GET/POST       /api/admin/favoris
DELETE         /api/admin/favoris/:id
POST           /api/admin/favoris/toggle
GET            /api/admin/favoris/check

# Autres
GET  /api/admin/search
GET  /api/admin/notifications
POST /api/admin/notifications/:id/read
GET  /api/admin/responsables
```

### Super Admin (require superAdmin)
```
# Admins
GET/POST       /api/admin/admins
GET/PUT/DELETE /api/admin/admins/:id
POST           /api/admin/admins/:id/toggle-status
POST           /api/admin/admins/:id/reset-password

# Parametres
GET /api/admin/parametres
PUT /api/admin/parametres
```

### Integrations
```
# Health Check
GET  /api/admin/integrations/health
GET  /api/admin/integrations/sync-history
GET  /api/admin/integrations/statistics
POST /api/admin/integrations/health-check

# Microsoft OneDrive (Super Admin)
GET  /api/admin/microsoft/authorize
GET  /api/admin/microsoft/callback
GET  /api/admin/microsoft/status
GET  /api/admin/microsoft/test
POST /api/admin/microsoft/disconnect
POST /api/admin/microsoft/sync
POST /api/admin/microsoft/sync/:dossierId
POST /api/admin/microsoft/reverse-sync
POST /api/admin/microsoft/initialize

# Google Calendar (Super Admin + Multi-comptes)
GET    /api/admin/google/authorize
GET    /api/admin/google/callback
GET    /api/admin/google/status
GET    /api/admin/google/test
POST   /api/admin/google/disconnect
GET    /api/admin/google/accounts
DELETE /api/admin/google/accounts/:tokenId
GET    /api/admin/google/accounts/:tokenId/calendars
POST   /api/admin/google/accounts/:tokenId/calendars/activate
POST   /api/admin/google/calendars/:id/deactivate
DELETE /api/admin/google/calendars/:id
GET    /api/admin/google/active-calendars
POST   /api/admin/google/sync-multi
POST   /api/admin/google/pull-all
```

### Client API (require clientAuth + totpVerified)
```
GET  /api/client/dashboard
GET  /api/client/dossiers
GET  /api/client/dossiers/:id
GET  /api/client/dossiers/:dossierId/documents
POST /api/client/documents/upload
GET  /api/client/documents/:id/download
GET  /api/client/demandes-rdv
POST /api/client/demande-rdv
GET  /api/client/settings
POST /api/client/settings/change-password
POST /api/client/settings/enable-totp
POST /api/client/settings/confirm-totp
POST /api/client/settings/disable-totp
PUT  /api/client/settings/notifications
```

---

## Workflows Principaux

### 1. Authentification
```
1. Login email + password
2. Session etablie (RememberMe: 30 jours)
3. Si TOTP active → verification code requise
4. LastLogin timestamp enregistre
```

### 2. Gestion Dossiers
```
1. Reference auto: YYYY-NNN-CODE (ex: 2025-001-MIR)
2. Creation structure OneDrive (CABINET + CLIENT)
3. TypeAffaire/Statut configurables via Parametres
4. Tracking financier: estimes/factures/payes
5. Timeline d'activite complete
```

### 3. OneDrive (Documents)
```
Structure:
/Portail Cabinet/
  └── Clients/
      └── {Prenom Nom}/
          └── {Reference} - {Intitule}/
              ├── CABINET/    ← Documents internes
              └── CLIENT/     ← Documents client

Upload Admin:
1. Selection fichier + metadata
2. Location: CABINET ou CLIENT
3. Upload OneDrive (avec retry)
4. Notification email client (si visible)

Upload Client:
1. Verification permission peutUploader
2. Upload vers CLIENT (force)
3. Notification email responsable
```

### 4. Google Calendar (Multi-comptes/Multi-calendriers)
```
Configuration:
1. Connexion compte Google (OAuth)
2. Selection calendriers actifs par compte
3. Mode sync: auto ou manuel

Sync bidirectionnelle:
- Portal → Google: create/update/delete
- Google → Portal: import nouveaux events
- Detection auto reference dossier dans titre

Multi-calendriers:
- Plusieurs comptes Google possibles
- Plusieurs calendriers par compte
- Filtre par calendrier sur page events
- Selection calendrier cible a la creation
```

### 5. Demandes RDV
```
1. Client demande RDV (date, creneau, motif, urgence)
2. Admin accepte/refuse avec message
3. Si accepte → creation event auto
4. Sync Google Calendar (si active)
```

---

## Services Cles

### Retry avec Exponential Backoff
```typescript
// app/services/utils/retry.ts
{
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}
```

### Activity Logger
```typescript
// 20+ methodes pour tracking timeline
logDossierCreated(), logDossierUpdated(), logDossierStatusChanged()
logDocumentUploaded(), logDocumentDeleted()
logEvenementCreated(), logEvenementUpdated(), logEvenementDeleted()
logNoteCreated(), logNoteUpdated(), logNotePinned()
logTaskCreated(), logTaskCompleted(), logTaskReopened()
```

### Email Service (Resend)
```typescript
notifyClientNewDocument()   // Client recoit notification
notifyAdminClientUpload()   // Admin recoit notification
sendWelcomeEmail()          // Nouveaux identifiants
createNotification()        // Notification generique
```

---

## Commandes ACE

```bash
# Sync OneDrive
node ace onedrive:sync-folders     # Sync tous les dossiers
node ace onedrive:reverse-sync     # Import depuis OneDrive

# Sync Google Calendar
node ace google:sync               # Sync multi-calendriers
```

---

## Composants UI Importants

### FilterBar (`components/ui/filter-bar.tsx`)
```typescript
// Composant unifie pour filtres avec design moderne
interface FilterConfig {
  id: string
  type: 'select' | 'checkbox' | 'date'
  label: string
  options?: FilterOption[]
  value: string | boolean
  onChange: (value: string | boolean) => void
}

<FilterBar
  search={search}
  onSearchChange={setSearch}
  filters={[...]}
  onClearAll={() => {...}}
  rightContent={<ViewToggle />}
/>
```

### UnifiedAddModal (`components/admin/unified-add-modal.tsx`)
```
Modal multi-purpose pour creation rapide:
- Nouveau client
- Nouveau dossier
- Nouvel evenement
```

### Layouts
```
admin-layout.tsx   # Sidebar + header + content
client-layout.tsx  # Layout client avec navigation
auth-layout.tsx    # Pages login/totp
```

---

## Configuration

### Environment Variables
```env
# Database
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE

# Auth
APP_KEY, SESSION_DRIVER

# Microsoft OAuth
MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
MICROSOFT_REDIRECT_URI, MICROSOFT_TENANT_ID

# Google OAuth
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI

# Email
RESEND_API_KEY

# App
APP_URL, NODE_ENV
```

### OAuth Scopes
```
Microsoft: User.Read, Files.ReadWrite.All, offline_access
Google: calendar, userinfo.email, userinfo.profile
```

---

## Conventions de Code

### Backend (AdonisJS)
- Controllers: actions RESTful (index, show, store, update, destroy)
- Services: logique metier isolee
- Modeles: Lucid ORM avec UUID, relations
- Validation: VineJS
- Erreurs: Exceptions AdonisJS

### Frontend (React)
- Components: function components + hooks
- State: useState/useEffect (pas de state manager global)
- Forms: React Hook Form + Zod
- UI: shadcn/ui
- Data: fetch natif + useCallback pour memo

### Nommage
```
Models:      PascalCase singulier   (Client, Dossier)
Controllers: PascalCase pluriel     (ClientsController)
Routes:      kebab-case             (/demandes-rdv)
API JSON:    camelCase              (clientId, createdAt)
Database:    snake_case             (client_id, created_at)
```

---

## Scripts NPM

```bash
# Developpement
pnpm dev           # Serveur HMR

# Build
pnpm build         # Production build
pnpm typecheck     # TypeScript check

# Database
pnpm db:migrate    # Run migrations
pnpm db:fresh      # Reset + seed
pnpm db:seed       # Run seeders

# Qualite
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint fix
```
