# Carnet de bons — cadeau pour mes grands-parents

Page web statique : un carnet de « bons pour » (jardinage, bricolage, aide informatique…) que mes grands-parents utilisent depuis **leurs deux PC**. Le plan complet est dans [PLAN.md](PLAN.md).

## Fichiers
- `config.js` — **toute** la personnalisation (prénoms, message, liste des bons, clé Web3Forms, téléphone, `dejaUtilises`). Aucun texte personnel en dur ailleurs.
- `app.js` — logique : rendu, modale, envoi Web3Forms, localStorage, confettis, impression.
- `style.css` — styles écran + `@media print`.
- `index.html` — structure ; charge `config.js` puis `app.js` avec un paramètre anti-cache.

## Règles
- **Aucun build, aucun npm, aucun framework.** HTML/CSS/JS vanilla. Seule dépendance : `canvas-confetti@1.9.3` (jsDelivr), facultative (la page marche sans).
- Interface en **français**, on **vouvoie** les grands-parents (ils sont deux), ton affectueux.
- Direction artistique **« vintage chic, pellicule »** (affiche de musée / magazine argentique) : papier crème, encre noire, un seul accent rouge brique (`--rouille`), grain de pellicule global, filets fins, pas d'arrondis ni d'ombres. Titres en *Inter Tight* 800 minuscules serrés, notes en *Instrument Serif* italique, métadonnées en petites capitales espacées. Photos en noir et blanc. **Aucun emoji** dans ce qui est affiché. Toute nouvelle interface doit suivre ce style.
- Accessibilité « grands-parents » : base 20px, boutons ≥ 56px de haut, fort contraste, pas d'icône sans texte, rien qui dépende du survol, pas de fermeture accidentelle de la modale (pas de clic hors cadre).
- Chaque type de bon existe en `quantite` exemplaires (défaut `CONFIG.quantiteParDefaut` = 3). Pas de choix « qui utilise ».
- Une utilisation = `{ uid, bon, date, message }`. État = union, dédoublonnée par `uid`, de `CONFIG.dejaUtilises` (tableau, synchronisé par moi via GitHub) et du localStorage `bons-v2` (local au PC). L'email contient la ligne exacte à coller dans `dejaUtilises`. Tout accès localStorage est dans un try/catch.
- Un envoi qui échoue ne consomme **jamais** le bon.
- Champs que j'ajoute ensuite sur une utilisation : `prevu` (statut « Prévu le » puis « Fait le » + encadré « Prochain rendez-vous »), `photo` / `legende` (album « Nos moments », images dans `photos/`).
- Un bon `mystere: true` est caché sous une couche à gratter (canvas, gratter au simple survol + bouton de secours). Découverte mémorisée dans le localStorage `bons-mystere-v1`.
- Garder ça simple : pas de comptes, pas de base de données, pas de PWA (voir « Hors périmètre » dans PLAN.md).

## Tester
- Ouvrir `index.html` dans un navigateur (double-clic suffit).
- `?test=1` : bandeau MODE TEST, objet des mails préfixé `[TEST]`, rien n'est enregistré. Sans clé Web3Forms, l'envoi est simulé.
- `?reset=1` : vide le localStorage de ce PC (après confirmation).

## Déploiement
GitHub Pages (branche `main`, dossier racine), site : https://augmln.github.io/bons-pour/. Après chaque email reçu, coller sa ligne « À copier » dans `dejaUtilises` de `config.js`, puis `git pull` et `git push`.
