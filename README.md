# Portail Cabinet d'Avocats

Portail client sécurisé pour cabinet d'avocats avec gestion des dossiers, documents, événements et demandes de rendez-vous.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Backend** | AdonisJS v6 |
| **Frontend** | React 19 + TypeScript |
| **SSR** | Inertia.js |
| **Base de données** | PostgreSQL 16 |
| **Auth** | Session-based (2 guards: admin/client) |
| **2FA** | TOTP (otplib + QR Code) |
| **Temps réel** | Transmit SSE |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **Tableaux** | AG Grid + TanStack Table |
| **Formulaires** | React Hook Form + Zod |
| **Icônes** | Lucide React |
| **Emails** | Resend |
| **CRON** | node-cron |
| **Cloud Storage** | Microsoft OneDrive (Graph API) |
| **Calendrier** | Google Calendar API |
| **Déploiement** | Docker + Coolify |

## Fonctionnalités

### Portail Admin
- **Tableau de bord** - Statistiques globales et activité récente
- **Gestion clients** - CRUD complet, permissions, types (particulier/institutionnel)
- **Gestion dossiers** - Suivi des affaires, statuts, procédures judiciaires
- **Notes & Tâches** - Notes internes et gestion des tâches par dossier
- **Événements** - Calendrier des audiences, rendez-vous, échéances
  - Vue calendrier et vue liste
  - Filtres par type, dossier, client
  - Synchronisation avec Google Calendar
- **Demandes RDV** - Traitement des demandes clients (accepter/refuser)
- **Favoris** - Accès rapide aux dossiers fréquemment consultés
- **Recherche globale** - Recherche unifiée clients/dossiers
- **Notifications** - Alertes en temps réel
- **Mises à jour temps réel** - Synchronisation automatique entre admins (SSE)
- **Paramètres** - Configuration système (super admin uniquement)
- **Administrateurs** - Gestion des comptes admin (super admin uniquement)

### Intégrations
- **OneDrive** - Synchronisation des documents vers Microsoft OneDrive
- **Google Calendar** - Synchronisation bidirectionnelle des événements

### Portail Client
- **Tableau de bord** - Vue d'ensemble des dossiers et notifications
- **Mes dossiers** - Consultation des dossiers et documents
- **Demandes RDV** - Création de demandes de rendez-vous

### Sécurité
- Authentification session-based avec cookies sécurisés
- Authentification à deux facteurs (2FA/TOTP) obligatoire pour clients
- Rate limiting sur les endpoints d'authentification
- CSRF protection
- CSP headers en production
- Séparation des guards admin/client
- Rôles admin vs super_admin

---

## Installation (Développement)

### Prérequis
- Node.js 20+
- pnpm
- PostgreSQL 16+ (ou Docker)

### Configuration

```bash
# Cloner le repository
git clone https://github.com/Miraubolant/2BV_Portail.git
cd 2BV_Portail

# Installer les dépendances
pnpm install

# Copier le fichier d'environnement
cp .env.example .env

# Générer la clé d'application
node ace generate:key

# Lancer PostgreSQL avec Docker (optionnel)
docker compose up -d

# Lancer les migrations
pnpm db:migrate

# Lancer les seeders (crée le super admin)
pnpm db:seed

# Démarrer le serveur de développement
pnpm dev
```

### Accès par défaut

| Portail | URL | Identifiants |
|---------|-----|--------------|
| Admin | http://localhost:3333/admin/login | `admin@cabinet.fr` / `Admin123!` |
| Client | http://localhost:3333/client/login | (créer via admin) |

> ⚠️ **Changez le mot de passe admin par défaut immédiatement**

---

## Déploiement (Production)

### Déploiement avec Coolify

