# Plan d'implémentation : « Carnet de bons » pour mes grands-parents

## Contexte
Cadeau pour les deux anniversaires de mes grands-parents (à livrer **demain**). C'est une page web contenant un **carnet de bons**, par exemple « Bon pour 1h de jardinage ». Ils l'utiliseront **sur ordinateur** (souris, écran large). Ils doivent pouvoir :
1. **Utiliser un bon** du carnet. Je reçois alors une notification par email.
2. **Demander un service sur mesure** grâce à un « bon joker » (texte libre). Je reçois aussi un email.
3. **Imprimer un bon** pour l'avoir en papier.

Priorités : **simple, lisible, chaleureux, zéro bug**. Mieux vaut moins de fonctionnalités, mais parfaites.

## Contraintes techniques (à respecter strictement)
- **Site statique**, sans build, sans framework : `index.html`, `style.css`, `app.js`, `config.js`. Pas de npm.
- Hébergement : **GitHub Pages**.
- Pas de backend et pas de compte utilisateur. **Ils ont deux PC** (un chacun), et l'état est synchronisé à la main par moi (voir « Synchronisation entre les deux PC »).
- L'état local est stocké en **`localStorage`**. Chaque accès doit être encapsulé dans un try/catch, et la page doit fonctionner même si le stockage est vide.
- Les notifications passent par **Web3Forms** (`POST https://api.web3forms.com/submit`, en JSON, avec un `access_key`). La clé s'obtient gratuitement en saisissant mon email sur web3forms.com.
- Une seule librairie externe autorisée : `canvas-confetti@1.9.3` via jsDelivr, pour l'animation.
- Langue : **français**, avec vouvoiement ou tutoiement selon ce que je mets dans la config. Ton affectueux.

## Fichier `config.js` (tout ce que je personnalise est ici)
```js
const CONFIG = {
  prenoms: ["Mamie", "Papy"],           // utilisé pour « Qui utilise ce bon ? »
  monPrenom: "…",
  messageAccueil: "Joyeux anniversaire ! …",
  web3formsKey: "XXXX",
  monTelephone: "06 …",                 // affiché en solution de secours si l'envoi échoue
  bons: [
    { id: "jardin",  emoji: "🌱", titre: "1h de jardinage",              detail: "Tonte, taille, désherbage…" },
    { id: "brico",   emoji: "🔨", titre: "1h de bricolage",              detail: "Une étagère, une ampoule, un meuble à monter" },
    { id: "techno",  emoji: "💻", titre: "1h d'aide informatique",       detail: "Téléphone, ordinateur, photos, WhatsApp…" },
    { id: "repas",   emoji: "🍲", titre: "Un repas cuisiné par moi",     detail: "" },
    { id: "jeux",    emoji: "🎲", titre: "Un après-midi jeux de société", detail: "" },
    { id: "balade",  emoji: "🚶", titre: "Une balade ensemble",          detail: "" },
    { id: "decheterie", categorie: "Quotidien",  titre: "Un aller-retour à la déchèterie",   detail: "Tout type de déchets, je m'en charge." },
    { id: "photos",  emoji: "📸", titre: "Trier / numériser vos photos", detail: "" },
    { id: "joker1",  emoji: "🃏", titre: "Bon joker",                    detail: "À vous de choisir !", joker: true },
    { id: "joker2",  emoji: "🃏", titre: "Bon joker",                    detail: "À vous de choisir !", joker: true },
  ],
  // Je remplis cette liste quand je reçois un email, puis je pousse sur GitHub.
  // Les deux PC voient ainsi les bons utilisés.
  dejaUtilises: {
    // jardin: { par: "Mamie", date: "2026-10-20", message: "Samedi matin" },
  },
};
```

## Synchronisation entre les deux PC
- Un bon est considéré comme **utilisé** s'il est présent dans `CONFIG.dejaUtilises` **OU** dans le localStorage du PC. C'est l'union des deux. Si le bon est présent des deux côtés, les infos de `CONFIG.dejaUtilises` sont prioritaires.
- Résultat : le PC qui vient d'utiliser un bon l'affiche immédiatement, et l'autre PC l'affiche après ma mise à jour de `config.js`, une fois la page rechargée.
- Pour éviter que GitHub Pages serve un vieux `config.js` en cache, charger le fichier avec un paramètre qui change à chaque visite : `<script>document.write('<script src="config.js?v=' + Date.now() + '"><\/script>')</script>`, ou une méthode équivalente qui garantit que `config.js` est chargé avant `app.js`.
- Si le même bon est utilisé sur les deux PC avant ma mise à jour, ce n'est pas grave. Je gère à la main, et aucun code n'est nécessaire.
- Le **stock est commun** : chaque bon de la liste est utilisable **une seule fois**, quel que soit le grand-parent qui l'utilise.
- Les **bons jokers** servent aux demandes sur mesure. La création de bons fait donc partie du stock limité, ce qui préserve la rareté du cadeau.

