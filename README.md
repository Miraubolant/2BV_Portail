# Portail Cabinet d'Avocats

Portail client securise pour cabinet d'avocats avec gestion des dossiers, documents, evenements et demandes de rendez-vous.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Backend** | AdonisJS v6 |
| **Frontend** | React 19 + TypeScript |
| **SSR** | Inertia.js |
| **Base de donnees** | PostgreSQL |
| **Auth** | Session-based (2 guards: admin/client) |
| **2FA** | TOTP (otplib + QR Code) |
| **Temps reel** | Transmit SSE |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Tableaux** | AG Grid + TanStack Table |
| **Formulaires** | React Hook Form + Zod |
| **Icones** | Lucide React |
| **Emails** | Resend |
| **CRON** | node-cron |
| **Cloud Storage** | Microsoft OneDrive (Graph API) |
| **Calendrier** | Google Calendar API |

## Fonctionnalites

### Portail Admin
- **Tableau de bord** - Statistiques globales et activite recente
- **Gestion clients** - CRUD complet, permissions, types (particulier/institutionnel)
- **Gestion dossiers** - Suivi des affaires, statuts, procedures judiciaires
- **Evenements** - Calendrier des audiences, rendez-vous, echeances
  - Vue calendrier et vue liste
  - Filtres par type, dossier, client
  - Attribution de dossiers aux evenements
  - Synchronisation avec Google Calendar
- **Demandes RDV** - Traitement des demandes clients (accepter/refuser)
- **Mises a jour temps reel** - Synchronisation automatique entre admins connectes (SSE)
- **Parametres** - Configuration systeme (super admin uniquement)
- **Administrateurs** - Gestion des comptes admin (super admin uniquement)

### Integrations
- **OneDrive** - Synchronisation des documents vers Microsoft OneDrive (structure automatique par dossier)
- **Google Calendar** - Synchronisation bidirectionnelle des evenements
  - Mode automatique ou manuel
  - Import de tous les evenements Google Calendar
  - Detection automatique des references dossier (ex: 2025-001-MIR)
  - Attribution manuelle des dossiers aux evenements importes
  - Synchronisation en temps reel lors de creation/modification

### Portail Client
- **Tableau de bord** - Vue d'ensemble des dossiers et notifications
- **Mes dossiers** - Consultation des dossiers et documents
- **Demandes RDV** - Creation de demandes de rendez-vous

### Securite
- Authentification session-based avec cookies securises
- Authentification a deux facteurs (2FA/TOTP) obligatoire pour clients
- Separation des guards admin/client
- Verification du statut actif lors de la connexion
- Roles admin vs super_admin

## Installation

```bash
# Installer les dependances
pnpm install

# Copier le fichier d'environnement
cp .env.example .env

# Generer la cle d'application
node ace generate:key

# Lancer les migrations
pnpm db:migrate

# Lancer les seeders
pnpm db:seed

# Demarrer le serveur de developpement
pnpm dev
```

## Structure du Projet

```
app/
├── controllers/
│   ├── auth/              # Authentification admin/client
│   ├── admin/             # Controllers admin (dashboard, clients, dossiers, etc.)
│   └── client/            # Controllers client (dashboard, dossiers, rdv)
├── middleware/            # Middlewares auth et permissions
├── models/                # Modeles Lucid (Admin, Client, Dossier, etc.)
├── services/              # Services metier
└── validators/            # Validateurs VineJS

database/
├── migrations/            # Migrations PostgreSQL
└── seeders/               # Seeders de donnees

resources/
└── js/
    ├── components/        # Composants React reutilisables
    │   ├── layout/        # Layouts admin/client
    │   ├── sidebar/       # Navigation laterale
    │   └── ui/            # Composants shadcn/ui
    ├── pages/             # Pages Inertia
    │   ├── admin/         # Pages administration
    │   └── client/        # Pages espace client
    ├── app/               # Routes frontend
    └── lib/               # Utilitaires et constantes
```

## Modeles de Donnees

| Modele | Description |
|--------|-------------|
| `Admin` | Administrateurs du systeme |
| `Client` | Clients du cabinet |
| `Dossier` | Dossiers juridiques |
| `Document` | Documents attaches aux dossiers |
| `Evenement` | Evenements (audiences, rdv, echeances) |
| `DemandeRdv` | Demandes de rendez-vous clients |
| `Notification` | Notifications systeme |
| `Parametre` | Parametres de configuration |
| `GoogleToken` | Tokens OAuth Google Calendar |
| `SyncLog` | Historique des synchronisations |

## API Routes

### Admin API (`/api/admin/`)
- `GET/POST /clients` - Liste et creation de clients
- `GET/PUT/DELETE /clients/:id` - Detail, modification, suppression
- `GET/POST /dossiers` - Liste et creation de dossiers
- `GET/PUT/DELETE /dossiers/:id` - Detail, modification, suppression
- `GET/POST /evenements` - Liste et creation d'evenements
- `GET /demandes-rdv` - Liste des demandes RDV
- `POST /demandes-rdv/:id/accepter` - Accepter une demande
- `POST /demandes-rdv/:id/refuser` - Refuser une demande
- `GET /google/status` - Statut connexion Google
- `GET /google/authorize` - URL OAuth Google
- `GET /google/calendars` - Liste des calendriers
- `POST /google/select-calendar` - Selectionner un calendrier
- `POST /google/sync` - Synchroniser maintenant
- `POST /google/disconnect` - Deconnecter Google

### Client API (`/api/client/`)
- `GET /dashboard` - Tableau de bord
- `GET /dossiers` - Mes dossiers
- `GET /dossiers/:id` - Detail d'un dossier
- `POST /demande-rdv` - Nouvelle demande RDV

## Scripts

```bash
pnpm dev          # Demarrer en developpement (HMR)
pnpm build        # Build production
pnpm start        # Demarrer en production
pnpm lint         # Verifier le code (ESLint)
pnpm format       # Formater le code (Prettier)
pnpm typecheck    # Verification TypeScript
pnpm db:migrate   # Lancer les migrations
pnpm db:rollback  # Rollback migrations
pnpm db:seed      # Lancer les seeders
pnpm db:fresh     # Fresh migration + seed
```

## Variables d'Environnement

```env
# Application
TZ=Europe/Paris
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=

# Base de donnees
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_DATABASE=portail_cabinet

# Emails (Resend)
RESEND_API_KEY=

# Microsoft OneDrive
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3333/api/admin/microsoft/callback

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3333/api/admin/google/callback
```

## Licence

UNLICENSED - Projet prive