Le projet est configuré pour un déploiement Docker sur [Coolify](https://coolify.io).

#### Fichiers de déploiement
- `Dockerfile` - Image Docker multi-stage optimisée
- `docker-compose.prod.yml` - Configuration Docker Compose
- `.env.production.example` - Template des variables d'environnement

#### Guide rapide

1. **Dans Coolify**, créer un nouveau projet **Docker Compose**
2. Connecter le repository GitHub
3. Sélectionner `docker-compose.prod.yml`
4. Configurer les variables d'environnement (voir ci-dessous)
5. Déployer

#### Variables d'environnement requises

```env
# Application (OBLIGATOIRE)
APP_KEY=<générer avec: node ace generate:key>
NODE_ENV=production
HOST=0.0.0.0
PORT=3333

# Base de données
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<mot de passe fort>
DB_DATABASE=portail_cabinet

# Session
SESSION_DRIVER=cookie

# Email (optionnel)
RESEND_API_KEY=<clé Resend>
EMAIL_FROM=noreply@votredomaine.fr

# Microsoft OneDrive (optionnel)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=https://votredomaine.fr/api/admin/microsoft/callback

# Google Calendar (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://votredomaine.fr/api/admin/google/callback
```

#### Post-déploiement

Exécuter dans le terminal Coolify de l'application :

```bash
node ace migration:run --force
node ace db:seed --force
```

📖 **Documentation complète** : voir [DEPLOY.md](DEPLOY.md)

---

## Structure du Projet

```
app/
├── controllers/
│   ├── auth/              # Authentification admin/client
│   ├── admin/             # Controllers admin
│   └── client/            # Controllers client
├── middleware/            # Middlewares auth et permissions
├── models/                # Modèles Lucid
├── services/              # Services métier
│   ├── microsoft/         # OneDrive sync
│   └── google/            # Google Calendar sync
└── validators/            # Validateurs VineJS

database/
├── migrations/            # Migrations PostgreSQL
└── seeders/               # Seeders de données

resources/js/
├── components/            # Composants React
│   ├── layout/            # Layouts admin/client
│   ├── sidebar/           # Navigation latérale
│   ├── admin/             # Composants spécifiques admin
│   └── ui/                # Composants shadcn/ui
├── pages/                 # Pages Inertia
│   ├── admin/             # Pages administration
│   └── client/            # Pages espace client
├── contexts/              # React Contexts
├── hooks/                 # Custom hooks
└── lib/                   # Utilitaires

scripts/
└── post-deploy.sh         # Script post-déploiement
```

---

## Modèles de Données

| Modèle | Description |
|--------|-------------|
| `Admin` | Administrateurs (admin/super_admin) |
| `Client` | Clients du cabinet |
| `Dossier` | Dossiers juridiques |
| `Document` | Documents attachés aux dossiers |
| `Evenement` | Événements (audiences, rdv, échéances) |
| `DemandeRdv` | Demandes de rendez-vous clients |
| `Note` | Notes internes sur les dossiers |
| `Task` | Tâches assignées aux admins |
| `Notification` | Notifications système |
| `ActivityLog` | Journal d'activité |
| `AdminFavori` | Favoris des admins |
| `MicrosoftToken` | Tokens OAuth OneDrive |
| `GoogleToken` | Tokens OAuth Google Calendar |
| `SyncLog` | Historique des synchronisations |
| `Parametre` | Paramètres de configuration |

---

## Scripts NPM

```bash
# Développement
pnpm dev              # Serveur de dev avec HMR
pnpm build            # Build production
pnpm start            # Démarrer en production

# Base de données
pnpm db:migrate       # Exécuter les migrations
pnpm db:rollback      # Rollback dernière migration
pnpm db:seed          # Exécuter les seeders
pnpm db:fresh         # Fresh migration + seed

# Qualité du code
pnpm lint             # Vérifier le code (ESLint)
pnpm lint:fix         # Corriger automatiquement
pnpm format           # Formater (Prettier)
pnpm typecheck        # Vérification TypeScript
pnpm test             # Exécuter les tests
```

---

## API Routes

### Health Check
```
GET /api/health       # Status de l'application
```

### Admin API (`/api/admin/`)
- `GET/POST /clients` - Liste et création de clients
- `GET/PUT/DELETE /clients/:id` - Détail, modification, suppression
- `GET/POST /dossiers` - Liste et création de dossiers
- `GET/PUT/DELETE /dossiers/:id` - Détail, modification, suppression
- `GET/POST /evenements` - Liste et création d'événements
- `GET/POST /dossiers/:id/notes` - Notes d'un dossier
- `GET/POST /dossiers/:id/tasks` - Tâches d'un dossier
- `GET /demandes-rdv` - Liste des demandes RDV
- `GET /search` - Recherche globale
- `GET /notifications` - Notifications

### Intégrations
- `GET /google/status` - Statut connexion Google
- `POST /google/sync` - Synchroniser le calendrier
- `GET /microsoft/status` - Statut connexion OneDrive
- `POST /microsoft/sync` - Synchroniser les documents

### Client API (`/api/client/`)
- `GET /dashboard` - Tableau de bord
- `GET /dossiers` - Mes dossiers
- `GET /dossiers/:id` - Détail d'un dossier
- `POST /demande-rdv` - Nouvelle demande RDV

---

## Licence

UNLICENSED - Projet privé

---

## Support

Pour toute question ou problème, ouvrir une issue sur le repository GitHub.
