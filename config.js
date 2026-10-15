// ============================================================
//  Personnalisation du carnet : tout se règle ici.
// ============================================================
const CONFIG = {
  // ⚠️ À personnaliser
  prenoms: ["Pady", "Mady"],
  monPrenom: "Augustin",
  messageAccueil:
    "Pour vos anniversaires, je vous offre un peu de mon temps.\n" +
    "Choisissez un bon quand vous voulez, je m'occupe du reste !",

  // Clé gratuite à obtenir sur https://web3forms.com (en saisissant votre email).
  web3formsKey: "8147c4d2-e494-47a8-a5b6-0fdfad2f356d",

  // Affiché si l'envoi échoue.
  monTelephone: "07 83 70 82 46",

  // Nombre d'exemplaires de chaque bon (modifiable bon par bon avec `quantite: 5`).
  quantiteParDefaut: 3,

  // L'id doit être unique et ne plus changer. `couleur` (facultatif) = fond de la tuile emoji.
  bons: [
    // Bon mystère : caché sous une couche à gratter. ⚠️ Choisissez votre surprise !
    { id: "mystere", emoji: "🍽️", titre: "Un resto tous les trois",       detail: "Vous choisissez l'endroit, c'est moi qui invite !", quantite: 1, mystere: true },
    { id: "jardin", emoji: "🌱", titre: "1h de jardinage",               detail: "Tonte, taille, désherbage…" },
    { id: "brico",   emoji: "🔨", titre: "1h de bricolage",               detail: "Une étagère, une ampoule, un meuble à monter" },
    { id: "techno",  emoji: "💻", titre: "1h d'aide informatique",        detail: "Téléphone, ordinateur, photos, WhatsApp…" },
    { id: "repas",   emoji: "🍲", titre: "Un repas cuisiné par moi",      detail: "Vous mettez les pieds sous la table" },
    { id: "jeux",    emoji: "🎲", titre: "Un après-midi jeux de société", detail: "Belote, Scrabble, ou ce que vous voulez" },
    { id: "balade",  emoji: "🚶", titre: "Une balade ensemble",           detail: "Où vous voulez, au rythme que vous voulez" },
    { id: "courses", emoji: "🛒", titre: "Les grosses courses",           detail: "Je porte, vous choisissez" },
    { id: "photos",  emoji: "📸", titre: "Trier et numériser vos photos", detail: "Pour ne plus jamais les perdre" },
    { id: "joker",   emoji: "🃏", titre: "Ce que vous voulez !",          detail: "Demandez-moi ce dont vous avez besoin", joker: true },
  ],

  // Quand je reçois un email, je colle ici la ligne « À copier » qu'il contient,
  // puis je pousse sur GitHub : l'utilisation apparaît sur les deux ordinateurs.
  // Ensuite, sur la même ligne :
  //   prevu: "2026-10-25"          → « 📅 Prévu le samedi 25 octobre » (puis « ✓ Fait le… » une fois passé)
  //   photo: "photos/jardin.jpg"   → la photo apparaît dans l'album « Nos moments »
  //   legende: "La haie est enfin taillée !"  (facultatif, sous la photo)
  dejaUtilises: [
    // { uid: "lz8k2a9f", bon: "jardin", date: "2026-10-20", message: "Plutôt un samedi matin", prevu: "2026-10-25", photo: "photos/jardin.jpg" },
  ],
};
