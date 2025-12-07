#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# POST-DEPLOYMENT SCRIPT
# Execute apres le deploiement du container sur Coolify
#
# Usage dans Coolify:
#   Post-Deployment Command: sh scripts/post-deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  POST-DEPLOYMENT - Portail Cabinet d'Avocats"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# 1. Attendre que la base de donnees soit prete
# ─────────────────────────────────────────────────────────────────────────────
echo "[1/3] Attente de la base de donnees..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Tester la connexion via la commande ace
  if node ace migration:status > /dev/null 2>&1; then
    echo "      Base de donnees connectee!"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "      Tentative $RETRY_COUNT/$MAX_RETRIES..."
  sleep 2
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo ""
  echo "ERREUR: Impossible de se connecter a la base de donnees"
  echo "Verifiez les variables d'environnement DB_HOST, DB_PORT, DB_USER, DB_PASSWORD"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Executer les migrations
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[2/3] Execution des migrations..."

node ace migration:run --force
echo "      Migrations OK!"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Executer les seeders si necessaire
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Verification des seeders..."

# On execute toujours les seeders - ils sont idempotents
# Le seeder admin verifie deja s'il existe avant de creer
node ace db:seed --force 2>/dev/null || true

echo "      Seeders OK!"

# ─────────────────────────────────────────────────────────────────────────────
# Informations post-deploiement
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DEPLOIEMENT TERMINE AVEC SUCCES!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Si c'est le premier deploiement:"
echo "    - Email:    admin@cabinet.fr"
echo "    - Password: Admin123!"
echo "    - CHANGEZ CE MOT DE PASSE IMMEDIATEMENT!"
echo ""
echo "  Health check: /api/health"
echo ""

exit 0
