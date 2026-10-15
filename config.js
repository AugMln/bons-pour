// ============================================================
//  Personnalisation du carnet : tout se règle ici.
// ============================================================
const CONFIG = {
  // ⚠️ À personnaliser
  prenoms: ["Pady", "Mady"],
  monPrenom: "Augustin",
  messageAccueil:
    "Pour vos anniversaires, je vous offre un carnet de bons.\n" +
    "Choisissez en un quand vous voulez, je m'occupe du reste !",

  // Facultatif : une photo de vous (mise en noir et blanc automatiquement), par ex. "photos/accueil.jpg".
  photoAccueil: "photos/accueil.jpeg",

  // Clé gratuite à obtenir sur https://web3forms.com (en saisissant votre email).
  web3formsKey: "8147c4d2-e494-47a8-a5b6-0fdfad2f356d",

  // Nombre d'exemplaires de chaque bon (modifiable bon par bon avec `quantite: 5`).
  quantiteParDefaut: 3,

  // L'id doit être unique et ne plus changer. `categorie` s'affiche en petites capitales sur le bon.
  bons: [
    // Bon mystère : caché sous une couche à gratter. ⚠️ Choisissez votre surprise !
    { id: "mystere",    categorie: "Surprise",   titre: "Un resto tous les trois",           detail: "Vous choisissez l'endroit, c'est moi qui invite.", quantite: 1, mystere: true },
    { id: "jardin",     categorie: "Extérieur",  titre: "1h de jardinage",                   detail: "Tonte, taille, désherbage." },
    { id: "brico",      categorie: "Maison",     titre: "1h de bricolage",                   detail: "Une étagère, un appareil, une porte à monter." },
    { id: "techno",     categorie: "Numérique",  titre: "1h d'aide informatique",            detail: "Téléphone, ordinateur, photos, WhatsApp." },
    { id: "repas",      categorie: "Cuisine",    titre: "Un repas cuisiné par moi",          detail: "Vous mettez les pieds sous la table." },
    { id: "jeux",       categorie: "Loisirs",    titre: "Un après-midi jeux de société",     detail: "Barbu, Scoppa, ou ce que vous voulez." },
    { id: "balade",     categorie: "Promenade",  titre: "Une balade à vélo",                 detail: "Où vous voulez, au rythme que vous voulez." },
    { id: "decheterie", categorie: "Quotidien",  titre: "Un aller-retour à la déchèterie",   detail: "Tout type de déchets, je m'en charge." },
    { id: "joker",      categorie: "Sur mesure", titre: "Ce que vous voulez",                detail: "Demandez-moi ce dont vous avez besoin.", joker: true },
  ],

  // Quand je reçois un email, je colle ici la ligne « À copier » qu'il contient,
  // puis je pousse sur GitHub : l'utilisation apparaît sur les deux ordinateurs.
  // Ensuite, sur la même ligne :
  //   prevu: "2026-10-25"          → « Prévu le samedi 25 octobre » (puis « Fait le… » une fois passé)
  //   photo: "photos/jardin.jpg"   → la photo apparaît dans l'album « Nos moments »
  //   legende: "La haie est enfin taillée !"  (facultatif, sous la photo)
  dejaUtilises: [
    // { uid: "lz8k2a9f", bon: "jardin", date: "2026-10-20", message: "Plutôt un samedi matin", prevu: "2026-10-25", photo: "photos/jardin.jpg" },
  ],
};
