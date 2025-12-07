# Guide de Deploiement Coolify - 2BV Portail

Ce guide explique comment deployer l'application 2BV Portail sur Coolify.

## Prerequisites

- Serveur avec Coolify installe (https://coolify.io)
- Compte GitHub avec acces au repository
- Base de donnees PostgreSQL (peut etre creee via Coolify)

---

## ETAPE 1: Creer la Base de Donnees PostgreSQL

### Dans Coolify:

1. **Aller dans** `Resources` > `New` > `Database`
2. **Selectionner** `PostgreSQL`
3. **Configurer:**
   - Name: `2bv-portail-db`
   - PostgreSQL Version: `16` (recommande)
   - Database Name: `portail_cabinet`
   - Username: `postgres`
   - Password: (generer un mot de passe fort)

4. **Deployer** la base de donnees

5. **Noter les informations de connexion:**
   - Host: `2bv-portail-db` (nom interne Docker)
   - Port: `5432`
   - Database: `portail_cabinet`
   - Username: `postgres`
   - Password: (votre mot de passe)

---

## ETAPE 2: Deployer l'Application

### A. Connexion au Repository

1. **Aller dans** `Resources` > `New` > `Application`
2. **Selectionner** `GitHub` comme source
3. **Authentifier** votre compte GitHub si necessaire
4. **Selectionner** le repository `Miraubolant/2BV_Portail`
5. **Branche:** `main`

### B. Configuration Build

| Parametre | Valeur |
|-----------|--------|
| **Build Pack** | `Dockerfile` (recommande) ou `Nixpacks` |
| **Dockerfile Location** | `Dockerfile` |
| **Port Exposes** | `3333` |

> **Note:** Le projet inclut un `Dockerfile` optimise et un `nixpacks.toml`. Coolify detectera automatiquement la meilleure option.

### C. Commandes (si Nixpacks)

Si vous choisissez Nixpacks au lieu de Dockerfile:

| Commande | Valeur |
|----------|--------|
| **Install** | `npm ci` |
| **Build** | `npm run build` |
| **Start** | `node ./build/bin/server.js` |

---

## ETAPE 3: Variables d'Environnement

### Variables Requises

```env
# Application
NODE_ENV=production
TZ=Europe/Paris
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=<generer-avec-node-ace-generate-key>

# Session
SESSION_DRIVER=cookie

# Database (utiliser le nom du service Docker pour DB_HOST)
DB_HOST=2bv-portail-db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<votre-mot-de-passe-db>
DB_DATABASE=portail_cabinet
```

### Variables Optionnelles (Integrations)

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@votredomaine.fr

# Microsoft OneDrive
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_REDIRECT_URI=https://votredomaine.fr/api/admin/microsoft/callback

# Google Calendar
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://votredomaine.fr/api/admin/google/callback
```

### Generer APP_KEY

Executez localement:
```bash
node ace generate:key
```
Ou utilisez cette commande pour generer une cle aleatoire:
```bash
openssl rand -base64 32
```

---

## ETAPE 4: Configuration Reseau

### A. Domaine

1. **Ajouter un domaine** dans les parametres de l'application
2. **Exemple:** `portail.votrecabinet.fr`

### B. SSL/HTTPS

Coolify genere automatiquement les certificats SSL avec Let's Encrypt.

### C. Health Check

L'application expose `/health` pour les health checks Docker:
- **URL:** `/health`
- **Port:** `3333`
- **Intervalle:** 30s

---

## ETAPE 5: Post-Deploiement

### A. Executer les Migrations

Apres le premier deploiement, executez les migrations:

1. **Dans Coolify**, aller dans l'onglet `Terminal` de l'application
2. **Executer:**
   ```bash
   node ace migration:run --force
   ```

### B. Creer le Premier Admin

1. **Dans le terminal Coolify:**
   ```bash
   node ace db:seed
   ```

   Ou creez manuellement dans PostgreSQL:
   ```sql
   INSERT INTO admins (id, email, password, nom, prenom, role, actif, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'admin@votrecabinet.fr',
     '<hash-scrypt-du-mot-de-passe>',
     'Admin',
     'Cabinet',
     'super_admin',
     true,
     NOW(),
     NOW()
   );
   ```

---

## ETAPE 6: Configuration Avancee

### A. Ressources

Recommandations minimales:
| Ressource | Minimum | Recommande |
|-----------|---------|------------|
| **CPU** | 0.5 vCPU | 1 vCPU |
| **RAM** | 512 MB | 1 GB |
| **Stockage** | 1 GB | 5 GB |

### B. Auto-Deploy

Activez le deploiement automatique sur push:
1. **Aller dans** Settings > General
2. **Activer** `Auto Deploy`

### C. Rollbacks

Coolify garde l'historique des deploiements. Pour rollback:
1. **Aller dans** Deployments
2. **Selectionner** une version anterieure
3. **Cliquer** sur `Rollback`

---

## Depannage

### L'application ne demarre pas

1. **Verifier les logs:**
   - Aller dans l'onglet `Logs`
   - Chercher les erreurs

2. **Verifier les variables d'environnement:**
   - `APP_KEY` est-il defini?
   - `DB_HOST` pointe-t-il vers le bon service?

3. **Verifier la connexion DB:**
   - Le service PostgreSQL est-il running?
   - Les credentials sont-ils corrects?

### Erreur de build

1. **Verifier les logs de build**
2. **S'assurer que** `package-lock.json` est commite
3. **Verifier la version Node.js** (requiert Node 22+)

### Health check echoue

1. **Verifier que le port** `3333` est expose
2. **Tester localement:** `curl http://localhost:3333/health`

---

## Architecture Deployee

```
┌─────────────────────────────────────────────────────┐
│                     COOLIFY                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │   Traefik/Caddy  │────│   SSL/Let's      │       │
│  │   (Reverse Proxy)│    │   Encrypt        │       │
│  └────────┬─────────┘    └──────────────────┘       │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │  2BV Portail     │                               │
│  │  (Node.js:3333)  │                               │
│  │                  │                               │
│  │  - AdonisJS 6    │                               │
│  │  - React 18      │                               │
│  │  - Inertia.js    │                               │
│  └────────┬─────────┘                               │
│           │                                          │
│           ▼                                          │
│  ┌──────────────────┐                               │
│  │  PostgreSQL 16   │                               │
│  │  (port 5432)     │                               │
│  └──────────────────┘                               │
│                                                      │
└─────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
    ┌──────────┐        ┌──────────┐
    │ OneDrive │        │ Google   │
    │ (API)    │        │ Calendar │
    └──────────┘        └──────────┘
```

---

## Checklist Pre-Production

- [ ] APP_KEY genere et configure
- [ ] PostgreSQL deploye et accessible
- [ ] Variables d'environnement configurees
- [ ] Domaine configure avec SSL
- [ ] Migrations executees
- [ ] Premier admin cree
- [ ] Health check fonctionnel
- [ ] Auto-deploy configure (optionnel)
- [ ] Backups PostgreSQL configures (dans Coolify)

---

## Support

- Documentation Coolify: https://coolify.io/docs/
- Documentation AdonisJS: https://docs.adonisjs.com/guides/getting-started/deployment
- Repository: https://github.com/Miraubolant/2BV_Portail
