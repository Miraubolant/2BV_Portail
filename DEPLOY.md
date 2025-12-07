# Guide de Deploiement - Coolify

## Prerequis

- Un serveur avec Coolify installe
- Un repository Git (GitHub, GitLab, etc.)
- Acces aux services externes (optionnel):
  - Microsoft Azure (OneDrive)
  - Google Cloud (Calendar)
  - Resend (emails)

---

## Etape 1: Preparation des Secrets

### 1.1 Generer une nouvelle APP_KEY

```bash
# En local
node ace generate:key
```

Copier la cle generee (format: `base64:xxxxx...`).

### 1.2 Generer un mot de passe de base de donnees fort

```bash
# Linux/Mac
openssl rand -base64 32

# Ou utiliser un generateur de mots de passe
```

### 1.3 Regenerer les secrets OAuth (si compromis)

- **Microsoft**: [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
- **Google**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

---

## Etape 2: Configuration dans Coolify

### 2.1 Creer un nouveau projet

1. Dans Coolify: **Projects** → **Add New**
2. Nommer le projet: `Portail Cabinet`
3. Creer un environnement: `Production`

### 2.2 Ajouter la ressource

1. **Add New Resource** → **Docker Compose**
2. Connecter votre repository Git
3. Selectionner la branche: `main`
4. **Docker Compose Location**: `docker-compose.prod.yml`

### 2.3 Configurer les variables d'environnement

Dans l'onglet **Environment Variables**, ajouter:

| Variable | Valeur | Secret? |
|----------|--------|---------|
| `APP_KEY` | `base64:votre_cle...` | Oui |
| `DB_PASSWORD` | `votre_mot_de_passe_fort` | Oui |
| `DB_USER` | `postgres` | Non |
| `DB_DATABASE` | `portail_cabinet` | Non |
| `RESEND_API_KEY` | `re_xxxxx` | Oui |
| `EMAIL_FROM` | `noreply@votredomaine.fr` | Non |
| `MICROSOFT_CLIENT_ID` | `xxxxx-xxxxx` | Non |
| `MICROSOFT_CLIENT_SECRET` | `xxxxx` | Oui |
| `MICROSOFT_TENANT_ID` | `xxxxx` | Non |
| `MICROSOFT_REDIRECT_URI` | `https://votredomaine.fr/api/admin/microsoft/callback` | Non |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | Non |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | Oui |
| `GOOGLE_REDIRECT_URI` | `https://votredomaine.fr/api/admin/google/callback` | Non |

### 2.4 Configurer le domaine

1. Onglet **Domains**
2. Ajouter votre domaine: `votredomaine.fr`
3. Activer **HTTPS** (Let's Encrypt automatique)

### 2.5 Configurer le Health Check

1. Onglet **Health Check**
2. **Path**: `/api/health`
3. **Port**: `3333`

---

## Etape 3: Deploiement

### 3.1 Premier deploiement

1. Cliquer sur **Deploy**
2. Attendre la fin du build (~3-5 minutes)
3. Verifier les logs

### 3.2 Post-deploiement

Executer les migrations (si pas automatique):

```bash
# Via Coolify Terminal ou SSH
docker exec -it portail_cabinet_app node ace migration:run --force
docker exec -it portail_cabinet_app node ace db:seed --force
```

### 3.3 Verifications

1. Acceder a `https://votredomaine.fr/api/health`
2. Se connecter a `https://votredomaine.fr/admin/login`
   - Email: `admin@cabinet.fr`
   - Password: `Admin123!`
3. **CHANGER LE MOT DE PASSE IMMEDIATEMENT**

---

## Etape 4: Post-installation

### 4.1 Securiser le compte admin

1. Se connecter en tant que super admin
2. Aller dans **Parametres** → **Mon compte**
3. Changer le mot de passe
4. Activer la 2FA (TOTP)

### 4.2 Configurer les integrations (optionnel)

#### Microsoft OneDrive
1. **Parametres** → **Integrations** → **Microsoft**
2. Cliquer sur **Connecter**
3. Autoriser l'application

#### Google Calendar
1. **Parametres** → **Integrations** → **Google**
2. Cliquer sur **Connecter**
3. Selectionner le calendrier a synchroniser

---

## Commandes Utiles

### Logs en temps reel
```bash
docker logs -f portail_cabinet_app
```

### Acces au shell du container
```bash
docker exec -it portail_cabinet_app sh
```

### Executer des commandes Ace
```bash
docker exec -it portail_cabinet_app node ace <commande>
```

### Rollback de migration
```bash
docker exec -it portail_cabinet_app node ace migration:rollback
```

### Backup de la base de donnees
```bash
docker exec portail_cabinet_db pg_dump -U postgres portail_cabinet > backup.sql
```

---

## Depannage

### Le container ne demarre pas

1. Verifier les logs: `docker logs portail_cabinet_app`
2. Verifier que `APP_KEY` est defini
3. Verifier que la DB est accessible

### Erreur de connexion a la base de donnees

1. Verifier que `postgres` est dans le meme reseau Docker
2. Verifier `DB_HOST=postgres` (nom du service, pas localhost)
3. Verifier le mot de passe

### Health check echoue

1. Verifier que l'app demarre: `docker logs portail_cabinet_app`
2. Verifier le port: `PORT=3333`
3. Verifier `HOST=0.0.0.0` (pas localhost)

### Erreur CORS

1. Verifier `APP_URL` dans les variables d'environnement
2. Doit correspondre exactement au domaine configure

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      COOLIFY                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Traefik (Reverse Proxy)               │  │
│  │                SSL/TLS automatique                 │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │            portail_cabinet_app                     │  │
│  │         AdonisJS + React (Port 3333)               │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │            portail_cabinet_db                      │  │
│  │              PostgreSQL 16                         │  │
│  │         (Reseau interne uniquement)                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Support

En cas de probleme:
1. Consulter les logs Coolify
2. Verifier la documentation AdonisJS
3. Ouvrir une issue sur le repository
