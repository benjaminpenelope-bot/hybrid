#!/usr/bin/env python3
"""
Pose le mot de passe d'un compte Polytrain, sans passer par un e-mail.

Sert à contourner la limite d'envoi du SMTP mutualisé de Supabase, qui
plafonne les liens magiques à quelques-uns par heure. Le mot de passe permet
ensuite de se connecter depuis n'importe quel navigateur, y compris la web app
installée sur l'écran d'accueil — ce que les liens PKCE ne permettent pas.

Utilise la clé service, qui reste sur cette machine. Le mot de passe est saisi
sans écho et n'est ni affiché, ni journalisé, ni écrit sur le disque.

Usage :  python3 scripts/mot-de-passe.py [adresse]
"""

# Le python3 de macOS est en 3.9 : sans ceci, les annotations « dict | None »
# sont évaluées à l'exécution et le script refuse de démarrer.
from __future__ import annotations

import getpass
import json
import os
import sys
import urllib.error
import urllib.request

MIN = 8


def env(chemin: str) -> dict[str, str]:
    """Lit .env.local sans dépendance externe."""
    valeurs: dict[str, str] = {}
    with open(chemin, encoding="utf8") as f:
        for ligne in f:
            ligne = ligne.strip()
            if ligne and not ligne.startswith("#") and "=" in ligne:
                cle, valeur = ligne.split("=", 1)
                valeurs[cle.strip()] = valeur.strip()
    return valeurs


def appel(url: str, cle: str, methode: str = "GET", corps: dict | None = None):
    data = json.dumps(corps).encode() if corps is not None else None
    requete = urllib.request.Request(url, data=data, method=methode)
    requete.add_header("apikey", cle)
    requete.add_header("Authorization", f"Bearer {cle}")
    requete.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(requete) as reponse:
            return json.loads(reponse.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:200]
        # Le corps d'erreur peut refléter la requête : on ne montre que le début.
        sys.exit(f"Supabase a répondu {e.code}. {detail}")


def main() -> None:
    racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fichier = os.path.join(racine, ".env.local")
    if not os.path.exists(fichier):
        sys.exit("Il manque .env.local.")

    conf = env(fichier)
    base = conf.get("NEXT_PUBLIC_SUPABASE_URL")
    cle = conf.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not cle:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante.")

    adresse = sys.argv[1] if len(sys.argv) > 1 else input("Adresse e-mail : ").strip()

    comptes = appel(f"{base}/auth/v1/admin/users?per_page=200", cle).get("users", [])
    compte = next((u for u in comptes if u.get("email", "").lower() == adresse.lower()), None)

    if compte is None:
        connus = sorted(u.get("email", "?") for u in comptes)
        sys.exit(
            f"Aucun compte pour {adresse}.\n"
            f"Comptes existants : {', '.join(connus) if connus else 'aucun'}"
        )

    print(f"Compte trouvé : {compte['email']} (créé le {compte.get('created_at', '?')[:10]})")

    mdp = getpass.getpass(f"Nouveau mot de passe ({MIN} caractères minimum) : ")
    if len(mdp) < MIN:
        sys.exit(f"Trop court : {MIN} caractères minimum.")
    if mdp != getpass.getpass("Confirmation : "):
        sys.exit("Les deux saisies ne correspondent pas.")

    appel(
        f"{base}/auth/v1/admin/users/{compte['id']}",
        cle,
        methode="PUT",
        corps={"password": mdp},
    )

    print("\nMot de passe enregistré.")
    print("Connecte-toi avec cette adresse et ce mot de passe, depuis n'importe quel navigateur.")


if __name__ == "__main__":
    main()
