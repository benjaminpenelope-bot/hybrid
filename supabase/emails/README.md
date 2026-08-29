# Gabarits d'e-mails

Ces fichiers se collent dans Supabase : **Authentication → Emails**, un onglet
par gabarit. Ils ne sont pas lus par l'application — Supabase les stocke de son
côté. On les garde ici pour qu'ils soient versionnés, relus et retrouvables :
un gabarit qui ne vit que dans une interface web se perd au premier changement
de compte.

| Fichier | Onglet Supabase |
|---|---|
| `lien-magique.html` | Magic Link |
| `confirmation.html` | Confirm signup |
| `mot-de-passe.html` | Reset Password |
| `changement-adresse.html` | Change Email Address |

## Règles suivies

**Pas d'image, pas de police distante.** Une image bloquée par défaut, c'est un
e-mail qui arrive vide. Le logo est rendu en texte.

**Styles en ligne uniquement.** Gmail supprime les balises `<style>` dans
certains contextes ; une mise en forme qui vit dans un attribut `style` survit
partout.

**Fond clair.** Un e-mail sombre se retourne mal dans les clients qui forcent
leur propre thème, et le contraste devient illisible. L'application est sombre,
les e-mails ne le sont pas : ce sont deux surfaces différentes.

**Le lien est aussi affiché en clair.** Certains clients cassent les boutons ;
une URL recopiable évite de bloquer quelqu'un pour une raison de rendu.

**Une seule action par e-mail.** Rien à choisir, rien à lire en diagonale.
