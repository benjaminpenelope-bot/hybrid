# Raccourci iOS « pas du jour »

`hybrid-pas.plist` est la source, lisible et modifiable. Le fichier servi aux
athlètes est `public/raccourci/hybrid-pas.shortcut`, qui en est la version
**signée**.

La signature n'est pas une formalité : depuis iOS 15, un fichier de raccourci
non signé n'est pas reconnu par le système. Il s'ouvre alors comme un document
quelconque — Safari l'avait même enregistré en `.html`, faute de mieux — et
l'app Raccourcis n'est jamais proposée.

Pour resigner après avoir modifié la source, sur un Mac :

```sh
shortcuts sign --mode anyone \
  --input outils/raccourci/hybrid-pas.plist \
  --output public/raccourci/hybrid-pas.shortcut
```

`--mode anyone` produit un raccourci que n'importe quel appareil peut ouvrir.
Le mode par défaut, `people-who-know-me`, le réserverait aux contacts du
compte qui a signé.

## L'action Santé, absente exprès

Le raccourci lit le nombre de pas par une action **Demander une entrée**, que
l'athlète remplace une fois par l'action Santé.

Ce n'est pas un oubli : je n'ai pas pu déterminer l'identifiant de l'action
Santé sans appareil pour l'essayer. macOS ne peut pas servir de banc de test —
Santé n'existe pas sur Mac, donc toute action de ce type y est « inconnue »,
que son identifiant soit juste ou faux. Et une seule action inconnue empêche
l'import du fichier entier, ce qui rend l'erreur plus coûteuse que l'absence.

Le jour où l'identifiant est connu — en exportant depuis un iPhone un
raccourci qui contient cette action, et en lisant son plist — il suffira de
remplacer l'action `is.workflow.actions.ask` par la vraie, puis de resigner.

Le fichier signé ne contient aucun jeton : il le demande à l'import. Il est
servi publiquement, donc un jeton dedans donnerait à un inconnu de quoi écrire
dans le compte de quelqu'un.
