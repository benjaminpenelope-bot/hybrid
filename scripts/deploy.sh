#!/usr/bin/env bash
#
# Déploiement de Hybrid sur Vercel.
#
# Pousse les variables d'environnement de .env.local vers le projet lié, puis
# déploie en production. Relançable : chaque variable est supprimée avant
# d'être réécrite, donc une deuxième exécution met simplement à jour.
#
# Usage :  ./scripts/deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"

if [ ! -f .env.local ]; then
  echo "Il manque .env.local. Rien n'a été poussé." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a && . ./.env.local && set +a

# Le domaine de production. Sert au lien magique et au retour OAuth : s'il est
# faux, les liens reçus par mail renvoient vers localhost.
SITE="${1:-https://hybrid-drab-theta.vercel.app}"

pousser() {
  local nom="$1" valeur="$2" env="$3"
  if [ -z "$valeur" ]; then
    echo "  · $nom ($env) — vide, ignorée"
    return
  fi
  npx vercel env rm "$nom" "$env" --yes >/dev/null 2>&1 || true
  printf '%s' "$valeur" | npx vercel env add "$nom" "$env" >/dev/null 2>&1
  echo "  ✓ $nom ($env)"
}

echo "Variables d'environnement :"
for env in production preview development; do
  pousser NEXT_PUBLIC_SUPABASE_URL      "${NEXT_PUBLIC_SUPABASE_URL:-}"      "$env"
  pousser NEXT_PUBLIC_SUPABASE_ANON_KEY "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" "$env"
  pousser SUPABASE_SERVICE_ROLE_KEY     "${SUPABASE_SERVICE_ROLE_KEY:-}"     "$env"
  pousser TOKEN_ENCRYPTION_KEY          "${TOKEN_ENCRYPTION_KEY:-}"          "$env"
  pousser STRAVA_VERIFY_TOKEN           "${STRAVA_VERIFY_TOKEN:-}"           "$env"
  pousser ANTHROPIC_API_KEY             "${ANTHROPIC_API_KEY:-}"             "$env"
  pousser STRAVA_CLIENT_ID              "${STRAVA_CLIENT_ID:-}"              "$env"
  pousser STRAVA_CLIENT_SECRET          "${STRAVA_CLIENT_SECRET:-}"          "$env"
done

pousser NEXT_PUBLIC_SITE_URL "$SITE" production

echo
echo "Déploiement en production…"
npx vercel --prod