## Écran unique (pas de navigation)
1. **En-tête** : « Joyeux anniversaire Mamie & Papy », le message d'accueil, et le compteur « Il vous reste **7 bons** sur 10 ».
2. **Grille de bons** (2 à 3 colonnes sur ordinateur, 1 colonne sous 700px) :
   - Chaque carte ressemble à un vrai bon cadeau : bordure en pointillés façon ticket, gros emoji, titre en grand, détail, et bouton **« Utiliser ce bon »**.
   - Un bon utilisé reste visible mais grisé, avec un **tampon rouge « UTILISÉ »** incliné, la date et le prénom de la personne. Son bouton est remplacé par « 🖨️ Imprimer ».
3. **Pied de page** : « Un souci ? Appelez-moi : 06 … ».

## Parcours « Utiliser un bon » (fenêtre modale, 1 seul écran)
1. Titre : « Utiliser le bon : 1h de jardinage ? »
2. **Qui l'utilise ?** Deux gros boutons à cocher : Mamie / Papy.
3. **Un petit mot ? (facultatif)** : zone de texte, avec un exemple en placeholder (« Plutôt un samedi matin »).
   - Pour un **joker**, ce champ devient **obligatoire** et s'intitule « De quoi avez-vous besoin ? ».
4. Deux boutons : **« ✅ Oui, envoyer »** (gros, coloré) et « Annuler ».
5. Après l'envoi :
   - **Succès** : confettis, le tampon « UTILISÉ » s'affiche avec une animation (scale + rotation), puis le message « C'est envoyé ! <monPrenom> vous recontacte très vite 💛 ». Le bon est enregistré en localStorage avec `{ par, message, date }`.
   - **Échec** (pas d'internet, ou réponse ≠ success) : le bon **n'est pas consommé**. Afficher « Oups, ça n'a pas marché. Vérifiez internet ou appelez-moi au 06 … ». Laisser le bouton Réessayer.
   - Pendant l'envoi, désactiver le bouton et afficher « Envoi… » pour éviter les doubles clics.

Contenu de l'email Web3Forms :
`subject: "🎁 Bon utilisé : 1h de jardinage (Mamie)"`, puis le titre du bon, la personne, le message et la date.

## Impression
- Le bouton « Imprimer » est disponible sur chaque bon, qu'il soit utilisé ou non. Il ajoute une classe `printing` sur la carte, puis appelle `window.print()`.
- Une règle `@media print` masque tout sauf la carte ciblée, qui s'imprime en grand (format A5/A4, centrée). Le tampon reste visible.

## Accessibilité « grands-parents »
- Taille de base **20px**, titres de 28 à 40px, boutons d'au moins **56px** de haut, cibles larges.
- Contraste fort, pas de texte gris clair, pas d'icône sans libellé.
- Aucun survol nécessaire, aucun double-clic, aucun menu caché.
- Polices Google Fonts : une police manuscrite/chaleureuse pour les titres (par ex. *Caveat* ou *Pacifico*) et une police très lisible pour le texte (par ex. *Nunito*).
- Palette chaude : crème, rouge brique, vert sauge, doré.

## Outils pour moi (invisibles pour eux)
- `?test=1` dans l'URL : bandeau « MODE TEST ». Les envois indiquent `[TEST]` dans l'objet, et rien n'est enregistré dans localStorage.
- `?reset=1` : demande une confirmation, puis vide localStorage (en cas de clic par erreur).
- Clé localStorage unique et versionnée : `bons-v1`.

## Étapes d'implémentation (dans l'ordre)
1. Créer `config.js` avec des valeurs d'exemple, puis `index.html` pour la structure.
2. Écrire `style.css` : cartes-tickets, grille responsive, modale, tampon, `@media print`.
3. Écrire `app.js` : rendu depuis CONFIG, lecture et écriture localStorage, modale, envoi Web3Forms, gestion des erreurs, confettis, impression, `?test` / `?reset`.
4. Créer un `README.md` court : comment modifier `config.js`, obtenir la clé Web3Forms, publier sur GitHub Pages, et **comment marquer un bon utilisé dans `dejaUtilises` après avoir reçu un email** (avec un exemple copiable).
5. Tester localement (en ouvrant `index.html`) : envoi réussi en mode test, envoi avec le réseau coupé, impression, affichage à 1366px et à 400px.

## Hors périmètre (ne PAS faire)
Comptes ou connexion, base de données, synchronisation entre appareils, interface d'administration, date d'expiration des bons, notifications push, PWA.

## Checklist pour le jour J (pour moi, pas pour Claude Code)
- [ ] Récupérer la clé Web3Forms et faire un vrai envoi de test vers ma boîte (vérifier les spams).
- [ ] Publier sur GitHub Pages et vérifier l'URL.
- [ ] Sur **leurs deux** ordinateurs : ouvrir la page, l'ajouter aux favoris et **créer un raccourci sur le bureau** (« 🎁 Mes bons »).
- [ ] Après chaque email reçu : ajouter le bon dans `dejaUtilises` et pousser sur GitHub.
- [ ] Préparer une carte papier avec le lien (et un QR code) à glisser dans la carte d'anniversaire.
- [ ] Faire utiliser un premier bon devant moi, pour qu'ils voient les confettis.
