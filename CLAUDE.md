# Guide Claude - Portail Cabinet d'Avocats

Ce document fournit le contexte technique et les workflows du projet pour Claude.

## Architecture Technique

### Stack Technologique

```
Frontend : React 19 + TypeScript + Inertia.js + shadcn/ui + Tailwind CSS v4
Backend  : AdonisJS v6 + TypeScript
Database : PostgreSQL 16
Auth     : Session-based avec 2 guards (admin/client) + TOTP 2FA
Realtime : Transmit SSE
Cloud    : OneDrive (Microsoft Graph API) + Google Calendar API
Deploy   : Docker + Coolify
```

### Structure des Dossiers

```
app/
├── controllers/
│   ├── auth/                  # Auth admin et client
│   ├── admin/                 # Controllers admin (CRUD + integrations)
│   └── client/                # Controllers client
├── middleware/                # Auth guards, rate limiting, permissions
├── models/                    # Lucid ORM models
├── services/
│   ├── microsoft/             # OneDrive integration
│   │   ├── microsoft_oauth_service.ts   # OAuth flow
│   │   ├── onedrive_service.ts          # Graph API operations
│   │   ├── document_sync_service.ts     # Document upload/download
│   │   ├── dossier_folder_service.ts    # Folder structure management
│   │   └── sync_service.ts              # Full sync operations
│   ├── google/                # Google Calendar integration
│   │   ├── google_oauth_service.ts      # OAuth flow
│   │   ├── google_calendar_service.ts   # Calendar API operations
│   │   └── calendar_sync_service.ts     # Sync operations
│   ├── utils/
│   │   └── retry.ts           # Retry utility with exponential backoff
│   ├── email_service.ts       # Email notifications (Resend)
│   ├── activity_logger.ts     # Activity timeline logging
│   └── integration_health_service.ts  # Integration health monitoring
└── validators/                # VineJS validators

resources/js/
├── components/
│   ├── layout/                # Admin & client layouts
│   ├── sidebar/               # Navigation components
│   ├── admin/                 # Admin-specific components
│   │   ├── onedrive-settings.tsx
│   │   ├── google-calendar-settings.tsx
│   │   ├── integration-status.tsx    # Health status dashboard
│   │   └── sync-history.tsx          # Sync history viewer
│   └── ui/                    # shadcn/ui components
├── pages/
│   ├── admin/                 # Admin pages
│   │   ├── dashboard/         # Dashboard with stats
│   │   ├── clients/           # Client management
│   │   ├── dossiers/          # Case management
│   │   ├── evenements/        # Calendar and events
│   │   ├── parametres/        # Settings (tabs: compte/cabinet/integrations)
│   │   └── ...
│   └── client/                # Client portal pages
└── lib/
    └── constants.ts           # API endpoints constants
```

## Workflows Principaux

### 1. Workflow Admin - Gestion des Dossiers

```
1. Admin se connecte (email/password + TOTP optionnel)
2. Dashboard affiche statistiques et activite recente
3. Creation/modification de clients
4. Creation de dossiers associes aux clients
   - Reference unique: YYYY-NNN-CODE (ex: 2025-001-MIR)
   - Types personnalisables dans parametres
5. Gestion des documents dans le dossier
   - Upload vers OneDrive (structure CABINET/CLIENT)
   - Documents visibles/non-visibles par le client
6. Suivi via notes internes et taches
7. Planification d'evenements (audiences, rdv, echeances)
   - Synchronisation optionnelle avec Google Calendar
```

### 2. Workflow Client

```
1. Client recoit identifiants par email
2. Premiere connexion : configuration 2FA obligatoire
3. Acces au tableau de bord avec ses dossiers
4. Consultation des documents (selon permissions)
5. Upload de documents (dossier CLIENT sur OneDrive)
6. Demandes de rendez-vous
```

### 3. Workflow OneDrive (Documents)

```
Structure OneDrive:
/Portail Cabinet/
  └── Clients/
      └── {Prenom Nom}/
          └── {Reference} - {Intitule}/
              ├── CABINET/    ← Documents internes (non visibles client)
              └── CLIENT/     ← Documents visibles par le client

Upload Admin:
1. Selection fichier + metadata (nom, type, sensible, visibleClient)
2. Determination location: CABINET ou CLIENT
3. Upload vers OneDrive via Graph API (avec retry)
4. Creation enregistrement Document en BDD
5. Notification email au client (si visibleClient)

Upload Client:
1. Verification permission peutUploader
2. Upload vers dossier CLIENT (force)
3. Notification email au responsable admin
```

### 4. Workflow Google Calendar

