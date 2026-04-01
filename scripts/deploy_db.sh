#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# deploy_db.sh — dump local DB + model.pkl and restore into the k8s cluster
#
# Usage:
#   ./scripts/deploy_db.sh [namespace]
#
# Defaults:
#   namespace = movies-recommendation
#   local DB  = movies_db  (reads from backend/.env)
# ---------------------------------------------------------------------------

NAMESPACE="${1:-movies-recommendation}"
DUMP_FILE="/tmp/movies_db.dump"
MODEL_FILE="$(dirname "$0")/../backend/model.pkl"
BACKEND_DIR="$(dirname "$0")/../backend"

# ── 1. Read local DB connection from backend/.env ──────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: $BACKEND_DIR/.env not found"
  exit 1
fi

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d= -f2-)

# Parse postgresql://user:pass@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')

echo "→ Local DB: $DB_NAME on $DB_HOST:$DB_PORT (user: $DB_USER)"

# ── 2. Dump local database ─────────────────────────────────────────────────
echo "→ Dumping database to $DUMP_FILE ..."
PGPASSWORD="$DB_PASS" pg_dump \
  -U "$DB_USER" \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -d "$DB_NAME" \
  -F c \
  -f "$DUMP_FILE"

echo "   Dump size: $(du -sh "$DUMP_FILE" | cut -f1)"

# ── 3. Find postgres pod ───────────────────────────────────────────────────
POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
if [ -z "$POSTGRES_POD" ]; then
  echo "ERROR: No postgres pod found in namespace $NAMESPACE"
  exit 1
fi
echo "→ Postgres pod: $POSTGRES_POD"

# ── 4. Find backend pod ────────────────────────────────────────────────────
BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')
if [ -z "$BACKEND_POD" ]; then
  echo "ERROR: No backend pod found in namespace $NAMESPACE"
  exit 1
fi
echo "→ Backend pod: $BACKEND_POD"

# ── 5. Copy dump into postgres pod and restore ─────────────────────────────
echo "→ Copying dump to pod ..."
kubectl cp "$DUMP_FILE" "$NAMESPACE/$POSTGRES_POD:/tmp/movies_db.dump"

echo "→ Dropping and recreating database ..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U movies_user -d postgres -c "DROP DATABASE IF EXISTS movies_db;"
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  psql -U movies_user -d postgres -c "CREATE DATABASE movies_db;"

echo "→ Restoring dump ..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- \
  pg_restore -U movies_user -d movies_db /tmp/movies_db.dump

echo "→ Cleaning up dump from pod ..."
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- rm /tmp/movies_db.dump

# ── 6. Copy model.pkl into backend pod ────────────────────────────────────
if [ -f "$MODEL_FILE" ]; then
  echo "→ Copying model.pkl to backend pod ..."
  kubectl cp "$MODEL_FILE" "$NAMESPACE/$BACKEND_POD:/app/model.pkl"
  echo "   Model size: $(du -sh "$MODEL_FILE" | cut -f1)"
else
  echo "WARNING: model.pkl not found at $MODEL_FILE — search/similar won't work until retrained"
fi

# ── 7. Done ────────────────────────────────────────────────────────────────
echo ""
echo "✓ Database and model deployed successfully"
echo "  Namespace : $NAMESPACE"
echo "  Records   : $(kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- psql -U movies_user -d movies_db -t -c 'SELECT COUNT(*) FROM movies;' | tr -d ' ')" movies in DB