```
Mode Manuel:
- Creation evenement avec checkbox "Synchroniser avec Google"
- Evenement envoye vers Google Calendar
- Import manuel depuis Google via "Synchroniser maintenant"

Mode Automatique:
- Tous les evenements syncGoogle=true sont synchronises
- Import periodique depuis Google Calendar
- Detection reference dossier dans titre (ex: "Audience 2025-001-MIR")
  → Association automatique au dossier correspondant

Sync bidirectionnelle:
- Portal → Google : creation/modification/suppression
- Google → Portal : import nouveaux evenements
```

## Services d'Integration

### Retry avec Exponential Backoff (`app/services/utils/retry.ts`)

```typescript
// Configuration par defaut
{
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

// Utilisation
await withRetry(async () => {
  return await fetch(url, options)
}, { maxRetries: 3 })
```

### Health Check (`app/services/integration_health_service.ts`)

```typescript
// Endpoints API
GET /api/admin/integrations/health         // Status global
GET /api/admin/integrations/sync-history   // Historique
GET /api/admin/integrations/statistics     // Stats 7 derniers jours
POST /api/admin/integrations/health-check  // Declencher verification
```

### Structure des Tokens OAuth

```
MicrosoftToken:
- service_key: "onedrive"
- access_token, refresh_token
- expires_at (auto-refresh 5min avant expiration)
- account_email, account_name

GoogleToken:
- service_key: "google_calendar"
- selected_calendar_id, selected_calendar_name
- sync_mode: "auto" | "manual"
```

## Page Parametres (Admin)

### Onglet "Mon compte"
- Notifications email (nouveaux documents)
- Email de notification personnalise
- Filtrer par responsable (voir uniquement ses dossiers)
- Changement mot de passe

### Onglet "Cabinet" (Super Admin)
- Informations du cabinet (nom, email, telephone, adresse)
- Configuration email expediteur
- Types personnalises de dossiers et evenements

### Onglet "Integrations" (Super Admin)
- Status global des integrations (health check)
- Configuration OneDrive
  - Connexion OAuth
  - Test de connexion
  - Quota stockage
  - Initialisation structure dossiers
  - Synchronisation manuelle
- Configuration Google Calendar
  - Connexion OAuth
  - Selection du calendrier
  - Mode sync (auto/manuel)
  - Synchronisation manuelle
- Historique des synchronisations

## Modeles de Donnees Cles

### Document
```typescript
{
  id: UUID,
  dossierId: UUID,
  nom: string,
  nomOriginal: string,
  typeDocument: string,
  extension: string,
  mimeType: string,
  tailleOctets: number,
  sensible: boolean,
  visibleClient: boolean,
  dossierLocation: 'cabinet' | 'client',  // OneDrive folder
  onedriveFileId: string | null,
  onedriveWebUrl: string | null,
  uploadedById: UUID,
  uploadedByType: 'admin' | 'client',
}
```

### Dossier (OneDrive fields)
```typescript
{
  onedriveFolderId: string | null,        // Main folder
  onedriveFolderPath: string | null,
  onedriveCabinetFolderId: string | null, // CABINET subfolder
  onedriveClientFolderId: string | null,  // CLIENT subfolder
  onedriveLastSync: DateTime | null,
}
```

### Evenement (Google Calendar fields)
```typescript
{
  googleEventId: string | null,
  syncGoogle: boolean,                    // Synchroniser avec Google
  googleLastSync: DateTime | null,
}
```

### SyncLog
```typescript
{
  type: 'onedrive' | 'google_calendar',
  mode: 'auto' | 'manual',
  statut: 'success' | 'partial' | 'error',
  elementsTraites: number,
  elementsCrees: number,
  elementsModifies: number,
  elementsSupprimes: number,
  elementsErreur: number,
  message: string,
  details: JSON,
  dureeMs: number,
}
```

## Commandes Utiles

```bash
# Developpement
pnpm dev                    # Serveur avec HMR
pnpm build                  # Build production

# Base de donnees
pnpm db:migrate             # Executer migrations
pnpm db:fresh               # Reset + seed

# Qualite
pnpm lint:fix               # Corriger ESLint
pnpm typecheck              # Verifier types TypeScript
```

## Conventions de Code

### Backend (AdonisJS)
- Controllers: actions RESTful (index, show, store, update, destroy)
- Services: logique metier isolee
- Modeles: Lucid ORM avec relations
- Validation: VineJS

### Frontend (React)
- Composants: function components + hooks
- State: useState/useEffect, pas de state manager global
- Formulaires: React Hook Form + Zod
- UI: shadcn/ui (Card, Button, Input, etc.)
- Data fetching: fetch natif avec useEffect

### Nommage
- Models: PascalCase singulier (Client, Dossier)
- Controllers: PascalCase pluriel (ClientsController)
- Routes: kebab-case (/demandes-rdv)
- API: camelCase dans les JSON
- Database: snake_case (client_id, created_at)
